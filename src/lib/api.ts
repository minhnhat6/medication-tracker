import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function serverError(e: unknown) {
  const message = e instanceof Error ? e.message : "Lỗi máy chủ";
  console.error(e);
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Ép route luôn chạy động (không prerender khi build — tránh cần DB lúc build). */
export const dynamic = "force-dynamic";
