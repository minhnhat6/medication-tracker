"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox, Empty } from "@/components/ui";

interface Change {
  id: string;
  medicineName: string;
  dosage: string;
  changeDate: string;
  reason: string | null;
  notes: string | null;
}

function todayInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function ChangesPage() {
  const [items, setItems] = useState<Change[] | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<Change> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ changes: Change[] }>("/api/medication-changes");
      setItems(r.changes);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      const body = {
        medicineName: form.medicineName,
        dosage: form.dosage,
        changeDate: (form.changeDate || todayInput()).slice(0, 10),
        reason: form.reason || null,
        notes: form.notes || null,
      };
      if (form.id) await api(`/api/medication-changes/${form.id}`, { method: "PUT", body: JSON.stringify(body) });
      else await api("/api/medication-changes", { method: "POST", body: JSON.stringify(body) });
      setForm(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Xóa mục này?")) return;
    await api(`/api/medication-changes/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title="Thay đổi thuốc"
        action={
          !form ? (
            <button className="btn-primary" onClick={() => setForm({ changeDate: todayInput() })}>
              ＋ Thêm
            </button>
          ) : null
        }
      />

      {form && (
        <form onSubmit={save} className="card space-y-3">
          {error && <ErrorBox message={error} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tên thuốc</label>
              <input className="input" value={form.medicineName || ""} onChange={(e) => setForm({ ...form, medicineName: e.target.value })} required />
            </div>
            <div>
              <label className="label">Liều lượng</label>
              <input className="input" value={form.dosage || ""} onChange={(e) => setForm({ ...form, dosage: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Ngày thay đổi</label>
            <input type="date" className="input" value={(form.changeDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, changeDate: e.target.value })} required />
          </div>
          <div>
            <label className="label">Lý do</label>
            <input className="input" value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div>
            <label className="label">Ghi chú bác sĩ</label>
            <textarea className="input" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy}>
              {busy ? "Đang lưu…" : form.id ? "Cập nhật" : "Lưu"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>
              Hủy
            </button>
          </div>
        </form>
      )}

      {error && !form && <ErrorBox message={error} />}
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>Chưa có thay đổi thuốc nào.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    💊 {c.medicineName} — {c.dosage}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(c.changeDate).toLocaleDateString("vi-VN")}
                    {c.reason ? ` · ${c.reason}` : ""}
                  </p>
                  {c.notes && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">📝 {c.notes}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <button className="text-xs text-brand-600" onClick={() => setForm({ ...c, changeDate: c.changeDate.slice(0, 10) })}>
                    Sửa
                  </button>
                  <button className="text-xs text-red-500" onClick={() => del(c.id)}>
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
