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
  stockDoses: number | null;
  remainingDays: number | null;
  lowStock: boolean;
}

interface Today {
  date: string;
  items: Item[];
  progress: { taken: number; total: number };
  due: { medicine: string; which: string; time: string }[];
  episodesToday: { id: string; episodeTime: string; severity: string }[];
  hasEpisodeToday: boolean;
  stockAlerts: { medicineName: string; stockDoses: number; remainingDays: number }[];
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

interface ExtraDose {
  id: string;
  name: string;
  dosage: string | null;
  note: string | null;
  takenAt: string;
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
  const [extraDoses, setExtraDoses] = useState<ExtraDose[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [todayData, statsData, extraData] = await Promise.all([
        api<Today>("/api/dashboard/today"),
        api<{ stats: Stats; days: Day[] }>("/api/statistics?range=7d"),
        api<ExtraDose[]>("/api/extra-doses"),
      ]);
      setData(todayData);
      setStats(statsData.stats);
      setDays(statsData.days);
      setExtraDoses(extraData);
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
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {dayName(data.date)}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
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
      <div className="card !p-3">
        <div className="mb-2 flex items-baseline justify-between">
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

      </div>

      {/* Medicine cards */}
      {data.items.map((it) => (
        <div key={it.medicine.id} className="card !p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {it.medicine.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{it.medicine.dosage}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {STATUS_LABEL[it.log.status]}
              </span>
              {/* Badge tồn kho */}
              {it.stockDoses !== null && (
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    it.lowStock
                      ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  }`}
                >
                  {it.lowStock ? `⚠️ ${it.remainingDays}ngày` : `📦 ${it.remainingDays}ngày`}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
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

      {/* Cảnh báo sắp hết thuốc */}
      {data.stockAlerts.length > 0 && (
        <div className="space-y-2">
          {data.stockAlerts.map((alert) => (
            <div
              key={alert.medicineName}
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800/50 dark:bg-red-900/20"
            >
              <span className="text-lg leading-none">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Sắp hết thuốc: {alert.medicineName}
                </p>
                <p className="text-xs text-red-600 dark:text-red-500">
                  Còn {alert.stockDoses} liều — đủ {alert.remainingDays} ngày. Hãy mua thêm!
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thuốc uống thêm */}
      <ExtraDoseCard doses={extraDoses} onRefresh={load} />

      {/* Quick Stats & Mini Calendar */}
      {stats && days && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="card col-span-2 sm:col-span-1 flex flex-col justify-center text-center !p-2.5">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Chuỗi duy trì</p>
            <p className="mt-0.5 text-xl font-bold text-green-600 dark:text-green-400">{stats.currentStreak} ngày</p>
          </div>
          <div className="card col-span-2 sm:col-span-1 flex flex-col justify-center text-center !p-2.5">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Hoàn thành tuần</p>
            <p className="mt-0.5 text-xl font-bold text-brand-600 dark:text-brand-400">{stats.completionRate}%</p>
          </div>
          <div className="card col-span-2 sm:col-span-2 !p-2.5">
            <p className="mb-1.5 text-[11px] text-center text-slate-500 dark:text-slate-400">7 ngày gần nhất</p>
            <div className="flex justify-between gap-1">
              {days.slice(-7).map((d) => {
                const dayNum = Number(d.date.slice(-2));
                const isToday = d.date === data.date;
                const style = cellStyle(d.status);
                return (
                  <div
                    key={d.date}
                    title={STATUS_LABEL[d.status]}
                    className={`flex h-8 w-8 flex-col items-center justify-center rounded-md leading-none ${style} ${
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

      {/* Countdown & Tips */}
      <NextDoseCountdown nextUp={nextUp} />
      <DailyTip />

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/episodes/new" className="btn-danger justify-center !py-1.5 text-sm">
          Ghi phát bệnh
        </Link>
        <Link href="/export" className="btn-ghost justify-center !py-1.5 text-sm">
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
      className={`flex min-h-[85px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-2 transition-all active:scale-[0.98] ${
        taken
          ? "border-green-600 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950/30 dark:text-green-100"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-slate-600"
      } ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      <span className="text-xl leading-none">{taken ? "✓" : "○"}</span>
      <p className="text-sm font-semibold leading-tight">{label}</p>
      <p className="text-xs opacity-75 leading-tight">{time}</p>
      {taken && at && (
        <p className="mt-0.5 text-[10px] opacity-60 leading-tight">
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

function ExtraDoseCard({
  doses,
  onRefresh,
}: {
  doses: ExtraDose[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api("/api/extra-doses", {
        method: "POST",
        body: JSON.stringify({ name, dosage, note }),
      });
      setName("");
      setDosage("");
      setNote("");
      setOpen(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    try {
      await api(`/api/extra-doses/${id}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="card !p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          💊 Thuốc uống thêm hôm nay
        </h3>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          {open ? "Huỷ" : "+ Thêm"}
        </button>
      </div>

      {/* Danh sách */}
      {doses.length === 0 && !open && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          Chưa có thuốc nào được ghi thêm hôm nay.
        </p>
      )}
      <ul className="space-y-1.5">
        {doses.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {d.name}
              </span>
              {d.dosage && (
                <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {d.dosage}
                </span>
              )}
              <span className="ml-1.5 text-[10px] text-slate-400">
                {new Date(d.takenAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {d.note && (
                <p className="text-[10px] text-slate-400 truncate">{d.note}</p>
              )}
            </div>
            <button
              onClick={() => remove(d.id)}
              disabled={deleting === d.id}
              className="shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {/* Form thêm */}
      {open && (
        <div className="mt-2.5 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <div>
            <label className="label">Tên thuốc *</label>
            <input
              className="input"
              placeholder="Ví dụ: Paracetamol, Tiffy..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Liều lượng</label>
              <input
                className="input"
                placeholder="500mg, 1 viên..."
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Ghi chú</label>
              <input
                className="input"
                placeholder="Sau khi ăn..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <button
            onClick={add}
            disabled={saving || !name.trim()}
            className="btn-primary w-full !py-1.5 text-sm disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "💾 Lưu"}
          </button>
        </div>
      )}
    </div>
  );
}

function DailyTip() {
  const TIPS = [
    "💧 Uống đủ 2 lít nước mỗi ngày giúp cơ thể trao đổi chất tốt hơn.",
    "🛌 Ngủ đủ 7-8 tiếng mỗi đêm là liều thuốc phục hồi tuyệt vời nhất.",
    "⏰ Nhớ uống thuốc đúng giờ để duy trì nồng độ thuốc ổn định trong máu.",
    "🏃 Tập thể dục nhẹ nhàng 15-30 phút mỗi ngày giúp tinh thần sảng khoái.",
    "🧘 Đừng quên thư giãn và hít thở sâu khi cảm thấy căng thẳng.",
    "🥗 Ăn nhiều rau xanh và trái cây tươi để bổ sung vitamin tự nhiên.",
    "📝 Ghi chép lại các lần phát bệnh giúp bác sĩ điều chỉnh thuốc chính xác hơn.",
    "☀️ Dành 15 phút tắm nắng sáng sớm để bổ sung vitamin D tự nhiên.",
  ];
  const [tipIndex, setTipIndex] = useState(0);
  
  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    setTipIndex(dayOfYear % TIPS.length);
  }, []);

  return (
    <div className="card !p-3 mt-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900/30">
      <h3 className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">💡 Mẹo sức khỏe hôm nay</h3>
      <p className="text-sm text-blue-900/80 dark:text-blue-200/80 leading-snug">{TIPS[tipIndex]}</p>
    </div>
  );
}

function NextDoseCountdown({ nextUp }: { nextUp: Item["next"] }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!nextUp) return;
    const tick = () => {
      const now = new Date();
      const [h, m] = nextUp.time.split(":").map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      
      let diffMs = target.getTime() - now.getTime();
      if (diffMs < 0) {
        setTimeLeft("Đã quá giờ uống");
        return;
      }
      
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      if (hrs > 0) setTimeLeft(`Còn ${hrs}g ${mins}p`);
      else if (mins > 0) setTimeLeft(`Còn ${mins}p ${secs}s`);
      else setTimeLeft(`Còn ${secs}s`);
    };
    
    tick();
    const intv = setInterval(tick, 1000);
    return () => clearInterval(intv);
  }, [nextUp]);

  if (!nextUp) {
    return (
      <div className="card !p-3 mt-1 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30 text-center">
        <span className="text-2xl mb-1 block">🎉</span>
        <p className="text-sm font-semibold text-green-700 dark:text-green-400">Tuyệt vời, bạn đã hoàn thành đủ liều hôm nay!</p>
      </div>
    );
  }

  return (
    <div className="card !p-3 mt-1 flex items-center justify-between">
      <div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Liều tiếp theo</p>
        <p className="text-sm font-bold mt-0.5 text-slate-900 dark:text-slate-100">
          {nextUp.which === "morning" ? "Buổi sáng" : "Buổi tối"} lúc {nextUp.time}
        </p>
      </div>
      <div className="text-right">
        <div className="inline-block px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 font-mono text-sm font-bold shadow-inner">
          {timeLeft || "Đang tính..."}
        </div>
      </div>
    </div>
  );
}
