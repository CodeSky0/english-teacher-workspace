"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
  enName?: string | null;
  seatNo?: number | null;
  studentNo?: string | null;
};

type Phase = "idle" | "warp" | "collapse" | "reveal";

interface NebulaRollCallProps {
  picked: Student | null;
  rolling: boolean;
  className?: string;
}

type Star = { x: number; y: number; z: number; size: number; tw: number; color: string };
type Charge = { angle: number; radius: number; speed: number; size: number; color: string };
type Wave = { r0: number; r1: number; life: number; maxLife: number; width: number; color: string };
type Burst = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; tw: number };
type TextDust = {
  tx: number;
  ty: number;
  sx: number;
  sy: number;
  delay: number;
  dur: number;
  size: number;
  seed: number;
  swirl: number;
  color: string;
};

const TAU = Math.PI * 2;
const COLLAPSE_MS = 480;
const SERIF_FALLBACK = '"Noto Serif SC", "Songti SC", Georgia, serif';
const SANS_FALLBACK = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
const PALETTE = ["255, 226, 206", "168, 210, 240", "236, 168, 186", "176, 222, 198"] as const;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

export function NebulaRollCall({ picked, rolling, className }: NebulaRollCallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pickedRef = useRef<Student | null>(picked);
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");

  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (rolling) {
      setPhase("warp");
      return;
    }
    if (picked) {
      setPhase("collapse");
      const timer = setTimeout(() => setPhase("reveal"), COLLAPSE_MS);
      return () => clearTimeout(timer);
    }
    setPhase("idle");
  }, [rolling, picked]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = context;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let W = 0;
    let H = 0;
    let DPR = 1;
    let cx = 0;
    let cy = 0;
    let baseR = 60;
    let maxR = 400;
    let raf: number | null = null;
    let lastTs = performance.now();
    let lastDt = 16;
    let warpFlow = 0;
    let warpAmount = 0;
    let revealAt = 0;
    let flashAt = -1e9;
    let lastPhase: Phase = "idle";
    let phaseStart = performance.now();
    let bgGradient: CanvasGradient | null = null;
    let vignette: CanvasGradient | null = null;
    let pointerX = 0;
    let pointerY = 0;

    const fonts = { serif: SERIF_FALLBACK, sans: SANS_FALLBACK };

    const stars: Star[] = [];
    const charges: Charge[] = [];
    const bursts: Burst[] = [];
    const sparks: Spark[] = [];
    const waves: Wave[] = [];
    const dust: TextDust[] = [];

    const nameInfo = {
      text: "",
      fontSize: 0,
      width: 0,
      baseY: 0,
      meta: "",
    };

    const nebula = [
      { x: 0.18, y: 0.32, r: 0.55, color: "70, 104, 170", a: 0.17, sx: 0.000021, sy: 0.000034 },
      { x: 0.78, y: 0.22, r: 0.48, color: "150, 70, 118", a: 0.13, sx: -0.000017, sy: 0.000026 },
      { x: 0.62, y: 0.7, r: 0.5, color: "40, 122, 112", a: 0.11, sx: 0.000013, sy: -0.000019 },
      { x: 0.28, y: 0.78, r: 0.46, color: "176, 82, 104", a: 0.09, sx: -0.000011, sy: -0.000024 },
    ];

    function readFonts() {
      const style = getComputedStyle(canvas);
      const serif = style.getPropertyValue("--font-serif").trim().replace(/\s+/g, " ");
      const sans = style.getPropertyValue("--font-sans").trim().replace(/\s+/g, " ");
      fonts.serif = serif || SERIF_FALLBACK;
      fonts.sans = sans || SANS_FALLBACK;
    }

    function initStars() {
      stars.length = 0;
      const count = reduced ? 110 : 220;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: rand(0, W),
          y: rand(0, H),
          z: rand(0.15, 1),
          size: rand(0.5, 1.9),
          tw: rand(0.3, 2.4),
          color: pick(PALETTE),
        });
      }
      charges.length = 0;
      const chargeCount = reduced ? 50 : 110;
      for (let i = 0; i < chargeCount; i++) {
        charges.push({
          angle: rand(0, TAU),
          radius: rand(baseR * 0.9, maxR * 0.6),
          speed: rand(0.5, 1.7),
          size: rand(0.7, 2.2),
          color: pick(PALETTE),
        });
      }
      bursts.length = 0;
      sparks.length = 0;
      waves.length = 0;
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cx = W / 2;
      cy = H * 0.46;
      baseR = Math.max(38, Math.min(W, H) * 0.15);
      maxR = Math.hypot(W, H) * 0.62;

      bgGradient = ctx.createLinearGradient(0, 0, 0, H);
      bgGradient.addColorStop(0, "#0b0e1d");
      bgGradient.addColorStop(0.48, "#080a15");
      bgGradient.addColorStop(0.82, "#05060e");
      bgGradient.addColorStop(1, "#03040a");

      vignette = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.18, cx, cy, Math.max(W, H) * 0.78);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.65, "rgba(0, 0, 0, 0.18)");
      vignette.addColorStop(1, "rgba(0, 0, 0, 0.62)");

      readFonts();
      initStars();
      if (phaseRef.current === "reveal") {
        buildNameDust(1200);
      }
    }

    function makeBurst(x: number, y: number, count: number, speed: number) {
      for (let i = 0; i < count; i++) {
        const angle = rand(0, TAU);
        const velocity = rand(speed * 0.25, speed);
        bursts.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity * 0.85,
          life: rand(-80, 60),
          maxLife: rand(650, 1500),
          size: rand(0.8, 2.8),
          color: pick(PALETTE),
        });
      }
    }

    function makeWave(delay: number, color: string, width: number) {
      waves.push({
        r0: baseR * 0.4,
        r1: maxR * rand(0.75, 1.05),
        life: -delay,
        maxLife: rand(720, 1100),
        width,
        color,
      });
    }

    function enterCollapse(now: number) {
      flashAt = now;
      makeBurst(cx, cy, reduced ? 140 : 320, 660);
      makeWave(0, "255, 220, 190", 3.6);
      makeWave(100, "168, 210, 240", 2.4);
      makeWave(210, "240, 168, 186", 1.8);
      makeWave(320, "176, 222, 198", 1.1);
    }

    function enterReveal(now: number) {
      revealAt = now;
      buildNameDust(0);
      makeWave(0, "255, 226, 204", 2.8);
      makeWave(150, "168, 210, 240", 2.0);
      makeWave(290, "236, 168, 186", 1.4);
      for (let i = 0; i < 40; i++) {
        const angle = rand(0, TAU);
        const radius = rand(baseR, Math.min(W, H) * 0.42);
        sparks.push({
          x: cx + Math.cos(angle) * radius,
          y: nameInfo.baseY + Math.sin(angle) * radius * 0.45,
          vx: rand(-0.02, 0.02),
          vy: rand(-0.055, -0.012),
          life: rand(0, 900),
          maxLife: rand(2200, 4800),
          size: rand(0.7, 2),
          color: pick(PALETTE),
          tw: rand(0, TAU),
        });
      }
    }

    function buildNameDust(timeOffset: number) {
      const student = pickedRef.current;
      dust.length = 0;
      if (!student) return;

      const text = student.name.trim();
      if (!text) return;

      const off = document.createElement("canvas");
      off.width = Math.max(2, Math.floor(W));
      off.height = Math.max(2, Math.floor(H));
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;

      let size = Math.min(H * 0.27, W * 0.2, 136);
      size = Math.max(26, size);
      const fontAt = (value: number) => `700 ${value}px ${fonts.serif}`;
      octx.font = fontAt(size);
      const measured = octx.measureText(text);
      const maxWidth = W * 0.74;
      if (measured.width > maxWidth) size *= maxWidth / measured.width;
      size = Math.max(22, Math.min(size, H * 0.3));

      const baseY = H * 0.45;
      octx.clearRect(0, 0, off.width, off.height);
      octx.font = fontAt(size);
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillStyle = "#fff";
      octx.fillText(text, W / 2, baseY);

      const width = octx.measureText(text).width;
      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const gap = Math.max(2, Math.round(size / 34));
      const points: number[] = [];
      for (let y = 0; y < off.height; y += gap) {
        for (let x = 0; x < off.width; x += gap) {
          if (data[(y * off.width + x) * 4 + 3] > 140) points.push(x, y);
        }
      }

      const total = points.length / 2;
      const limit = reduced
        ? Math.min(1400, Math.max(700, Math.round((W * H) / 620)))
        : Math.min(3600, Math.max(1200, Math.round((W * H) / 300)));
      const step = Math.max(1, total / Math.max(1, limit));
      const minDim = Math.min(W, H);
      const startAngle = rand(0, TAU);
      const textLeft = W / 2 - width / 2;

      for (let i = 0; i < total; i += step) {
        const index = Math.floor(i) * 2;
        const tx = points[index] + rand(-gap, gap) * 0.35;
        const ty = points[index + 1] + rand(-gap, gap) * 0.35;
        const angle = startAngle + (index / Math.max(1, points.length)) * TAU * 2.4;
        const radius = rand(minDim * 0.02, minDim * 0.24);
        const rel = (tx - W / 2) / Math.max(1, width / 2);
        const color = rel < -0.32 ? PALETTE[1] : rel > 0.32 ? PALETTE[2] : PALETTE[(index / 2) % 2 === 0 ? 0 : 3];
        const progress = clamp((tx - textLeft) / Math.max(1, width), 0, 1);
        dust.push({
          tx,
          ty,
          sx: cx + Math.cos(angle) * radius,
          sy: cy + Math.sin(angle) * radius * 0.72 + (baseY - cy) * 0.4,
          delay: progress * 240 + rand(0, 170),
          dur: rand(620, 1080),
          size: rand(0.7, 1.8) * (0.7 + size / 150),
          seed: rand(0, TAU),
          swirl: rand(-1, 1) * rand(22, 78),
          color,
        });
      }

      nameInfo.text = text;
      nameInfo.fontSize = size;
      nameInfo.width = width;
      nameInfo.baseY = baseY;
      nameInfo.meta = [student.enName, student.seatNo != null ? `${student.seatNo} 号` : "", student.studentNo]
        .filter(Boolean)
        .join("   ·   ");
      revealAt = performance.now() - timeOffset;
    }

    function drawBackground(time: number) {
      if (bgGradient) {
        ctx.fillStyle = bgGradient;
      } else {
        ctx.fillStyle = "#05060f";
      }
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const blob of nebula) {
        const x = (blob.x + Math.sin(time * blob.sx + blob.x * 6) * 0.03) * W + pointerX * 6;
        const y = (blob.y + Math.cos(time * blob.sy + blob.y * 8) * 0.04) * H + pointerY * 6;
        const radius = Math.min(W, H) * blob.r;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(${blob.color}, ${blob.a})`);
        grad.addColorStop(0.55, `rgba(${blob.color}, ${blob.a * 0.32})`);
        grad.addColorStop(1, `rgba(${blob.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.restore();
    }

    function drawAurora(time: number, intensity: number) {
      const bands = [
        { base: H * 0.2, amp: H * 0.055, freq: 2.1, speed: 0.00019, width: H * 0.15, color: "120, 205, 180", alpha: 0.11 },
        { base: H * 0.31, amp: H * 0.075, freq: 1.5, speed: -0.00014, width: H * 0.13, color: "122, 158, 226", alpha: 0.1 },
        { base: H * 0.11, amp: H * 0.04, freq: 3, speed: 0.00025, width: H * 0.09, color: "236, 140, 168", alpha: 0.07 },
      ];

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const band of bands) {
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        const a = band.alpha * intensity;
        grad.addColorStop(0, `rgba(${band.color}, 0)`);
        grad.addColorStop(0.22, `rgba(${band.color}, ${a})`);
        grad.addColorStop(0.58, `rgba(${band.color}, ${a * 0.72})`);
        grad.addColorStop(1, `rgba(${band.color}, 0)`);
        ctx.fillStyle = grad;

        const steps = 44;
        for (let pass = 0; pass < 2; pass++) {
          const spread = pass === 0 ? 1.9 : 1;
          const fade = pass === 0 ? 0.42 : 1;
          ctx.globalAlpha = fade;
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const x = (i / steps) * W;
            const phase = (x / W) * band.freq * TAU + time * band.speed;
            const y = band.base + Math.sin(phase) * band.amp + Math.sin(phase * 2.3 + 1.4) * band.amp * 0.3;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          for (let i = steps; i >= 0; i--) {
            const x = (i / steps) * W;
            const phase = (x / W) * band.freq * TAU + time * band.speed;
            const ripple = 0.55 + 0.45 * Math.sin(phase * 1.7 + time * 0.0006);
            const y =
              band.base +
              Math.sin(phase) * band.amp +
              Math.sin(phase * 2.3 + 1.4) * band.amp * 0.3 +
              band.width * spread * ripple;
            ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawStars(time: number, warp: number) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const idleAlpha = 1 - warp;

      if (idleAlpha > 0.02) {
        for (const star of stars) {
          const twinkle = 0.5 + 0.5 * Math.sin(time * 0.0012 * star.tw + star.tw * 7);
          const alpha = idleAlpha * (0.16 + 0.7 * Math.pow(star.z, 1.5)) * (0.5 + 0.5 * twinkle);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgb(${star.color})`;
          const size = star.size * (0.65 + star.z * 0.9);
          ctx.fillRect(star.x + pointerX * star.z * 9, star.y + pointerY * star.z * 9, size, size);
        }
      }

      if (warp > 0.02) {
        warpFlow += lastDt * warp * 0.52;
        for (const star of stars) {
          const dx = star.x - cx;
          const dy = star.y - cy;
          const base = Math.hypot(dx, dy) || 1;
          const angle = Math.atan2(dy, dx);
          const travel = (base + warpFlow * (0.35 + star.z * 1.7)) % maxR;
          const tail = (10 + star.z * 58) * warp + 4;
          const from = Math.max(2, travel - tail);
          const edge = 1 - clamp((travel - maxR * 0.62) / (maxR * 0.38), 0, 1) * 0.65;
          ctx.globalAlpha = warp * (0.1 + star.z * 0.42) * edge;
          ctx.strokeStyle = `rgb(${star.color})`;
          ctx.lineWidth = 0.6 + star.z * 1.5;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * from, cy + Math.sin(angle) * from);
          ctx.lineTo(cx + Math.cos(angle) * travel, cy + Math.sin(angle) * travel);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawVortex(time: number, energy: number) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of charges) {
        p.angle += p.speed * 0.0011 * (0.5 + energy * 2.6) * lastDt;
        p.radius -= (0.014 + energy * 0.075) * lastDt;
        if (p.radius < 8) {
          p.radius = rand(baseR, maxR * 0.65);
          p.angle = rand(0, TAU);
        }
        const trail = 0.14 * (0.5 + energy);
        const x = cx + Math.cos(p.angle) * p.radius;
        const y = cy + Math.sin(p.angle) * p.radius * 0.62;
        const px = cx + Math.cos(p.angle - trail) * p.radius;
        const py = cy + Math.sin(p.angle - trail) * p.radius * 0.62;
        const alpha = clamp((1 - p.radius / maxR) * 0.85, 0, 0.9) * (0.35 + energy * 0.65);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgb(${p.color})`;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawCore(time: number, energy: number, collapse: number) {
      const pulse = 1 + Math.sin(time * 0.0028) * 0.045 + energy * Math.sin(time * 0.009) * 0.03;
      const radius = baseR * pulse * (1 - easeInCubic(collapse) * 0.92);
      const glowRadius = radius * 4.4;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      glow.addColorStop(0, `rgba(255, 238, 210, ${0.1 + energy * 0.2})`);
      glow.addColorStop(0.24, `rgba(244, 172, 158, ${0.09 + energy * 0.13})`);
      glow.addColorStop(0.55, `rgba(140, 178, 240, ${0.04 + energy * 0.06})`);
      glow.addColorStop(1, "rgba(74, 84, 150, 0)");

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, TAU);
      ctx.fill();

      const tilt = 0.28;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt + Math.sin(time * 0.0004) * 0.08);
      ctx.scale(1, 0.34);
      ctx.strokeStyle = `rgba(244, 190, 176, ${0.2 + energy * 0.2})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.42, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(150, 206, 246, ${0.16 + energy * 0.18})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.74, 0, TAU);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-tilt - Math.sin(time * 0.0005) * 0.06);
      ctx.scale(1, 0.42);
      ctx.strokeStyle = `rgba(186, 168, 236, ${0.13 + energy * 0.16})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, TAU);
      ctx.stroke();
      ctx.restore();

      for (let i = 0; i < 7; i++) {
        const start = time * (0.0006 + i * 0.00004) + (i / 7) * TAU;
        const sweep = 0.34 + (i % 3) * 0.18;
        ctx.strokeStyle = i % 2 === 0 ? `rgba(252, 214, 176, ${0.55 + energy * 0.3})` : `rgba(160, 208, 246, ${0.45 + energy * 0.3})`;
        ctx.lineWidth = i % 2 === 0 ? 1.7 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, start, start + sweep);
        ctx.stroke();
      }

      if (collapse < 1) {
        for (let i = 0; i < 5; i++) {
          const angle = time * 0.0011 + (i / 5) * TAU;
          const orbitX = cx + Math.cos(angle) * radius * 1.55;
          const orbitY = cy + Math.sin(angle) * radius * 1.55 * 0.5;
          const alpha = 0.35 + energy * 0.4;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "rgb(255, 234, 210)";
          ctx.beginPath();
          ctx.arc(orbitX, orbitY, 1.6 + energy * 0.7, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = alpha * 0.35;
          ctx.strokeStyle = "rgb(240, 190, 168)";
          ctx.lineWidth = 1;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, 0.5);
          ctx.beginPath();
          ctx.arc(0, 0, radius * 1.55, angle - 0.34, angle);
          ctx.stroke();
          ctx.restore();
        }
      }

      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(6, radius * 0.55));
      coreGrad.addColorStop(0, "rgba(255, 255, 250, 0.95)");
      coreGrad.addColorStop(0.45, `rgba(255, 226, 196, ${0.5 + energy * 0.35})`);
      coreGrad.addColorStop(1, "rgba(244, 168, 158, 0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(6, radius * 0.55), 0, TAU);
      ctx.fill();

      if (collapse > 0) {
        const singularity = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.2 + 4);
        singularity.addColorStop(0, `rgba(255, 255, 245, ${collapse})`);
        singularity.addColorStop(0.3, `rgba(255, 222, 186, ${collapse * 0.68})`);
        singularity.addColorStop(0.62, `rgba(240, 160, 170, ${collapse * 0.3})`);
        singularity.addColorStop(1, "rgba(200, 120, 140, 0)");
        ctx.fillStyle = singularity;
        ctx.beginPath();
        ctx.arc(cx, cy, baseR * 2.2 + 4, 0, TAU);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawCandidate(time: number, energy: number, collapse: number) {
      const student = pickedRef.current;
      if (!student) return;

      let size = Math.min(H * 0.2, W * 0.16, 104);
      ctx.save();
      ctx.font = `700 ${size}px ${fonts.serif}`;
      const width = ctx.measureText(student.name).width;
      if (width > W * 0.56) {
        size *= (W * 0.56) / width;
        ctx.font = `700 ${size}px ${fonts.serif}`;
      }

      const flicker = 0.58 + 0.42 * Math.sin(time * 0.025) * Math.sin(time * 0.009 + 1.7);
      const alpha = clamp(flicker + energy * 0.45, 0, 1) * (1 - easeOutCubic(collapse));
      if (alpha <= 0.01) {
        ctx.restore();
        return;
      }

      const scale = 1 - easeInCubic(collapse) * 0.72;
      const jitter = collapse > 0 || reduced ? 0 : 1.6;

      ctx.translate(cx + rand(-jitter, jitter), cy + rand(-jitter, jitter));
      ctx.scale(scale, scale);
      ctx.globalCompositeOperation = "lighter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${size}px ${fonts.serif}`;
      ctx.globalAlpha = alpha * 0.75;
      ctx.fillStyle = "rgba(150, 210, 246, 0.75)";
      ctx.fillText(student.name, -2.2, 0);
      ctx.fillStyle = "rgba(240, 150, 178, 0.72)";
      ctx.fillText(student.name, 2.2, 0);
      ctx.globalAlpha = alpha;
      ctx.shadowColor = "rgba(255, 214, 186, 0.9)";
      ctx.shadowBlur = 24 + energy * 20;
      ctx.fillStyle = "#fff6de";
      ctx.fillText(student.name, 0, 0);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawWaves() {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        wave.life += lastDt;
        if (wave.life < 0) continue;
        if (wave.life >= wave.maxLife) {
          waves.splice(i, 1);
          continue;
        }
        const k = wave.life / wave.maxLife;
        const radius = wave.r0 + (wave.r1 - wave.r0) * easeOutCubic(k);
        const alpha = (1 - k) * 0.45;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = `rgba(${wave.color}, 0.9)`;
        ctx.lineWidth = wave.width * (1 - k) + 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawBursts() {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = bursts.length - 1; i >= 0; i--) {
        const p = bursts[i];
        p.life += lastDt;
        if (p.life < 0) continue;
        if (p.life >= p.maxLife) {
          bursts.splice(i, 1);
          continue;
        }
        const step = lastDt / 1000;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vx *= Math.pow(0.975, lastDt / 16);
        p.vy *= Math.pow(0.975, lastDt / 16);
        p.vy += 26 * step;
        const k = p.life / p.maxLife;
        ctx.globalAlpha = (1 - k) * (0.5 + 0.5 * Math.sin(p.life * 0.02));
        ctx.fillStyle = `rgb(${p.color})`;
        const size = p.size * (1 - k * 0.55);
        ctx.fillRect(p.x, p.y, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawSparks() {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += lastDt;
        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
          continue;
        }
        const step = lastDt / 1000;
        s.x += s.vx * lastDt;
        s.y += s.vy * lastDt;
        s.vx += Math.sin(s.y * 0.02 + s.tw) * 0.0005 * step;
        const k = s.life / s.maxLife;
        const alpha = Math.sin(clamp(k, 0, 1) * Math.PI) * 0.75;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${s.color})`;
        const size = s.size * (0.6 + 0.6 * Math.sin(s.life * 0.004 + s.tw));
        ctx.fillRect(s.x, s.y, Math.max(0.6, size), Math.max(0.6, size));
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawGodRays(time: number, intensity: number) {
      if (intensity <= 0.01) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(cx, nameInfo.baseY);
      const rayCount = 9;
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * TAU + Math.sin(time * 0.0002 + i) * 0.08;
        const length = Math.max(W, H) * 0.62;
        const spread = 0.018 + (i % 3) * 0.008;
        ctx.fillStyle = `rgba(255, 222, 196, ${0.017 * intensity})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle - spread) * length, Math.sin(angle - spread) * length);
        ctx.lineTo(Math.cos(angle + spread) * length, Math.sin(angle + spread) * length);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function drawOrbit(time: number, intensity: number) {
      if (intensity <= 0.01) return;
      const radius = Math.max(nameInfo.width * 0.82, baseR * 1.7);
      const tilt = -0.1 + Math.sin(time * 0.00035) * 0.04;

      ctx.save();
      ctx.translate(cx, nameInfo.baseY);
      ctx.rotate(tilt);
      ctx.scale(1, 0.38);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = intensity * 0.6;
      ctx.strokeStyle = "rgba(160, 210, 246, 0.55)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = intensity * 0.38;
      ctx.strokeStyle = "rgba(250, 198, 178, 0.62)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.13, 0, TAU);
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        const start = time * 0.0005 + (i / 4) * TAU;
        ctx.globalAlpha = intensity * 0.6;
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255, 228, 200, 0.9)" : "rgba(160, 210, 246, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, start, start + 0.42);
        ctx.stroke();
      }

      for (let i = 0; i < 3; i++) {
        const angle = time * (0.0008 + i * 0.00022) + (i / 3) * TAU;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
        glow.addColorStop(0, `rgba(255, 240, 220, ${0.92 * intensity})`);
        glow.addColorStop(1, "rgba(246, 180, 170, 0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 252, 240, 0.95)";
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawDust(elapsed: number) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const settled = elapsed > 2000;
      for (const p of dust) {
        const k = clamp((elapsed - p.delay) / p.dur, 0, 1);
        if (k <= 0) continue;
        const e = easeOutCubic(k);
        const trail = 1 - e;
        const swirlX = Math.cos(p.seed + k * 5.2) * p.swirl * trail;
        const swirlY = Math.sin(p.seed + k * 5.2) * p.swirl * trail * 0.55;
        let x = p.sx + (p.tx - p.sx) * e + swirlX;
        let y = p.sy + (p.ty - p.sy) * e + swirlY;
        if (e > 0.985) {
          x += Math.sin(elapsed * 0.0024 + p.seed) * 0.5;
          y += Math.cos(elapsed * 0.002 + p.seed) * 0.5;
        }
        const fade = Math.min(1, k * 2.2);
        const shimmer = settled ? 0.62 + 0.38 * Math.sin(elapsed * 0.003 + p.seed) : 1;
        ctx.globalAlpha = fade * shimmer * 0.92;
        ctx.fillStyle = `rgb(${p.color})`;
        const size = p.size * (0.35 + 0.65 * e);
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawNameText(elapsed: number) {
      const form = clamp((elapsed - 620) / 620, 0, 1);
      if (form <= 0 || !nameInfo.text) return;

      const y = nameInfo.baseY;
      const size = nameInfo.fontSize;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${size}px ${fonts.serif}`;

      ctx.globalAlpha = form * 0.42;
      ctx.fillStyle = "rgba(150, 210, 246, 0.9)";
      ctx.fillText(nameInfo.text, cx - 2.5, y);
      ctx.fillStyle = "rgba(240, 150, 178, 0.85)";
      ctx.fillText(nameInfo.text, cx + 2.5, y);

      const gradient = ctx.createLinearGradient(0, y - size * 0.62, 0, y + size * 0.62);
      gradient.addColorStop(0, "#fffdf8");
      gradient.addColorStop(0.46, "#ffeacf");
      gradient.addColorStop(1, "#f3c1b4");
      ctx.globalAlpha = form;
      ctx.shadowColor = "rgba(255, 214, 186, 0.92)";
      ctx.shadowBlur = 26 + Math.sin(elapsed * 0.002) * 6;
      ctx.fillStyle = gradient;
      ctx.fillText(nameInfo.text, cx, y);
      ctx.shadowBlur = 0;
      ctx.restore();

      const sweep = clamp((elapsed - 1480) / 1050, 0, 1);
      if (sweep > 0 && sweep < 1) {
        const x = cx - nameInfo.width * 0.58 + nameInfo.width * 1.16 * sweep;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const beam = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
        beam.addColorStop(0, "rgba(255, 255, 255, 0)");
        beam.addColorStop(0.5, `rgba(255, 248, 220, ${0.22 * Math.sin(sweep * Math.PI)})`);
        beam.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = beam;
        ctx.fillRect(x - 26, y - size * 0.74, 52, size * 1.48);
        ctx.restore();
      }
    }

    function drawOrnament(elapsed: number) {
      const k = clamp((elapsed - 1120) / 620, 0, 1);
      if (k <= 0 || !nameInfo.text) return;
      const y = nameInfo.baseY - nameInfo.fontSize * 0.78;
      const half = Math.min(nameInfo.width * 0.5 + 26, W * 0.34);
      const alpha = k * 0.75;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      const line = ctx.createLinearGradient(cx - half - 40, 0, cx + half + 40, 0);
      line.addColorStop(0, "rgba(255, 220, 170, 0)");
      line.addColorStop(0.35, "rgba(255, 220, 170, 0.7)");
      line.addColorStop(0.65, "rgba(255, 220, 170, 0.7)");
      line.addColorStop(1, "rgba(255, 220, 170, 0)");
      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx - 12, y);
      ctx.moveTo(cx + 12, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 238, 196, 0.95)";
      ctx.save();
      ctx.translate(cx, y);
      ctx.rotate(Math.PI / 4);
      const diamond = 4 * k;
      ctx.fillRect(-diamond / 2, -diamond / 2, diamond, diamond);
      ctx.restore();
      ctx.restore();
    }

    function drawMeta(elapsed: number) {
      if (!nameInfo.meta) return;
      const k = clamp((elapsed - 1320) / 700, 0, 1);
      if (k <= 0) return;
      const size = clamp(nameInfo.fontSize * 0.17, 11, 16);
      ctx.save();
      ctx.globalAlpha = k * 0.82;
      ctx.fillStyle = "rgba(206, 216, 238, 0.92)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `400 ${size}px ${fonts.sans}`;
      ctx.fillText(nameInfo.meta, cx, nameInfo.baseY + nameInfo.fontSize * 0.68);
      ctx.restore();
    }

    function drawReveal(time: number) {
      const elapsed = time - revealAt;
      if (elapsed < 0) return;
      const intensity = clamp(elapsed / 720, 0, 1);

      const halo = ctx.createRadialGradient(cx, nameInfo.baseY, 0, cx, nameInfo.baseY, Math.max(nameInfo.width, baseR * 2) * 0.78);
      halo.addColorStop(0, `rgba(255, 216, 190, ${0.11 * intensity})`);
      halo.addColorStop(0.5, `rgba(150, 185, 240, ${0.045 * intensity})`);
      halo.addColorStop(1, "rgba(80, 90, 180, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, nameInfo.baseY, Math.max(nameInfo.width, baseR * 2) * 0.78, 0, TAU);
      ctx.fill();
      ctx.restore();

      drawGodRays(time, intensity);
      drawOrbit(time, intensity);
      drawDust(elapsed);
      drawNameText(elapsed);
      drawOrnament(elapsed);
      drawMeta(elapsed);
    }

    function drawFlash(time: number) {
      const since = time - flashAt;
      if (since < 0 || since > 620) return;
      const k = 1 - since / 620;
      const power = Math.pow(k, 2.4);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.62);
      grad.addColorStop(0, `rgba(255, 255, 248, ${0.92 * power})`);
      grad.addColorStop(0.26, `rgba(255, 236, 214, ${0.58 * power})`);
      grad.addColorStop(0.62, `rgba(240, 172, 180, ${0.24 * power})`);
      grad.addColorStop(0.82, `rgba(180, 206, 246, ${0.16 * power})`);
      grad.addColorStop(1, "rgba(120, 150, 255, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    function drawVignette() {
      if (!vignette) return;
      ctx.save();
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = clamp(((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2, -1, 1);
      pointerY = clamp(((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2, -1, 1);
    };

    const onPointerLeave = () => {
      pointerX = 0;
      pointerY = 0;
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // 离开视口时暂停 rAF 循环，回到视口时恢复
    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && raf === null) {
          raf = requestAnimationFrame(frame);
        }
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);

    document.fonts?.ready.then(() => {
      if (phaseRef.current !== "reveal") return;
      const elapsed = performance.now() - revealAt;
      buildNameDust(elapsed > 1000 ? 1200 : 0);
    });

    function frame(now: number) {
      const rawDt = now - lastTs;
      const dt = clamp(rawDt, 4, 48);
      lastDt = dt;
      lastTs = now;
      const currentPhase = phaseRef.current;

      if (currentPhase !== lastPhase) {
        phaseStart = now;
        if (currentPhase === "collapse") enterCollapse(now);
        else if (currentPhase === "reveal") enterReveal(now);
        lastPhase = currentPhase;
      }

      const energy =
        currentPhase === "warp" ? clamp((now - phaseStart) / 420, 0, 1)
        : currentPhase === "collapse" ? 1.4
        : currentPhase === "reveal" ? 0.45
        : 0.18;
      const targetWarp = currentPhase === "warp" ? 1 : 0;
      warpAmount += (targetWarp - warpAmount) * Math.min(1, dt / 220);

      const collapseProgress = currentPhase === "collapse" ? clamp((now - phaseStart) / COLLAPSE_MS, 0, 1) : currentPhase === "reveal" ? 1 : 0;
      const shakeBase = reduced ? 0 : currentPhase === "collapse" ? 9 * (1 - collapseProgress) : currentPhase === "warp" ? 0.8 : 0;
      const shakeX = shakeBase > 0 ? rand(-shakeBase, shakeBase) : 0;
      const shakeY = shakeBase > 0 ? rand(-shakeBase, shakeBase) : 0;

      // 尊重系统「减少动态」：环境层时间放慢到 18%，交互反馈仍即时呈现
      const ambientTime = reduced ? now * 0.18 : now;

      drawBackground(ambientTime);
      ctx.save();
      ctx.translate(shakeX, shakeY);

      drawAurora(ambientTime, currentPhase === "collapse" ? 1.55 : currentPhase === "warp" ? 1.15 : currentPhase === "reveal" ? 1.05 : 0.6);
      drawStars(ambientTime, warpAmount);
      if (currentPhase === "warp" || currentPhase === "collapse") drawVortex(ambientTime, Math.max(energy, warpAmount));

      if (currentPhase === "reveal") {
        drawReveal(now);
      } else {
        drawCore(ambientTime, energy, collapseProgress);
        if (currentPhase === "warp" || currentPhase === "collapse") drawCandidate(ambientTime, energy, collapseProgress);
      }

      drawWaves();
      drawBursts();
      drawSparks();
      ctx.restore();

      drawFlash(now);
      drawVignette();

      if (!visible) {
        raf = null;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  const phaseMeta: Record<Phase, { label: string; dot: string }> = {
    idle: { label: "Standby · 待机", dot: "#8fa8c8" },
    warp: { label: "Charging · 聚能", dot: "#e5a4b1" },
    collapse: { label: "Locking · 锁定", dot: "#f3d7ad" },
    reveal: { label: "Revealed · 揭晓", dot: "#a5d3b6" },
  };
  const meta = phaseMeta[phase];

  return (
    <div
      className={cn("relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden", className)}
      style={{ backgroundColor: "#05060f" }}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />

      {/* 内圈渐变描边：让投影区像一块嵌在纸面上的黑曜石屏幕 */}
      <div className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] ring-1 ring-inset ring-white/[0.08]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-24px_48px_-24px_rgba(0,0,0,0.75)]"
      />

      {/* 四角刻线：仪表盘般的精密感 */}
      <span aria-hidden className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 rounded-tl-md border-l border-t border-white/15" />
      <span aria-hidden className="pointer-events-none absolute right-3 top-3 z-10 h-4 w-4 rounded-tr-md border-r border-t border-white/15" />
      <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 z-10 h-4 w-4 rounded-bl-md border-b border-l border-white/15" />
      <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 z-10 h-4 w-4 rounded-br-md border-b border-r border-white/15" />

      {/* 状态胶囊 */}
      <div className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 backdrop-blur-sm">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: meta.dot, boxShadow: `0 0 8px ${meta.dot}` }}
        />
        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/45">{meta.label}</span>
      </div>

      {/* 英文微标 */}
      <span aria-hidden className="pointer-events-none absolute right-5 top-5 z-10 hidden text-[9px] uppercase tracking-[0.22em] text-white/25 sm:block">
        Nebula · Roll Call
      </span>

      {phase === "idle" && (
        <div className="pointer-events-none absolute bottom-7 z-10 text-[11px] tracking-[0.28em] text-white/40">
          点击按钮 · 唤醒星核
        </div>
      )}

      {phase === "reveal" && picked && (
        <div className="pointer-events-none absolute bottom-6 z-10 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/30">
          <span className="h-px w-6 bg-[linear-gradient(90deg,transparent,rgba(229,164,177,0.7))]" />
          Selected
          <span className="h-px w-6 bg-[linear-gradient(90deg,rgba(229,164,177,0.7),transparent)]" />
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {picked ? `本次抽中 ${picked.name}` : ""}
      </div>
    </div>
  );
}
