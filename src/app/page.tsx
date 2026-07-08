"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Spinner, ErrorBox } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/status";
import type { MedStatus } from "@prisma/client";

interface Item {
  medicine: { id: string; name: string; dosage: string; morningTime: string; eveningTime: string };
  log: {
    morningTaken: boolean;
    eveningTaken: boolean;
    morningTakenAt: string | null;
    eveningTakenAt: string | null;
    status: MedStatus;
  };
  next: { which: "morning" | "evening"; time: string } | null;
  due: { which: "morning" | "evening"; time: string } | null;
}

interface Today {
  date: string;
  items: Item[];
  progress: { taken: number; total: number };
  due: { medicine: string; which: string; time: string }[];
  episodesToday: { id: string; episodeTime: string; severity: string }[];
  hasEpisodeToday: boolean;
}

interface Stats {
  completionRate: number;
  currentStreak: number;
}
interface Day {
  date: string;
  status: MedStatus;
  hasEpisode?: boolean;
}

const dayName = (iso: string) => {
  const names = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  const d = new Date(iso + "T00:00:00");
  return names[d.getDay()];
};

export default function DashboardPage() {
  const [data, setData] = useState<Today | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [todayData, statsData] = await Promise.all([
        api<Today>("/api/dashboard/today"),
        api<{ stats: Stats; days: Day[] }>("/api/statistics?range=7d"),
      ]);
      setData(todayData);
      setStats(statsData.stats);
      setDays(statsData.days);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function mark(medicineId: string, which: "morning" | "evening", taken: boolean) {
    setBusy(medicineId + which);
    try {
      await api(`/api/logs/${which}`, {
        method: "POST",
        body: JSON.stringify({ medicineId, taken }),
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) return <ErrorBox message={error} />;
  if (!data) return <Spinner />;

  const pct = data.progress.total
    ? Math.round((data.progress.taken / data.progress.total) * 100)
    : 0;
  const nextUp = data.items.map((it) => it.next).filter(Boolean)[0] as Item["next"];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {dayName(data.date)}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {new Date(data.date + "T00:00:00").toLocaleDateString("vi-VN", {
            day: "numeric",
            month: "long",
          })}
        </h1>
      </div>

      {/* Alerts */}
      {data.due.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800/50 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Đến giờ uống thuốc
          </p>
          <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
            {data.due.map((d) => `${d.which === "morning" ? "Sáng" : "Tối"} lúc ${d.time}`).join(", ")}
          </p>
        </div>
      )}
      {data.hasEpisodeToday && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 dark:border-red-800/50 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">
            {data.episodesToday.length} lần phát bệnh hôm nay
          </p>
          <Link
            href="/episodes"
            className="mt-0.5 inline-block text-sm font-medium text-red-700 underline decoration-red-700/30 underline-offset-2 hover:decoration-red-700 dark:text-red-400 dark:decoration-red-400/30 dark:hover:decoration-red-400"
          >
            Xem chi tiết
          </Link>
        </div>
      )}

      {/* Progress */}
      <div className="card">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Tiến độ hôm nay
          </h2>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {data.progress.taken}/{data.progress.total}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-green-600 transition-all duration-500 dark:bg-green-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {nextUp ? (
          <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-400">
            Tiếp theo: <span className="font-medium text-slate-900 dark:text-slate-100">{nextUp.which === "morning" ? "Sáng" : "Tối"}</span> lúc {nextUp.time}
          </p>
        ) : (
          <p className="mt-2.5 text-sm font-medium text-green-700 dark:text-green-400">
            Đã uống đủ thuốc hôm nay
          </p>
        )}
      </div>

      {/* Quick Stats & Mini Calendar */}
      {stats && days && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card col-span-2 sm:col-span-1 flex flex-col justify-center text-center p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Chuỗi duy trì</p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{stats.currentStreak} ngày</p>
          </div>
          <div className="card col-span-2 sm:col-span-1 flex flex-col justify-center text-center p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">Hoàn thành tuần</p>
            <p className="mt-1 text-2xl font-bold text-brand-600 dark:text-brand-400">{stats.completionRate}%</p>
          </div>
          <div className="card col-span-2 sm:col-span-2 p-3">
            <p className="mb-2 text-xs text-center text-slate-500 dark:text-slate-400">7 ngày gần nhất</p>
            <div className="flex justify-between gap-1">
              {days.slice(-7).map((d) => {
                const dayNum = Number(d.date.slice(-2));
                const isToday = d.date === data.date;
                const style = cellStyle(d.status);
                return (
                  <div
                    key={d.date}
                    title={STATUS_LABEL[d.status]}
                    className={`flex h-9 w-9 flex-col items-center justify-center rounded-lg leading-none ${style} ${
                      isToday ? "ring-2 ring-brand-600 ring-offset-1 dark:ring-offset-slate-900" : ""
                    }`}
                  >
                    <span className="text-[10px] font-bold">{dayNum}</span>
                    <span className="text-[10px] font-bold opacity-90">{statusMark(d.status)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Medicine cards */}
      {data.items.map((it) => (
        <div key={it.medicine.id} className="card">
          <div className="mb-3.5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {it.medicine.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{it.medicine.dosage}</p>
            </div>
            <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
              {STATUS_LABEL[it.log.status]}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DoseTile
              label="Sáng"
              time={it.medicine.morningTime}
              taken={it.log.morningTaken}
              at={it.log.morningTakenAt}
              busy={busy === it.medicine.id + "morning"}
              onToggle={() => mark(it.medicine.id, "morning", !it.log.morningTaken)}
            />
            <DoseTile
              label="Tối"
              time={it.medicine.eveningTime}
              taken={it.log.eveningTaken}
              at={it.log.eveningTakenAt}
              busy={busy === it.medicine.id + "evening"}
              onToggle={() => mark(it.medicine.id, "evening", !it.log.eveningTaken)}
            />
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/episodes/new" className="btn-danger justify-center">
          Ghi phát bệnh
        </Link>
        <Link href="/export" className="btn-ghost justify-center">
          Xuất báo cáo
        </Link>
      </div>
    </div>
  );
}

function DoseTile({
  label,
  time,
  taken,
  at,
  busy,
  onToggle,
}: {
  label: string;
  time: string;
  taken: boolean;
  at: string | null;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      className={`flex min-h-[110px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-4 transition-all active:scale-[0.98] ${
        taken
          ? "border-green-600 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950/30 dark:text-green-100"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-slate-600"
      } ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      <span className="text-2xl">{taken ? "✓" : "○"}</span>
      <p className="text-base font-semibold">{label}</p>
      <p className="text-sm opacity-75">{time}</p>
      {taken && at && (
        <p className="mt-0.5 text-xs opacity-60">
          {new Date(at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </button>
  );
}

function cellStyle(status: MedStatus | null): string {
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

function statusMark(status: MedStatus | null): string {
  if (!status) return "";
  if (status === "completed") return "✓";
  if (status === "missing_both") return "✕";
  return "½";
}
