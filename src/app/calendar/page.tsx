"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/status";
import type { MedStatus } from "@prisma/client";

interface Day {
  date: string;
  status: MedStatus | null;
  hasEpisode: boolean;
}

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Nền + chữ cho từng trạng thái — tô kín ô để đọc nhanh cả tháng. */
function cellStyle(status: MedStatus | null, isFuture: boolean): string {
  if (isFuture) return "bg-slate-50 text-slate-300 dark:bg-slate-800/40 dark:text-slate-600";
  switch (status) {
    case "completed":
      return "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30";
    case "missing_morning":
    case "missing_evening":
      return "bg-amber-400 text-amber-950 shadow-sm shadow-amber-400/30";
    case "missing_both":
      return "bg-rose-600 text-white shadow-sm shadow-rose-600/30";
    default:
      return "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
  }
}

/** Ký hiệu trạng thái để phân biệt không chỉ dựa vào màu (hỗ trợ mù màu). */
function statusMark(status: MedStatus | null, isFuture: boolean): string {
  if (isFuture || !status) return "";
  if (status === "completed") return "✓";
  if (status === "missing_both") return "✕";
  return "½"; // thiếu 1 liều
}

export default function CalendarPage() {
  // Khởi tạo sau khi mount để server & client render khớp (tránh hydration mismatch
  // khi giờ server UTC ≠ giờ client, nhất là quanh nửa đêm).
  const [month, setMonth] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Day | null>(null);

  const load = useCallback(async (m: string) => {
    setDays(null);
    setSelected(null);
    try {
      const res = await api<{ days: Day[] }>(`/api/calendar?month=${m}`);
      setDays(res.days);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const t = todayStr();
    setToday(t);
    setMonth(t.slice(0, 7));
  }, []);

  useEffect(() => {
    if (month) load(month);
  }, [month, load]);

  function shift(delta: number) {
    if (!month) return;
    const [yy, mm] = month.split("-").map(Number);
    const d = new Date(yy, mm - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  if (!month) {
    return (
      <div className="space-y-4">
        <PageTitle title="Lịch" subtitle="Tổng quan uống thuốc & phát bệnh" />
        <div className="card">
          <Spinner />
        </div>
      </div>
    );
  }

  const [y, m] = month.split("-").map(Number);
  const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Thứ 2 = 0

  const summary = {
    completed: days?.filter((d) => d.status === "completed").length ?? 0,
    missing:
      days?.filter((d) => d.status && d.status !== "completed").length ?? 0,
    episodes: days?.filter((d) => d.hasEpisode).length ?? 0,
  };

  return (
    <div className="space-y-4">
      <PageTitle title="Lịch" subtitle="Tổng quan uống thuốc & phát bệnh" />

      <div className="card">
        {/* Điều hướng tháng */}
        <div className="mb-3 flex items-center justify-between">
          <button className="btn-ghost !px-3" onClick={() => shift(-1)} aria-label="Tháng trước">
            ‹
          </button>
          <span className="text-base font-semibold">
            Tháng {m}/{y}
          </span>
          <button className="btn-ghost !px-3" onClick={() => shift(1)} aria-label="Tháng sau">
            ›
          </button>
        </div>

        {/* Tóm tắt tháng */}
        {days && (
          <div className="mb-4 grid grid-cols-3 gap-2 text-center">
            <SummaryChip value={summary.completed} label="Đủ thuốc" cls="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" />
            <SummaryChip value={summary.missing} label="Thiếu liều" cls="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" />
            <SummaryChip value={summary.episodes} label="Phát bệnh" cls="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" />
          </div>
        )}

        {error && <ErrorBox message={error} />}
        {!days ? (
          <Spinner />
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400">
              {WD.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={"e" + i} />
              ))}
              {days.map((d) => {
                const dayNum = Number(d.date.slice(-2));
                const isToday = d.date === today;
                const isFuture = d.date > today;
                const mark = statusMark(d.status, isFuture);
                return (
                  <button
                    key={d.date}
                    onClick={() => setSelected(d)}
                    title={d.status ? STATUS_LABEL[d.status] : "Chưa có dữ liệu"}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl leading-none transition active:scale-95 ${cellStyle(
                      d.status,
                      isFuture
                    )} ${isToday ? "ring-2 ring-brand-600 ring-offset-2 dark:ring-offset-slate-900" : ""} ${
                      selected?.date === d.date ? "outline outline-2 outline-slate-900 dark:outline-white" : ""
                    }`}
                  >
                    <span className="text-lg font-bold">{dayNum}</span>
                    {mark && <span className="mt-0.5 text-[11px] font-bold opacity-90">{mark}</span>}
                    {d.hasEpisode && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[11px] shadow ring-2 ring-white dark:ring-slate-900">
                        ⚡
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Chi tiết ngày được chọn */}
        {selected && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50">
            <p className="font-semibold">
              {new Date(selected.date + "T00:00:00").toLocaleDateString("vi-VN", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 text-slate-500">
              {selected.status ? STATUS_LABEL[selected.status] : "Chưa có dữ liệu uống thuốc"}
              {selected.hasEpisode ? " · ⚡ Có phát bệnh" : ""}
            </p>
          </div>
        )}

        {/* Chú thích */}
        <div className="mt-5 grid grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
          <Legend cls="bg-emerald-500 text-white" mark="✓" label="Đủ thuốc" />
          <Legend cls="bg-amber-400 text-amber-950" mark="½" label="Thiếu 1 liều" />
          <Legend cls="bg-rose-600 text-white" mark="✕" label="Thiếu cả 2" />
          <Legend cls="bg-slate-100 text-slate-400 dark:bg-slate-800" mark="" label="Chưa có" />
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-yellow-400 text-xs">⚡</span>
            Có phát bệnh
          </span>
        </div>
      </div>
    </div>
  );
}

function SummaryChip({ value, label, cls }: { value: number; label: string; cls: string }) {
  return (
    <div className={`rounded-xl px-2 py-2 ${cls}`}>
      <div className="text-lg font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] font-medium opacity-80">{label}</div>
    </div>
  );
}

function Legend({ cls, mark, label }: { cls: string; mark: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${cls}`}>
        {mark}
      </span>
      {label}
    </span>
  );
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
