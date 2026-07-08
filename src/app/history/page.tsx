"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox, Empty } from "@/components/ui";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/status";
import type { MedStatus } from "@prisma/client";

interface LogItem {
  id: string;
  date: string;
  morningTaken: boolean;
  eveningTaken: boolean;
  morningTakenAt: string | null;
  eveningTakenAt: string | null;
  status: MedStatus;
  medicine: { name: string };
}

export default function HistoryPage() {
  const [items, setItems] = useState<LogItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ items: LogItem[] }>("/api/logs?limit=120")
      .then((r) => setItems(r.items))
      .catch((e) => setError((e as Error).message));
  }, []);

  return (
    <div className="space-y-4">
      <PageTitle title="Lịch sử uống thuốc" />
      {error && <ErrorBox message={error} />}
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>Chưa có dữ liệu.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((l) => (
            <div key={l.id} className="card flex items-center justify-between py-3">
              <div>
                <p className="font-medium">
                  {new Date(l.date + "T00:00:00").toLocaleDateString("vi-VN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-slate-500">
                  Sáng {l.morningTaken ? timeOf(l.morningTakenAt) : "✗"} · Tối{" "}
                  {l.eveningTaken ? timeOf(l.eveningTakenAt) : "✗"}
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{ background: STATUS_COLOR[l.status] }}
              >
                {STATUS_LABEL[l.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function timeOf(iso: string | null) {
  if (!iso) return "✓";
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
