import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCarbonFromPrompt, fetchMasterData, validateExtractionEntries } from "@/lib/gemini/carbon-extaction";
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

  const rl = await checkRateLimit(`gemini:carbon-prompt:${user.id}`, 5, 60_000);
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

  const body = await request.json();
  const { text } = body as { text?: string };

  if (!text || text.trim().length < 10) {
    return NextResponse.json(
      { error: "Teks terlalu pendek" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch master data
    const masterData = await fetchMasterData();

    // 2. Parse with Gemini
    const result = await parseCarbonFromPrompt(text, masterData);

    // 3. Validasi semantik output sebelum dikembalikan ke klien
    const validationError = validateExtractionEntries(result.entries, masterData);
    if (validationError) {
      await recordOpsEvent({
        kind: "gemini",
        level: "warn",
        message: `Parsing tidak valid: ${validationError}`,
        source: "api/carbon/prompt",
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
      source: "api/carbon/prompt",
      metadata: { userId: user.id },
    });
    return NextResponse.json(
      { error: friendlyGeminiError(err) },
      { status: 500 }
    );
  }
}