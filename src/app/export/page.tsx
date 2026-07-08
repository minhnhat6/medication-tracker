"use client";
import { useState } from "react";
import { download } from "@/lib/client";
import { PageTitle, ErrorBox } from "@/components/ui";

const PRESETS = [
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "3m", label: "3 tháng" },
  { key: "6m", label: "6 tháng" },
  { key: "1y", label: "1 năm" },
  { key: "all", label: "Toàn bộ" },
  { key: "custom", label: "Tùy chọn" },
];

export default function ExportPage() {
  const [range, setRange] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function go(fmt: "pdf" | "excel") {
    setBusy(fmt);
    setError("");
    try {
      const body: Record<string, string> = { range };
      if (range === "custom") {
        body.from = from;
        body.to = to;
      }
      const ext = fmt === "pdf" ? "pdf" : "xlsx";
      await download(`/api/export/${fmt}`, body, `bao-cao-thuoc.${ext}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Xuất báo cáo" subtitle="Cho buổi tái khám với bác sĩ" />

      <div className="card space-y-4">
        <div>
          <label className="label">Khoảng thời gian</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setRange(p.key)}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  range === p.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {range === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Từ ngày</label>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Đến ngày</label>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}

        {error && <ErrorBox message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <button className="btn-danger justify-center" disabled={!!busy} onClick={() => go("pdf")}>
            {busy === "pdf" ? "Đang tạo…" : "📄 Tải PDF"}
          </button>
          <button className="btn-primary justify-center" disabled={!!busy} onClick={() => go("excel")}>
            {busy === "excel" ? "Đang tạo…" : "📊 Tải Excel"}
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Báo cáo gồm: lịch sử uống thuốc, nhật ký phát bệnh, dòng thời gian, thống kê và lịch sử thay đổi thuốc.
      </p>
    </div>
  );
}
