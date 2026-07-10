import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin, STORAGE_BUCKET, supabaseConfigured } from "@/lib/supabase";
import { dateOnlyUTC } from "@/lib/time";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const document = await prisma.medicalDocument.update({
      where: { id },
      data: {
        ...(b.title !== undefined && { title: String(b.title) }),
        ...(b.category !== undefined && { category: String(b.category) }),
        ...(b.visitDate !== undefined && {
          visitDate: b.visitDate ? dateOnlyUTC(String(b.visitDate)) : null,
        }),
        ...(b.notes !== undefined && { notes: b.notes ? String(b.notes) : null }),
      },
    });
    return ok({ document });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const doc = await prisma.medicalDocument.findUnique({ where: { id } });
    if (doc && supabaseConfigured) {
      try {
        const pathsToDelete = [...(doc.filePaths || [])];
        if (doc.filePath && !pathsToDelete.includes(doc.filePath)) {
          pathsToDelete.push(doc.filePath);
        }
        
        if (pathsToDelete.length > 0) {
          await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove(pathsToDelete);
        }
      } catch {
        /* bỏ qua lỗi xóa file, vẫn xóa bản ghi */
      }
    }
    await prisma.medicalDocument.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
