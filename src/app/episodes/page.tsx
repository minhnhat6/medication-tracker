"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox, Empty } from "@/components/ui";
import EpisodeForm, { EpisodeInit } from "@/components/EpisodeForm";

interface Episode {
  id: string;
  episodeTime: string;
  duration: number | null;
  severity: string;
  location: string | null;
  notes: string | null;
}

const SEV: Record<string, { label: string; color: string }> = {
  mild: { label: "Nhẹ", color: "bg-yellow-100 text-yellow-700" },
  moderate: { label: "Vừa", color: "bg-orange-100 text-orange-700" },
  severe: { label: "Nặng", color: "bg-red-100 text-red-700" },
};

export default function EpisodesPage() {
  const [items, setItems] = useState<Episode[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<EpisodeInit | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ episodes: Episode[] }>("/api/episodes");
      setItems(r.episodes);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function del(id: string) {
    if (!confirm("Xóa lần phát bệnh này?")) return;
    await api(`/api/episodes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title="Nhật ký phát bệnh"
        action={
          !adding && !editing ? (
            <button className="btn-primary" onClick={() => setAdding(true)}>
              ＋ Thêm
            </button>
          ) : null
        }
      />

      {adding && (
        <EpisodeForm
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {editing && (
        <EpisodeForm
          init={editing}
          onDone={() => {
            setEditing(null);
            load();
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {error && <ErrorBox message={error} />}
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>Chưa ghi nhận lần phát bệnh nào.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <div key={e.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    ⚡{" "}
                    {new Date(e.episodeTime).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 ${SEV[e.severity]?.color}`}>
                      {SEV[e.severity]?.label}
                    </span>
                    {e.duration != null && <span>{e.duration} phút</span>}
                    {e.location && <span>· {e.location}</span>}
                  </p>
                  {e.notes && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{e.notes}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <button className="text-xs text-brand-600" onClick={() => setEditing(e)}>
                    Sửa
                  </button>
                  <button className="text-xs text-red-500" onClick={() => del(e.id)}>
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
