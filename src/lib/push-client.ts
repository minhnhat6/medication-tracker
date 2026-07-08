"use client";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return { ok: false, message: "Trình duyệt không hỗ trợ Web Push." };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, message: "Bạn chưa cho phép thông báo." };

  const res = await fetch("/api/push/subscribe");
  const { publicKey, configured } = await res.json();
  if (!configured || !publicKey)
    return { ok: false, message: "Server chưa cấu hình VAPID keys." };

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    }));

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  return { ok: true, message: "Đã bật thông báo đẩy trên thiết bị này." };
}

export async function disablePush(): Promise<{ ok: boolean; message: string }> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
  return { ok: true, message: "Đã tắt thông báo đẩy." };
}
