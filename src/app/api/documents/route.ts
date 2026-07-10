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

/** POST multipart/form-data: files, title, category, visitDate?, notes? */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    const title = String(form.get("title") || "").trim();
    const category = String(form.get("category") || "Khác").trim();
    const visitDate = form.get("visitDate") ? String(form.get("visitDate")) : null;
    const notes = form.get("notes") ? String(form.get("notes")) : null;

    if (!title) return bad("Thiếu tiêu đề.");
    
    // Backward compatible with old single 'file' input just in case
    const singleFile = form.get("file") as File | null;
    const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);
    
    if (allFiles.length === 0 || allFiles.some(f => typeof f === "string")) {
      return bad("Thiếu tệp đính kèm.");
    }
    
    if (!supabaseConfigured)
      return bad("Chưa cấu hình Supabase Storage (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).", 501);

    const supabase = getSupabaseAdmin();
    
    const fileUrls: string[] = [];
    const filePaths: string[] = [];

    // Upload files concurrently
    await Promise.all(
      allFiles.map(async (file) => {
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `docs/${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, buffer, {
            contentType: file.type || "application/octet-stream",
            upsert: false,
          });
        
        if (upErr) throw new Error(`Upload thất bại: ${upErr.message}`);

        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        fileUrls.push(pub.publicUrl);
        filePaths.push(path);
      })
    );

    const document = await prisma.medicalDocument.create({
      data: {
        title,
        category,
        fileUrl: fileUrls[0], // fallback for old UI
        filePath: filePaths[0],
        fileUrls,
        filePaths,
        visitDate: visitDate ? dateOnlyUTC(visitDate) : null,
        notes,
      },
    });
    return ok({ document }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
