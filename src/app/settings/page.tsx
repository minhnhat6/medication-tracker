"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/client";
import { PageTitle, Spinner, ErrorBox } from "@/components/ui";
import { enablePush, disablePush } from "@/lib/push-client";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  morningTime: string;
  eveningTime: string;
  active: boolean;
  stockDoses: number | null;
}

interface NotificationSettings {
  id: string;
  emailEnabled: boolean;
  emailTo: string | null;
  telegramEnabled: boolean;
  telegramChatId: string | null;
  zaloEnabled: boolean;
  zaloPhone: string | null;
  zaloOaId: string | null;
}

interface ReminderSchedule {
  type: string;
  medicineTime?: string;
  reminderTime: string;
  description: string;
}

interface ReminderInfo {
  medicine?: {
    name: string;
    morningTime: string;
    eveningTime: string;
  };
  reminders: ReminderSchedule[];
  note?: string;
}

interface StockHistoryEntry {
  id: string;
  quantity: number;
  totalAfter: number;
  note: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const [meds, setMeds] = useState<Medicine[] | null>(null);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings | null>(null);
  const [reminderSchedule, setReminderSchedule] = useState<ReminderInfo | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);
  // Nhập kho: key = medicineId, value = số liều đang nhập
  const [restockInput, setRestockInput] = useState<Record<string, string>>({});
  const [restockNote, setRestockNote] = useState<Record<string, string>>({});
  const [restocking, setRestocking] = useState<string | null>(null);
  const [stockHistory, setStockHistory] = useState<Record<string, StockHistoryEntry[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const r = await api<{ medicines: Medicine[] }>("/api/medicines");
      setMeds(r.medicines);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadNotifSettings = useCallback(async () => {
    try {
      const r = await api<NotificationSettings>("/api/notifications/settings");
      setNotifSettings(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadReminderSchedule = useCallback(async () => {
    try {
      const r = await api<ReminderInfo>("/api/reminders/schedule");
      setReminderSchedule(r);
    } catch (e) {
      console.error("Error loading reminder schedule:", e);
    }
  }, []);

  useEffect(() => {
    load();
    loadNotifSettings();
    loadReminderSchedule();
  }, [load, loadNotifSettings, loadReminderSchedule]);

  function update(id: string, patch: Partial<Medicine>) {
    setMeds((m) => m!.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function updateNotif(patch: Partial<NotificationSettings>) {
    setNotifSettings((s) => (s ? { ...s, ...patch } : s));
  }

  async function save(m: Medicine) {
    setSaving(m.id);
    setMsg("");
    try {
      await api(`/api/medicines/${m.id}`, {
        method: "PUT",
        body: JSON.stringify(m),
      });
      setMsg("Đã lưu thuốc.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function saveNotifSettings() {
    setSavingNotif(true);
    setMsg("");
    try {
      await api("/api/notifications/settings", {
        method: "PUT",
        body: JSON.stringify(notifSettings),
      });
      setMsg("Đã lưu cấu hình thông báo.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingNotif(false);
    }
  }

  async function addMed() {
    await api("/api/medicines", {
      method: "POST",
      body: JSON.stringify({ name: "Thuốc mới", dosage: "1 viên", morningTime: "07:00", eveningTime: "21:00" }),
    });
    load();
  }

  async function delMed(id: string) {
    if (!confirm("Xóa thuốc này?")) return;
    try {
      await api(`/api/medicines/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function push(on: boolean) {
    setMsg("");
    const r = on ? await enablePush() : await disablePush();
    setMsg(r.message);
  }

  async function testNotify() {
    setMsg("Đang gửi…");
    try {
      const r = await api<{ message: string }>("/api/notifications/test", { method: "POST" });
      setMsg(r.message);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function runCheck() {
    setMsg("Đang kiểm tra…");
    try {
      const r = await api<{ missing: string[] }>("/api/cron/check", { method: "POST" });
      setMsg(r.missing.length ? `Còn thiếu: ${r.missing.join(", ")}` : "Hôm nay không thiếu liều nào 🎉");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function restock(medId: string) {
    const qty = parseInt(restockInput[medId] || "0", 10);
    if (!qty || qty <= 0) return;
    setRestocking(medId);
    try {
      await api(`/api/medicines/${medId}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity: qty, note: restockNote[medId] || undefined }),
      });
      setRestockInput((prev) => ({ ...prev, [medId]: "" }));
      setRestockNote((prev) => ({ ...prev, [medId]: "" }));
      setMsg(`✅ Đã nhập ${qty} liều vào kho!`);
      // Reload medicines + lịch sử
      await load();
      await fetchHistory(medId);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setRestocking(null);
    }
  }

  async function fetchHistory(medId: string) {
    setLoadingHistory(medId);
    try {
      const r = await api<{ history: StockHistoryEntry[] }>(`/api/medicines/${medId}/restock`);
      setStockHistory((prev) => ({ ...prev, [medId]: r.history }));
    } catch {
      // silent
    } finally {
      setLoadingHistory(null);
    }
  }

  function toggleHistory(medId: string) {
    const next = !showHistory[medId];
    setShowHistory((prev) => ({ ...prev, [medId]: next }));
    if (next && !stockHistory[medId]) fetchHistory(medId);
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Cài đặt" />
      {error && <ErrorBox message={error} />}
      {msg && (
        <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
          {msg}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-500">Thuốc & giờ uống</h2>
          <button className="btn-ghost" onClick={addMed}>
            ＋ Thêm thuốc
          </button>
        </div>
        {!meds ? (
          <Spinner />
        ) : (
          meds.map((m) => (
            <div key={m.id} className="card space-y-3">
              <div>
                <label className="label">Tên thuốc</label>
                <input className="input" value={m.name} onChange={(e) => update(m.id, { name: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Liều lượng</label>
                  <input className="input" value={m.dosage} onChange={(e) => update(m.id, { dosage: e.target.value })} />
                </div>
                <div>
                  <label className="label">Giờ sáng</label>
                  <input type="time" className="input" value={m.morningTime} onChange={(e) => update(m.id, { morningTime: e.target.value })} />
                </div>
                <div>
                  <label className="label">Giờ tối</label>
                  <input type="time" className="input" value={m.eveningTime} onChange={(e) => update(m.id, { eveningTime: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={m.active} onChange={(e) => update(m.id, { active: e.target.checked })} />
                  Đang dùng
                </label>
                <div className="flex gap-2">
                  <button className="text-xs text-red-500" onClick={() => delMed(m.id)}>
                    Xóa
                  </button>
                  <button className="btn-primary" disabled={saving === m.id} onClick={() => save(m)}>
                    {saving === m.id ? "Đang lưu…" : "Lưu"}
                  </button>
                </div>
              </div>

              {/* Nhập kho thuốc */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    📦 Tồn kho
                  </span>
                  <span className="text-xs font-medium">
                    {m.stockDoses !== null
                      ? `${m.stockDoses} liều — đủ ${Math.floor(m.stockDoses / 2)} ngày`
                      : "— Chưa theo dõi"}
                  </span>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Số liều (ví dụ: 60)"
                    className="input flex-1"
                    value={restockInput[m.id] || ""}
                    onChange={(e) =>
                      setRestockInput((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                  />
                  <button
                    className="btn-primary shrink-0"
                    disabled={restocking === m.id || !restockInput[m.id]}
                    onClick={() => restock(m.id)}
                  >
                    {restocking === m.id ? "Đang lưu…" : "+ Nhập kho"}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ghi chú (tùy chọn, ví dụ: mua tại nhà thuốc ABC)"
                  className="input w-full text-xs"
                  value={restockNote[m.id] || ""}
                  onChange={(e) =>
                    setRestockNote((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                />

                {/* Nút xem lịch sử */}
                <button
                  className="mt-2 text-xs text-brand-600 dark:text-brand-400 hover:underline"
                  onClick={() => toggleHistory(m.id)}
                >
                  {showHistory[m.id] ? "▲ Ẩn lịch sử" : "▼ Xem lịch sử nhập kho"}
                </button>

                {showHistory[m.id] && (
                  <div className="mt-2 space-y-1.5">
                    {loadingHistory === m.id ? (
                      <p className="text-xs text-slate-400">Đang tải…</p>
                    ) : !stockHistory[m.id]?.length ? (
                      <p className="text-xs text-slate-400">Chưa có lịch sử nhập kho.</p>
                    ) : (
                      stockHistory[m.id].map((h) => (
                        <div
                          key={h.id}
                          className="flex items-start justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2"
                        >
                          <div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              +{h.quantity} liều
                              <span className="ml-1.5 text-slate-400">→ tổng {h.totalAfter} liều</span>
                            </p>
                            {h.note && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{h.note}</p>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                            {new Date(h.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">Thông báo nhắc uống thuốc</h2>
        <div className="card space-y-2">
          <p className="text-xs text-slate-500">
            Bật thông báo đẩy trên thiết bị này. Lúc 23:00 hệ thống tự kiểm tra và nhắc nếu còn thiếu liều
            (qua Web Push, Telegram, Email — tùy cấu hình bên dưới).
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => push(true)}>
              🔔 Bật thông báo
            </button>
            <button className="btn-ghost" onClick={() => push(false)}>
              Tắt
            </button>
            <button className="btn-ghost" onClick={testNotify}>
              Gửi thử
            </button>
            <button className="btn-ghost" onClick={runCheck}>
              Kiểm tra thiếu liều ngay
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">Cấu hình kênh thông báo</h2>
        {!notifSettings ? (
          <Spinner />
        ) : (
          <div className="space-y-3">
            {/* Email */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">📧 Email</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notifSettings.emailEnabled}
                    onChange={(e) => updateNotif({ emailEnabled: e.target.checked })}
                  />
                  Bật
                </label>
              </div>
              <div>
                <label className="label">Địa chỉ email nhận thông báo</label>
                <input
                  type="email"
                  className="input"
                  placeholder="your@email.com"
                  value={notifSettings.emailTo || ""}
                  onChange={(e) => updateNotif({ emailTo: e.target.value })}
                  disabled={!notifSettings.emailEnabled}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Yêu cầu cấu hình SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS trong biến môi trường.
                </p>
              </div>
            </div>

            {/* Telegram */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">💬 Telegram</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notifSettings.telegramEnabled}
                    onChange={(e) => updateNotif({ telegramEnabled: e.target.checked })}
                  />
                  Bật
                </label>
              </div>
              <div>
                <label className="label">Chat ID / User ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="123456789"
                  value={notifSettings.telegramChatId || ""}
                  onChange={(e) => updateNotif({ telegramChatId: e.target.value })}
                  disabled={!notifSettings.telegramEnabled}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Tạo bot với @BotFather và cấu hình TELEGRAM_BOT_TOKEN. Lấy chat ID qua @userinfobot.
                </p>
              </div>
            </div>

            {/* Zalo */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">📱 Zalo (Tính năng tương lai)</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notifSettings.zaloEnabled}
                    onChange={(e) => updateNotif({ zaloEnabled: e.target.checked })}
                  />
                  Bật
                </label>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="label">Số điện thoại Zalo</label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="0901234567"
                    value={notifSettings.zaloPhone || ""}
                    onChange={(e) => updateNotif({ zaloPhone: e.target.value })}
                    disabled={!notifSettings.zaloEnabled}
                  />
                </div>
                <div>
                  <label className="label">Zalo OA ID (Official Account)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="OA ID nếu dùng Zalo OA API"
                    value={notifSettings.zaloOaId || ""}
                    onChange={(e) => updateNotif({ zaloOaId: e.target.value })}
                    disabled={!notifSettings.zaloEnabled}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  ⚠️ Tính năng Zalo chưa được triển khai. Cần tích hợp Zalo OA API hoặc ZNS (Zalo Notification Service).
                </p>
              </div>
            </div>

            <button className="btn-primary w-full" disabled={savingNotif} onClick={saveNotifSettings}>
              {savingNotif ? "Đang lưu…" : "💾 Lưu cấu hình thông báo"}
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">⏰ Lịch nhắc nhở tự động</h2>
        {!reminderSchedule ? (
          <Spinner />
        ) : (
          <div className="space-y-3">
            {reminderSchedule.medicine && (
              <div className="card">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <span>💊</span>
                  <span>{reminderSchedule.medicine.name}</span>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                    <span className="text-slate-600 dark:text-slate-400">Giờ uống sáng:</span>
                    <span className="font-medium">{reminderSchedule.medicine.morningTime}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                    <span className="text-slate-600 dark:text-slate-400">Giờ uống tối:</span>
                    <span className="font-medium">{reminderSchedule.medicine.eveningTime}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card space-y-3">
              <h3 className="text-sm font-medium">Thời gian nhắc nhở</h3>
              {reminderSchedule.reminders.map((reminder, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                >
                  <span className="text-2xl">
                    {reminder.type === "morning" ? "🌅" : reminder.type === "evening" ? "🌙" : "🔔"}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-brand-600 dark:text-brand-400">
                        {reminder.reminderTime}
                      </span>
                      {reminder.medicineTime && (
                        <span className="text-xs text-slate-500">
                          (sau 1h từ {reminder.medicineTime})
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{reminder.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {reminderSchedule.note && (
              <div className="card bg-amber-50 dark:bg-amber-950/20">
                <p className="text-xs text-amber-800 dark:text-amber-200">{reminderSchedule.note}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
