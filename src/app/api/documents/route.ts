import { ok, bad, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin, STORAGE_BUCKET, supabaseConfigured } from "@/lib/supabase";
import { dateOnlyUTC } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const documents = await prisma.medicalDocument.findMany({
      orderBy: [{ visitDate: "desc" }, { createdAt: "desc" }],
    });
    return ok({ documents, storageConfigured: supabaseConfigured });
  } catch (e) {
    return serverError(e);
  }
}

/** POST multipart/form-data: file, title, category, visitDate?, notes? */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const title = String(form.get("title") || "").trim();
    const category = String(form.get("category") || "Khác").trim();
    const visitDate = form.get("visitDate") ? String(form.get("visitDate")) : null;
    const notes = form.get("notes") ? String(form.get("notes")) : null;

    if (!title) return bad("Thiếu tiêu đề.");
    if (!file || typeof file === "string") return bad("Thiếu tệp đính kèm.");
    if (!supabaseConfigured)
      return bad("Chưa cấu hình Supabase Storage (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).", 501);

    const supabase = getSupabaseAdmin();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `docs/${Date.now()}_${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (upErr) return bad(`Upload thất bại: ${upErr.message}`, 500);

    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    const document = await prisma.medicalDocument.create({
      data: {
        title,
        category,
        fileUrl: pub.publicUrl,
        filePath: path,
        visitDate: visitDate ? dateOnlyUTC(visitDate) : null,
        notes,
      },
    });
    return ok({ document }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
