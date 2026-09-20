import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "txt"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`compliance:presign:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error:
          "Terlalu banyak permintaan. Tunggu beberapa saat sebelum mencoba lagi.",
      },
      { status: 429 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "company" || !profile.company_id) {
    return NextResponse.json(
      { error: "Akun tidak terkait dengan perusahaan" },
      { status: 403 },
    );
  }

  let body: { fileName?: unknown; fileSize?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;

  if (!fileName) {
    return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Format tidak didukung. Gunakan PDF, Word, atau TXT." },
      { status: 400 },
    );
  }

  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Ukuran file maksimal 50 MB" },
      { status: 400 },
    );
  }

  const safeName = fileName.replace(/[\\/]/g, "_");
  const path = `${user.id}/${Date.now()}_${safeName}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("company-docs")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: `Gagal menyiapkan upload: ${error?.message ?? "error"}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path: data.path });
}