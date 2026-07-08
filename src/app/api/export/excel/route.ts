import { serverError } from "@/lib/api";
import { gatherReport, STATUS_LABEL } from "@/lib/report";
import { RangePreset } from "@/lib/range";
import { fmt } from "@/lib/time";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    const preset = (b.range || "30d") as RangePreset;
    const data = await gatherReport(preset, b.from, b.to);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Medication Tracker";
    wb.created = new Date();

    const headerStyle = (ws: ExcelJS.Worksheet) => {
      ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      ws.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
    };

    // Thống kê
    const s = data.stats;
    const wsStat = wb.addWorksheet("Thống kê");
    wsStat.columns = [
      { header: "Chỉ số", key: "k", width: 42 },
      { header: "Giá trị", key: "v", width: 20 },
    ];
    wsStat.addRows([
      { k: "Khoảng thời gian", v: data.rangeLabel },
      { k: "Từ ngày", v: data.from || "Toàn bộ" },
      { k: "Đến ngày", v: data.to },
      { k: "Tỷ lệ hoàn thành (%)", v: s.completionRate },
      { k: "Số ngày đủ thuốc", v: s.completedDays },
      { k: "Số ngày bỏ thuốc", v: s.missedDays },
      { k: "Streak hiện tại", v: s.currentStreak },
      { k: "Streak dài nhất", v: s.longestStreak },
      { k: "Tổng số lần phát bệnh", v: s.totalEpisodes },
      { k: "Ngày kể từ lần phát bệnh gần nhất", v: s.daysSinceLastEpisode ?? "—" },
      { k: "Khoảng không phát bệnh dài nhất (ngày)", v: s.longestEpisodeFreeDays ?? "—" },
    ]);
    headerStyle(wsStat);

    // Lịch sử uống thuốc
    const wsLog = wb.addWorksheet("Uống thuốc");
    wsLog.columns = [
      { header: "Ngày", key: "date", width: 14 },
      { header: "Sáng", key: "m", width: 8 },
      { header: "Tối", key: "e", width: 8 },
      { header: "Trạng thái", key: "st", width: 20 },
    ];
    data.days
      .slice()
      .reverse()
      .forEach((d) =>
        wsLog.addRow({
          date: fmt(new Date(d.date), "dd/MM/yyyy"),
          m: d.morningTaken ? "✓" : "✗",
          e: d.eveningTaken ? "✓" : "✗",
          st: STATUS_LABEL[d.status],
        })
      );
    headerStyle(wsLog);

    // Phát bệnh
    const wsEp = wb.addWorksheet("Phát bệnh");
    wsEp.columns = [
      { header: "Thời gian", key: "t", width: 20 },
      { header: "Mức độ", key: "sev", width: 12 },
      { header: "Thời lượng (phút)", key: "d", width: 16 },
      { header: "Địa điểm", key: "loc", width: 20 },
      { header: "Ghi chú", key: "n", width: 40 },
    ];
    data.episodes.forEach((e) =>
      wsEp.addRow({ t: e.time, sev: e.severity, d: e.duration ?? "", loc: e.location ?? "", n: e.notes ?? "" })
    );
    headerStyle(wsEp);

    // Timeline
    const wsTl = wb.addWorksheet("Dòng thời gian");
    wsTl.columns = [
      { header: "Thời gian", key: "t", width: 20 },
      { header: "Loại", key: "k", width: 12 },
      { header: "Nội dung", key: "l", width: 40 },
      { header: "Chi tiết", key: "d", width: 30 },
    ];
    data.timeline.forEach((ev) =>
      wsTl.addRow({
        t: fmt(new Date(ev.at), "dd/MM/yyyy HH:mm"),
        k: ev.kind,
        l: ev.label,
        d: ev.detail ?? "",
      })
    );
    headerStyle(wsTl);

    // Thay đổi thuốc
    const wsCh = wb.addWorksheet("Thay đổi thuốc");
    wsCh.columns = [
      { header: "Ngày", key: "date", width: 14 },
      { header: "Thuốc", key: "med", width: 20 },
      { header: "Liều", key: "dose", width: 14 },
      { header: "Lý do", key: "reason", width: 28 },
      { header: "Ghi chú bác sĩ", key: "notes", width: 40 },
    ];
    data.changes.forEach((c) =>
      wsCh.addRow({ date: c.date, med: c.medicine, dose: c.dosage, reason: c.reason ?? "", notes: c.notes ?? "" })
    );
    headerStyle(wsCh);

    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="bao-cao-thuoc-${data.to}.xlsx"`,
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
