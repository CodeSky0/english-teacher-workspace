"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Student = {
  id: string;
  name: string;
  enName?: string | null;
  seatNo?: number | null;
  studentNo?: string | null;
};

type DragonPhase = "idle" | "spinning" | "strike" | "reveal";

interface DragonRollCallProps {
  picked: Student | null;
  rolling: boolean;
  className?: string;
}

type CloudP = { x: number; y: number; r: number; a: number; vx: number; vy: number; phase: number };
type SpiritP = { x: number; y: number; vy: number; size: number; a: number; phase: number };
type BurstP = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; hue: number; size: number };
type Bolt = { points: { x: number; y: number }[]; life: number; maxLife: number };
type Shock = { life: number; maxLife: number; r0: number; r1: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

export function DragonRollCall({ picked, rolling, className }: DragonRollCallProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<DragonPhase>("idle");
  const phaseRef = useRef<DragonPhase>("idle");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    if (rolling) {
      setPhase("spinning");
    } else if (picked) {
      setPhase("strike");
      const t = setTimeout(() => setPhase("reveal"), 700);
      return () => clearTimeout(t);
    } else {
      setPhase("idle");
    }
  }, [rolling, picked]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0, DPR = 1;
    let raf = 0;
    const startTime = performance.now();

    const clouds: CloudP[] = [];
    const spirits: SpiritP[] = [];
    const bursts: BurstP[] = [];
    const bolts: Bolt[] = [];
    const shocks: Shock[] = [];
    let lastPhase: DragonPhase = "idle";
    let lastTs = startTime;

    function initParticles() {
      clouds.length = 0;
      spirits.length = 0;
      for (let i = 0; i < 64; i++) {
        clouds.push({
          x: rand(0, W), y: rand(H * 0.55, H + 20),
          r: rand(22, 58), a: rand(0.05, 0.13),
          vx: rand(-0.18, 0.18), vy: rand(-0.06, 0.04),
          phase: rand(0, TAU),
        });
      }
      for (let i = 0; i < 34; i++) {
        spirits.push({
          x: rand(0, W), y: rand(0, H),
          vy: rand(-0.5, -0.15), size: rand(0.8, 2.4),
          a: rand(0.3, 0.8), phase: rand(0, TAU),
        });
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.max(1, Math.floor(W * DPR));
      canvas.height = Math.max(1, Math.floor(H * DPR));
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      initParticles();
      ctx.fillStyle = "#0e0604";
      ctx.fillRect(0, 0, W, H);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function makeBolt(cx: number, cy: number, angle: number, len: number) {
      const ex = cx + Math.cos(angle) * len;
      const ey = cy + Math.sin(angle) * len;
      const pts = [{ x: cx, y: cy }, { x: ex, y: ey }];
      for (let iter = 0; iter < 5; iter++) {
        const next: { x: number; y: number }[] = [];
        for (let i = 0; i < pts.length - 1; i++) {
          next.push(pts[i]);
          const a = pts[i], b = pts[i + 1];
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          const dx = b.x - a.x, dy = b.y - a.y;
          const nlen = Math.hypot(dx, dy) || 1;
          const disp = rand(-1, 1) * len * 0.07 * Math.pow(0.58, iter);
          next.push({ x: mx + (-dy / nlen) * disp, y: my + (dx / nlen) * disp });
        }
        next.push(pts[pts.length - 1]);
        pts.length = 0;
        pts.push(...next);
      }
      return pts;
    }

    function triggerStrike(cx: number, cy: number) {
      for (let i = 0; i < 110; i++) {
        const a = rand(0, TAU);
        const sp = rand(1.5, 10);
        bursts.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0, maxLife: rand(650, 1200),
          hue: rand(38, 58), size: rand(1.4, 4.2),
        });
      }
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * TAU + rand(-0.18, 0.18);
        const len = rand(130, 220);
        bolts.push({ points: makeBolt(cx, cy, ang, len), life: 0, maxLife: rand(320, 520) });
      }
      for (let i = 0; i < 3; i++) {
        shocks.push({ life: -i * 90, maxLife: 700, r0: 20, r1: Math.min(W, H) * 0.7 });
      }
    }

    function spine(t: number, time: number, cx: number, cy: number, rx: number, ry: number, speed: number) {
      const rotation = time * 0.00038 * speed;
      const angle = t * TAU + rotation;
      const wobble = Math.sin(t * Math.PI * 6 + time * 0.0017 * speed) * 0.08;
      const r = 1 + wobble;
      return {
        x: cx + Math.cos(angle) * rx * r,
        y: cy + Math.sin(angle) * ry * r,
      };
    }

    const frame = (now: number) => {
      const dt = Math.min(48, now - lastTs);
      lastTs = now;
      const time = now - startTime;
      const ph = phaseRef.current;
      const cx = W / 2;
      const cy = H * 0.46;

      if (ph === "strike" && lastPhase !== "strike") triggerStrike(cx, cy);
      lastPhase = ph;

      const speed = ph === "spinning" ? 4.8 : ph === "strike" ? 1.4 : 1;
      const baseR = Math.min(W, H) * 0.3;
      const rx = baseR * 1.18;
      const ry = baseR * 0.8;
      const pearlJx = ph === "strike" ? rand(-2.5, 2.5) : 0;
      const pearlJy = ph === "strike" ? rand(-2.5, 2.5) : 0;
      const px = cx + pearlJx;
      const py = cy + pearlJy;

      ctx.fillStyle = ph === "strike" ? "rgba(14, 6, 4, 0.22)" : "rgba(14, 6, 4, 0.16)";
      ctx.fillRect(0, 0, W, H);

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
      bgGrad.addColorStop(0, "rgba(46, 24, 14, 0.10)");
      bgGrad.addColorStop(1, "rgba(8, 4, 2, 0.34)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const c of clouds) {
        c.x += c.vx * (dt / 16);
        c.y += (c.vy + Math.sin(time * 0.0005 + c.phase) * 0.12) * (dt / 16);
        if (c.x < -c.r) c.x = W + c.r;
        if (c.x > W + c.r) c.x = -c.r;
        if (c.y < H * 0.42) c.y = H + c.r;
        if (c.y > H + c.r) c.y = H * 0.42;
        const a = c.a * (0.65 + 0.35 * Math.sin(time * 0.0006 + c.phase));
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        g.addColorStop(0, `rgba(228, 206, 182, ${a})`);
        g.addColorStop(1, "rgba(228, 206, 182, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const spiritBoost = ph === "spinning" ? 1.8 : ph === "strike" ? 2.4 : 1;
      for (const s of spirits) {
        s.y += s.vy * (dt / 16) * spiritBoost;
        s.x += Math.sin(time * 0.001 + s.phase) * 0.3 * (dt / 16);
        if (s.y < -10) { s.y = H + 10; s.x = rand(0, W); }
        const flick = 0.5 + 0.5 * Math.sin(time * 0.003 + s.phase);
        const a = s.a * flick * spiritBoost * 0.7;
        ctx.fillStyle = `rgba(255, 215, 130, ${Math.min(1, a)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      const segs = 110;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255, 190, 80, 0.55)";
      ctx.lineWidth = 15;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(255, 170, 60, 0.9)";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = spine(t, time, cx, cy, rx, ry, speed);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 240, 190, 0.85)";
      ctx.lineWidth = 5;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const scaleFlow = ph === "spinning" ? 0.00025 : 0.0001;
      for (let i = 0; i < 46; i++) {
        const t = (i / 46 + time * scaleFlow) % 1;
        const p = spine(t, time, cx, cy, rx, ry, speed);
        const sz = 1.6 + Math.sin(t * TAU * 3 + time * 0.004) * 0.8;
        ctx.fillStyle = "rgba(255, 232, 160, 0.85)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      const head = spine(0, time, cx, cy, rx, ry, speed);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const headR = 30;
      const headGlow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, headR);
      headGlow.addColorStop(0, "rgba(255, 235, 150, 0.95)");
      headGlow.addColorStop(0.4, "rgba(255, 185, 85, 0.5)");
      headGlow.addColorStop(1, "rgba(255, 140, 40, 0)");
      ctx.fillStyle = headGlow;
      ctx.beginPath();
      ctx.arc(head.x, head.y, headR, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 70, 50, 0.95)";
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(head.x - 1, head.y - 1, 1.2, 0, TAU);
      ctx.fill();
      ctx.restore();

      const pearlR =
        ph === "strike" ? 24 + Math.sin(time * 0.02) * 7
        : ph === "spinning" ? 17 + Math.sin(time * 0.015) * 4
        : 15 + Math.sin(time * 0.004) * 2;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const haloR = pearlR * 4.2;
      const halo = ctx.createRadialGradient(px, py, 0, px, py, haloR);
      const haloA = ph === "strike" ? 0.7 : ph === "spinning" ? 0.42 : 0.26;
      halo.addColorStop(0, `rgba(255, 225, 145, ${haloA})`);
      halo.addColorStop(0.3, `rgba(255, 175, 85, ${haloA * 0.4})`);
      halo.addColorStop(1, "rgba(255, 140, 40, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(px, py, haloR, 0, TAU);
      ctx.fill();
      const pearl = ctx.createRadialGradient(px - pearlR * 0.3, py - pearlR * 0.3, 0, px, py, pearlR);
      pearl.addColorStop(0, "rgba(255, 252, 235, 1)");
      pearl.addColorStop(0.4, "rgba(255, 222, 145, 0.96)");
      pearl.addColorStop(0.8, "rgba(232, 162, 62, 0.72)");
      pearl.addColorStop(1, "rgba(182, 102, 32, 0.32)");
      ctx.fillStyle = pearl;
      ctx.beginPath();
      ctx.arc(px, py, pearlR, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.beginPath();
      ctx.arc(px - pearlR * 0.3, py - pearlR * 0.3, pearlR * 0.26, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = shocks.length - 1; i >= 0; i--) {
        const s = shocks[i];
        s.life += dt;
        if (s.life < 0) continue;
        if (s.life >= s.maxLife) { shocks.splice(i, 1); continue; }
        const k = s.life / s.maxLife;
        const r = s.r0 + (s.r1 - s.r0) * k;
        const a = (1 - k) * 0.7;
        ctx.strokeStyle = `rgba(255, 225, 150, ${a})`;
        ctx.lineWidth = 3 * (1 - k) + 0.5;
        ctx.shadowColor = "rgba(255, 200, 100, 0.8)";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.life += dt;
        if (b.life >= b.maxLife) { bolts.splice(i, 1); continue; }
        const a = 1 - b.life / b.maxLife;
        ctx.strokeStyle = `rgba(255, 250, 225, ${a * 0.92})`;
        ctx.lineWidth = 2.6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(255, 220, 140, 0.95)";
        ctx.shadowBlur = 13;
        ctx.beginPath();
        ctx.moveTo(b.points[0].x, b.points[0].y);
        for (let j = 1; j < b.points.length; j++) ctx.lineTo(b.points[j].x, b.points[j].y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = bursts.length - 1; i >= 0; i--) {
        const p = bursts[i];
        p.life += dt;
        if (p.life >= p.maxLife) { bursts.splice(i, 1); continue; }
        const step = dt / 16;
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vx *= Math.pow(0.97, step);
        p.vy *= Math.pow(0.97, step);
        p.vy += 0.05 * step;
        const a = 1 - p.life / p.maxLife;
        ctx.fillStyle = `hsla(${p.hue}, 92%, 68%, ${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const showReveal = phase === "reveal";
  const showStrike = phase === "strike";

  return (
    <div
      className={cn(
        "relative flex min-h-[400px] flex-col items-center justify-center overflow-hidden",
        className,
      )}
      style={{ backgroundColor: "#0e0604" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {showStrike && (
        <div className="animate-screen-flash pointer-events-none absolute inset-0 z-30 bg-white" />
      )}

      {showReveal && picked && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center">
          <div key={picked.id} className="flex flex-col items-center font-serif font-bold tracking-tight leading-tight">
            {picked.name.split("").map((ch, i) => (
              <span
                key={i}
                className="animate-name-brush text-5xl"
                style={{
                  animationDelay: `${i * 110}ms`,
                  color: "#fff5d6",
                  textShadow: "0 0 18px rgba(255,205,105,0.85), 0 0 38px rgba(255,160,60,0.5)",
                } as CSSProperties}
              >
                {ch}
              </span>
            ))}
          </div>
          <div className="relative mt-6 flex flex-col items-center">
            <div className="relative">
              <div
                key={`stamp-${picked.id}`}
                className="animate-stamp-drop flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#b83a3a] bg-gradient-to-br from-[#d94545] to-[#b82828] text-[10px] font-bold text-white/95 shadow-[0_2px_8px_rgba(184,40,40,0.45)]"
              >
                当选
              </div>
              <div className="animate-ink-spread pointer-events-none absolute inset-0 rounded-full bg-[#b83a3a]/25 blur-md" />
            </div>
            <div className="animate-fade-in-up mt-2 text-sm text-[#c9a070]">
              {picked.enName ? `${picked.enName} · ` : ""}
              {picked.seatNo != null ? `${picked.seatNo} 号` : "未排座"}
              {picked.studentNo ? ` · ${picked.studentNo}` : ""}
            </div>
          </div>
        </div>
      )}

      {phase === "spinning" && picked && (
        <div
          key={picked.id}
          className="animate-name-flicker pointer-events-none absolute bottom-8 z-20 font-serif text-3xl font-bold tracking-tight"
          style={{ color: "#ffd870", textShadow: "0 0 16px rgba(255,180,60,0.7)" } as CSSProperties}
        >
          {picked.name}
        </div>
      )}

      {phase === "idle" && (
        <div className="pointer-events-none absolute bottom-8 z-20 text-sm text-[#a08060]">
          点击「开始抽取」唤醒神龙
        </div>
      )}
    </div>
  );
}
