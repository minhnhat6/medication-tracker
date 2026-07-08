import { serverError } from "@/lib/api";
import { gatherReport, STATUS_LABEL } from "@/lib/report";
import { RangePreset } from "@/lib/range";
import { fmt } from "@/lib/time";
import { ROBOTO_REGULAR_B64 } from "@/lib/font-roboto";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const preset = (b.range || "30d") as RangePreset;
    const data = await gatherReport(preset, b.from, b.to);

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_B64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.setFont("Roboto", "normal");

    const M = 40;
    let y = 48;

    doc.setFontSize(18);
    doc.text("Báo cáo theo dõi uống thuốc", M, y);
    y += 22;
    doc.setFontSize(10);
    doc.setTextColor(100);
    const rangeText =
      data.from ? `${fmt(new Date(data.from), "dd/MM/yyyy")} – ${fmt(new Date(data.to), "dd/MM/yyyy")}` : "Toàn bộ";
    doc.text(`Khoảng: ${data.rangeLabel} (${rangeText})`, M, y);
    y += 14;
    doc.text(`Xuất lúc: ${fmt(new Date(), "dd/MM/yyyy HH:mm")}`, M, y);
    doc.setTextColor(0);
    y += 24;

    // --- Thống kê ---
    const s = data.stats;
    autoTable(doc, {
      startY: y,
      head: [["Chỉ số", "Giá trị"]],
      body: [
        ["Tỷ lệ hoàn thành", `${s.completionRate}%`],
        ["Số ngày đủ thuốc", String(s.completedDays)],
        ["Số ngày bỏ thuốc", String(s.missedDays)],
        ["Chuỗi ngày hiện tại (streak)", String(s.currentStreak)],
        ["Chuỗi ngày dài nhất", String(s.longestStreak)],
        ["Tổng số lần phát bệnh", String(s.totalEpisodes)],
        ["Số ngày kể từ lần phát bệnh gần nhất", s.daysSinceLastEpisode ?? "—"],
        ["Khoảng không phát bệnh dài nhất (ngày)", s.longestEpisodeFreeDays ?? "—"],
      ],
      styles: { font: "Roboto", fontSize: 9 },
      headStyles: { font: "Roboto", fillColor: [37, 99, 235] },
      margin: { left: M, right: M },
    });
    // @ts-expect-error lastAutoTable được autotable gắn vào doc
    y = doc.lastAutoTable.finalY + 24;

    // --- Lịch sử uống thuốc ---
    doc.setFontSize(13);
    doc.text("Lịch sử uống thuốc", M, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Ngày", "Sáng", "Tối", "Trạng thái"]],
      body: data.days
        .slice()
        .reverse()
        .map((d) => [
          fmt(new Date(d.date), "dd/MM/yyyy"),
          d.morningTaken ? "✓" : "✗",
          d.eveningTaken ? "✓" : "✗",
          STATUS_LABEL[d.status],
        ]),
      styles: { font: "Roboto", fontSize: 9 },
      headStyles: { font: "Roboto", fillColor: [37, 99, 235] },
      margin: { left: M, right: M },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 24;

    // --- Nhật ký phát bệnh ---
    doc.setFontSize(13);
    doc.text("Nhật ký phát bệnh", M, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Thời gian", "Mức độ", "Thời lượng", "Địa điểm", "Ghi chú"]],
      body: data.episodes.length
        ? data.episodes.map((e) => [
            e.time,
            e.severity,
            e.duration ? `${e.duration} phút` : "—",
            e.location || "—",
            e.notes || "—",
          ])
        : [["—", "—", "—", "—", "Không có"]],
      styles: { font: "Roboto", fontSize: 9, cellWidth: "wrap" },
      headStyles: { font: "Roboto", fillColor: [220, 38, 38] },
      margin: { left: M, right: M },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 24;

    // --- Thay đổi thuốc ---
    if (data.changes.length) {
      doc.setFontSize(13);
      doc.text("Lịch sử thay đổi thuốc", M, y);
      y += 8;
      autoTable(doc, {
        startY: y,
        head: [["Ngày", "Thuốc", "Liều", "Lý do", "Ghi chú bác sĩ"]],
        body: data.changes.map((c) => [c.date, c.medicine, c.dosage, c.reason || "—", c.notes || "—"]),
        styles: { font: "Roboto", fontSize: 9 },
        headStyles: { font: "Roboto", fillColor: [16, 185, 129] },
        margin: { left: M, right: M },
      });
    }

    const buf = Buffer.from(doc.output("arraybuffer"));
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bao-cao-thuoc-${data.to}.pdf"`,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
