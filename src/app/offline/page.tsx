export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-5xl">📴</div>
      <h1 className="mt-4 text-xl font-bold">Đang ngoại tuyến</h1>
      <p className="mt-2 text-sm text-slate-500">
        Bạn đang không có mạng. Một số dữ liệu đã lưu vẫn xem được; hãy kết nối lại để đồng bộ.
      </p>
    </div>
  );
}
