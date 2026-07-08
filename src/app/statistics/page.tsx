"use client";
import { useEffect, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox } from "@/components/ui";
import { STATUS_COLOR } from "@/lib/status";
import type { MedStatus } from "@prisma/client";

interface Stats {
  completionRate: number;
  completedDays: number;
  missedDays: number;
  currentStreak: number;
  longestStreak: number;
  totalEpisodes: number;
  daysSinceLastEpisode: number | null;
  longestEpisodeFreeDays: number | null;
}
interface Day {
  date: string;
  status: MedStatus;
}

const RANGES = [
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "3m", label: "3 tháng" },
  { key: "1y", label: "1 năm" },
  { key: "all", label: "Tất cả" },
];

export default function StatisticsPage() {
  const [range, setRange] = useState("30d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async (r: string) => {
    setStats(null);
    try {
      const res = await api<{ stats: Stats; days: Day[] }>(`/api/statistics?range=${r}`);
      setStats(res.stats);
      setDays(res.days);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  const chartData = days.map((d) => ({
    date: d.date.slice(5),
    value: d.status === "completed" ? 2 : d.status === "missing_both" ? 0 : 1,
    color: STATUS_COLOR[d.status],
  }));

  return (
    <div className="space-y-4">
      <PageTitle title="Thống kê" subtitle="Mức độ tuân thủ & phát bệnh" />

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${
              range === r.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}
      {!stats ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Tỷ lệ hoàn thành" value={`${stats.completionRate}%`} accent="text-brand-600" />
            <StatCard label="Streak hiện tại" value={`${stats.currentStreak} ngày`} accent="text-green-600" />
            <StatCard label="Ngày bỏ thuốc" value={String(stats.missedDays)} accent="text-amber-600" />
            <StatCard label="Streak dài nhất" value={`${stats.longestStreak} ngày`} />
            <StatCard label="Tổng lần phát bệnh" value={String(stats.totalEpisodes)} accent="text-red-600" />
            <StatCard
              label="Không phát bệnh"
              value={stats.daysSinceLastEpisode != null ? `${stats.daysSinceLastEpisode} ngày` : "—"}
            />
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-slate-500">
              Tuân thủ theo ngày (0 = thiếu cả 2 · 1 = thiếu 1 · 2 = đủ)
            </h3>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis domain={[0, 2]} ticks={[0, 1, 2]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent || ""}`}>{value}</p>
    </div>
  );
}
