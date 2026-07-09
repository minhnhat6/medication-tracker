"use client";
import Link from "next/link";
import { PageTitle } from "@/components/ui";

const links = [
  { href: "/history", icon: "📖", title: "Lịch sử uống thuốc", desc: "Nhật ký từng ngày" },
  { href: "/episodes", icon: "⚡", title: "Nhật ký phát bệnh", desc: "Ghi nhận & xem lại" },
  { href: "/changes", icon: "💊", title: "Thay đổi thuốc", desc: "Lịch sử đổi liều/thuốc" },
  { href: "/documents", icon: "📎", title: "Hồ sơ khám bệnh", desc: "Đơn thuốc, PDF, ảnh, MRI…" },
  { href: "/export", icon: "📄", title: "Xuất báo cáo", desc: "PDF / Excel cho bác sĩ" },
  { href: "/settings", icon: "⚙️", title: "Cài đặt", desc: "Thuốc, giờ uống, thông báo" },
];

export default function MorePage() {
  return (
    <div className="space-y-4">
      <PageTitle title="Thêm" />
      <div className="grid gap-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card flex items-center gap-4">
            <span className="text-2xl">{l.icon}</span>
            <div className="flex-1">
              <p className="font-semibold">{l.title}</p>
              <p className="text-xs text-slate-500">{l.desc}</p>
            </div>
            <span className="text-slate-300">›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
