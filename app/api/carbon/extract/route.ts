import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromBuffer } from "@/lib/gemini/extract-text";
import { extractCarbonFromDocument, fetchMasterData, validateExtractionEntries } from "@/lib/gemini/carbon-extaction";
import { friendlyGeminiError } from "@/lib/gemini/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordOpsEvent } from "@/lib/ops/events";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`gemini:carbon-extract:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Tunggu beberapa saat sebelum mencoba lagi." },
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
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("document") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "File kosong" }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Ukuran file maksimal 50 MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "doc", "docx", "txt"].includes(ext)) {
    return NextResponse.json(
      { error: "Format tidak didukung. Gunakan PDF, Word, atau TXT." },
      { status: 400 }
    );
  }

  try {
    // 1. Extract text from file
    const buffer = await file.arrayBuffer();
    const documentText = await extractTextFromBuffer(buffer, file.name);

    if (!documentText || documentText.trim().length < 100) {
      return NextResponse.json(
        { error: "Tidak dapat membaca teks dari dokumen" },
        { status: 422 }
      );
    }

    // 2. Fetch master data
    const masterData = await fetchMasterData();

    // 3. Extract with Gemini
    const result = await extractCarbonFromDocument(documentText, masterData);

    // 4. Validasi semantik output sebelum dikembalikan ke klien
    const validationError = validateExtractionEntries(result.entries, masterData);
    if (validationError) {
      await recordOpsEvent({
        kind: "gemini",
        level: "warn",
        message: `Ekstraksi tidak valid: ${validationError}`,
        source: "api/carbon/extract",
        metadata: { userId: user.id },
      });
      return NextResponse.json({ error: validationError }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      entries: result.entries,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await recordOpsEvent({
      kind: "gemini",
      level: "error",
      message,
      source: "api/carbon/extract",
      metadata: { userId: user.id },
    });
    return NextResponse.json(
      { error: friendlyGeminiError(err) },
      { status: 500 }
    );
  }
}