"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";

export interface EpisodeInit {
  id?: string;
  episodeTime?: string;
  duration?: number | null;
  severity?: string;
  location?: string | null;
  notes?: string | null;
}

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function EpisodeForm({
  init,
  onDone,
  onCancel,
}: {
  init?: EpisodeInit;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [episodeTime, setTime] = useState(
    init?.episodeTime ? toLocalInput(init.episodeTime) : nowLocalInput()
  );
  const [duration, setDuration] = useState(init?.duration != null ? String(init.duration) : "");
  const [severity, setSeverity] = useState(init?.severity || "moderate");
  const [location, setLocation] = useState(init?.location || "");
  const [notes, setNotes] = useState(init?.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { episodeTime: new Date(episodeTime).toISOString(), duration, severity, location, notes };
      if (init?.id) await api(`/api/episodes/${init.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await api("/api/episodes", { method: "POST", body: JSON.stringify(body) });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      {error && <ErrorBox message={error} />}
      <div>
        <label className="label">Thời gian phát bệnh</label>
        <input type="datetime-local" className="input" value={episodeTime} onChange={(e) => setTime(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Thời lượng (phút)</label>
          <input type="number" min="0" className="input" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="vd: 5" />
        </div>
        <div>
          <label className="label">Mức độ</label>
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="mild">Nhẹ</option>
            <option value="moderate">Vừa</option>
            <option value="severe">Nặng</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Địa điểm</label>
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="vd: ở nhà" />
      </div>
      <div>
        <label className="label">Ghi chú</label>
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={busy}>
          {busy ? "Đang lưu…" : init?.id ? "Cập nhật" : "Lưu"}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Hủy
          </button>
        )}
      </div>
    </form>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
