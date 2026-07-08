"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Hôm nay", icon: "🏠" },
  { href: "/calendar", label: "Lịch", icon: "📅" },
  { href: "/timeline", label: "Dòng TG", icon: "🕒" },
  { href: "/statistics", label: "Thống kê", icon: "📊" },
  { href: "/more", label: "Thêm", icon: "⋯" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2">
        {items.map((it) => {
          const active =
            it.href === "/" ? path === "/" : path.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                active ? "text-brand-600" : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
