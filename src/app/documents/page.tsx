"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox, Empty } from "@/components/ui";

interface Doc {
  id: string;
  title: string;
  category: string;
  fileUrl: string | null;
  fileUrls?: string[];
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

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      const MAX = 1600;
      if (width > MAX || height > MAX) {
        if (width > height) { height *= MAX / width; width = MAX; }
        else { width *= MAX / height; height = MAX; }
      }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        } else resolve(file);
      }, "image/jpeg", 0.7);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!files || files.length === 0) return setError("Chọn ít nhất một tệp.");
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      const compressedFiles = await Promise.all(Array.from(files).map(compressImage));
      for (let i = 0; i < compressedFiles.length; i++) {
        fd.append(`file_${i}`, compressedFiles[i]);
      }
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
            <input ref={fileRef} type="file" multiple className="input" required />
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
              <span className="text-2xl mt-1">{iconFor(d.category)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {d.title}
                </p>
                <div className="flex flex-wrap gap-1.5 my-1.5">
                  {(d.fileUrls && d.fileUrls.length > 0 ? d.fileUrls : (d.fileUrl ? [d.fileUrl] : [])).map((url, idx) => (
                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="inline-block px-2 py-1 text-xs font-medium text-brand-600 bg-brand-50 dark:bg-brand-950/40 dark:text-brand-300 rounded hover:underline">
                      Xem tệp {idx + 1}
                    </a>
                  ))}
                </div>
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
