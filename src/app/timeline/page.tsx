"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox, Empty } from "@/components/ui";

interface Ev {
  at: string;
  kind: string;
  icon: string;
  label: string;
  detail?: string;
}

const RANGES: { key: string; label: string }[] = [
  { key: "7d", label: "Tuần" },
  { key: "30d", label: "Tháng" },
  { key: "3m", label: "3 tháng" },
  { key: "all", label: "Tất cả" },
];

export default function TimelinePage() {
  const [range, setRange] = useState("7d");
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async (r: string) => {
    setEvents(null);
    try {
      const res = await api<{ events: Ev[] }>(`/api/timeline?range=${r}`);
      setEvents(res.events);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  // Gom theo ngày
  const groups = new Map<string, Ev[]>();
  (events || []).forEach((e) => {
    const day = new Date(e.at).toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(e);
  });

  return (
    <div className="space-y-4">
      <PageTitle title="Dòng thời gian" subtitle="Uống thuốc · phát bệnh · đổi thuốc" />

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
      {!events ? (
        <Spinner />
      ) : events.length === 0 ? (
        <Empty>Chưa có sự kiện nào trong khoảng này.</Empty>
      ) : (
        <div className="space-y-5">
          {Array.from(groups.entries()).map(([day, evs]) => (
            <div key={day}>
              <h3 className="mb-2 text-sm font-semibold capitalize text-slate-500">{day}</h3>
              <div className="space-y-2">
                {evs.map((e, i) => (
                  <div key={i} className="card flex items-start gap-3 py-3">
                    <span className="text-xl">{e.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{e.label}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(e.at).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {e.detail && <p className="text-xs text-slate-500">{e.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
