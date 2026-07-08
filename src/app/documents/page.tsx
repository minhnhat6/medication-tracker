"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox, Empty } from "@/components/ui";

interface Doc {
  id: string;
  title: string;
  category: string;
  fileUrl: string;
  visitDate: string | null;
  notes: string | null;
  createdAt: string;
}

const CATEGORIES = ["Đơn thuốc", "PDF", "Ảnh", "EEG", "MRI", "CT", "Phiếu khám", "Khác"];

export default function DocumentsPage() {
  const [items, setItems] = useState<Doc[] | null>(null);
  const [error, setError] = useState("");
  const [storageOk, setStorageOk] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Đơn thuốc");
  const [visitDate, setVisitDate] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await api<{ documents: Doc[]; storageConfigured: boolean }>("/api/documents");
      setItems(r.documents);
      setStorageOk(r.storageConfigured);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Chọn tệp trước đã.");
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);
      fd.append("category", category);
      if (visitDate) fd.append("visitDate", visitDate);
      if (notes) fd.append("notes", notes);
      await api("/api/documents", { method: "POST", body: fd });
      setOpen(false);
      setTitle("");
      setNotes("");
      setVisitDate("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Xóa tài liệu này?")) return;
    await api(`/api/documents/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title="Hồ sơ khám bệnh"
        action={
          !open ? (
            <button className="btn-primary" onClick={() => setOpen(true)}>
              ＋ Tải lên
            </button>
          ) : null
        }
      />

      {!storageOk && (
        <ErrorBox message="Chưa cấu hình Supabase Storage — thêm NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY để tải tệp." />
      )}

      {open && (
        <form onSubmit={upload} className="card space-y-3">
          {error && <ErrorBox message={error} />}
          <div>
            <label className="label">Tiêu đề</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="vd: Đơn thuốc 07/2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Loại</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ngày khám</label>
              <input type="date" className="input" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Tệp (PDF, ảnh, DICOM…)</label>
            <input ref={fileRef} type="file" className="input" required />
          </div>
          <div>
            <label className="label">Ghi chú</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy || !storageOk}>
              {busy ? "Đang tải lên…" : "Tải lên"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Hủy
            </button>
          </div>
        </form>
      )}

      {error && !open && <ErrorBox message={error} />}
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>Chưa có hồ sơ nào.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((d) => (
            <div key={d.id} className="card flex items-center gap-3">
              <span className="text-2xl">{iconFor(d.category)}</span>
              <div className="flex-1">
                <a href={d.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 underline">
                  {d.title}
                </a>
                <p className="text-xs text-slate-500">
                  {d.category}
                  {d.visitDate ? ` · Khám ${new Date(d.visitDate).toLocaleDateString("vi-VN")}` : ""}
                </p>
                {d.notes && <p className="text-xs text-slate-500">{d.notes}</p>}
              </div>
              <button className="text-xs text-red-500" onClick={() => del(d.id)}>
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function iconFor(cat: string) {
  const map: Record<string, string> = {
    "Đơn thuốc": "💊",
    PDF: "📄",
    Ảnh: "🖼️",
    EEG: "🧠",
    MRI: "🧲",
    CT: "🩻",
    "Phiếu khám": "📋",
  };
  return map[cat] || "📎";
}
