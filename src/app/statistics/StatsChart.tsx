"use client";
/**
 * Chart component tách riêng để dùng với next/dynamic.
 * Recharts (~500KB) chỉ được load khi component này được render.
 */
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

interface ChartPoint {
  date: string;
  value: number;
  color: string;
}

export default function StatsChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu.</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis domain={[0, 2]} ticks={[0, 1, 2]} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
