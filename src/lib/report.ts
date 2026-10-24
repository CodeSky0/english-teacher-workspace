import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type StudentReportData = {
  studentName: string;
  className: string;
  examCount: number;
  dimensions: { listening: number; speaking: number; writing: number; total: number };
  dictationRate: number;
  exams: { name: string; examDate: string | null; listening: number | null; speaking: number | null; writing: number | null; total: number | null }[];
  remark?: string;
  teacherName?: string;
};

const W = 210;
const H = 297;
const MARGIN = 20;

function drawRadarChart(doc: jsPDF, cx: number, cy: number, radius: number, data: { label: string; value: number; max: number }[]) {
  const n = data.length;
  const colors: [number, number, number][] = [[197, 100, 115], [61, 104, 150], [94, 159, 126], [168, 122, 61]];

  doc.setDrawColor(227, 225, 219);
  doc.setLineWidth(0.3);
  for (let level = 1; level <= 4; level++) {
    const r = (radius * level) / 4;
    const points: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
    for (let i = 0; i < n; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % n];
      doc.line(x1, y1, x2, y2);
    }
  }

  doc.setDrawColor(200, 200, 200);
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    doc.line(cx, cy, cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }

  const dataPoints: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (radius * Math.min(data[i].value, data[i].max)) / data[i].max;
    dataPoints.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  doc.setFillColor(197, 100, 115);
  doc.setDrawColor(168, 84, 99);
  doc.setLineWidth(0.8);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = dataPoints[i];
    const [x2, y2] = dataPoints[(i + 1) % n];
    if (i === 0) doc.triangle(cx, cy, x1, y1, x2, y2, "FD");
    else doc.triangle(cx, cy, x1, y1, x2, y2, "F");
    doc.line(x1, y1, x2, y2);
  }

  doc.setFontSize(9);
  doc.setTextColor(120, 118, 112);
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lx = cx + (radius + 8) * Math.cos(angle);
    const ly = cy + (radius + 5) * Math.sin(angle);
    const [r, g, b] = colors[i % colors.length];
    doc.setTextColor(r, g, b);
    doc.text(data[i].label, lx, ly, { align: "center" });
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(data[i].value.toFixed(1), lx, ly + 4, { align: "center" });
    doc.setFontSize(9);
  }
}

function drawStamp(doc: jsPDF, x: number, y: number) {
  doc.setDrawColor(166, 73, 83);
  doc.setFillColor(197, 100, 115);
  doc.setLineWidth(1.5);
  doc.circle(x, y, 14, "S");
  doc.setLineWidth(0.5);
  doc.circle(x, y, 11, "S");
  doc.setFontSize(7);
  doc.setTextColor(166, 73, 83);
  doc.text("学情报告", x, y - 3, { align: "center" });
  doc.setFontSize(5);
  doc.text("ENGLISH TEACHER", x, y + 2, { align: "center" });
  doc.setLineWidth(0.3);
  doc.line(x - 8, y, x + 8, y);
}

export function generateStudentReport(data: StudentReportData): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFillColor(249, 248, 245);
  doc.rect(0, 0, W, H, "F");

  doc.setFillColor(197, 100, 115);
  doc.rect(0, 0, W, 4, "F");

  doc.setFontSize(22);
  doc.setTextColor(36, 35, 31);
  doc.text("学情分析报告", MARGIN, 22);

  doc.setFontSize(10);
  doc.setTextColor(120, 118, 112);
  doc.text(`${data.className} · ${data.studentName}`, MARGIN, 28);
  doc.text(`生成日期：${new Date().toLocaleDateString("zh-CN")}`, W - MARGIN, 28, { align: "right" });

  doc.setDrawColor(227, 225, 219);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 32, W - MARGIN, 32);

  let y = 42;

  doc.setFontSize(13);
  doc.setTextColor(36, 35, 31);
  doc.text("一、能力画像", MARGIN, y);
  y += 4;

  drawRadarChart(doc, MARGIN + 35, y + 30, 28, [
    { label: "听力", value: data.dimensions.listening, max: 100 },
    { label: "口语", value: data.dimensions.speaking, max: 100 },
    { label: "写作", value: data.dimensions.writing, max: 100 },
    { label: "总分", value: data.dimensions.total, max: 150 },
  ]);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const summaryX = MARGIN + 80;
  doc.text(`考试次数：${data.examCount}`, summaryX, y + 8);
  doc.text(`听力均分：${data.dimensions.listening.toFixed(1)}`, summaryX, y + 14);
  doc.text(`口语均分：${data.dimensions.speaking.toFixed(1)}`, summaryX, y + 20);
  doc.text(`写作均分：${data.dimensions.writing.toFixed(1)}`, summaryX, y + 26);
  doc.text(`总分均分：${data.dimensions.total.toFixed(1)}`, summaryX, y + 32);
  doc.text(`听写正确率：${data.dictationRate.toFixed(1)}%`, summaryX, y + 38);

  y += 68;

  if (data.exams.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(36, 35, 31);
    doc.text("二、历次成绩", MARGIN, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [["考试", "日期", "听力", "口语", "写作", "总分"]],
      body: data.exams.map((e) => [
        e.name,
        e.examDate ?? "—",
        e.listening?.toFixed(1) ?? "—",
        e.speaking?.toFixed(1) ?? "—",
        e.writing?.toFixed(1) ?? "—",
        e.total?.toFixed(1) ?? "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: [197, 100, 115], fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [60, 60, 60] },
      alternateRowStyles: { fillColor: [248, 228, 231] },
      margin: { left: MARGIN, right: MARGIN },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (data.remark) {
    if (y > H - 60) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setTextColor(36, 35, 31);
    doc.text("三、教师评语", MARGIN, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const remarkLines = doc.splitTextToSize(data.remark, W - 2 * MARGIN);
    doc.text(remarkLines, MARGIN, y);
    y += remarkLines.length * 5 + 8;
  }

  if (y > H - 30) { doc.addPage(); y = 20; }
  doc.setDrawColor(227, 225, 219);
  doc.line(MARGIN, y, W - MARGIN, y);
  y += 8;

  drawStamp(doc, W - MARGIN - 14, y + 5);

  doc.setFontSize(9);
  doc.setTextColor(120, 118, 112);
  doc.text(`教师签名：${data.teacherName ?? "____________"}`, MARGIN, y + 5);
  doc.text("家长签名：____________", MARGIN, y + 12);

  doc.save(`学情报告_${data.studentName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
