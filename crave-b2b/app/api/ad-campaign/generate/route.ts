import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  AD_MAX_INPUT_BYTES,
  AD_MAX_INPUT_IMAGES,
} from "@/lib/ad-campaign/constants";

export const maxDuration = 120;

function resolveAdGenerateUrl(): string | null {
  const full = process.env.CRAVE_AD_GENERATE_URL?.trim();
  if (full) return full;
  const base = process.env.CRAVE_AWS_API_BASE?.trim().replace(/\/$/, "");
  if (!base) return null;
  return `${base}/ads/generate`;
}

function sanitizeImages(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const out: string[] = [];
  let totalApprox = 0;
  for (let i = 0; i < raw.length; i++) {
    if (out.length >= AD_MAX_INPUT_IMAGES) break;
    const s = raw[i];
    if (typeof s !== "string") continue;
    const t = s.trim();
    if (!t) continue;
    const approx = Math.floor((t.length * 3) / 4);
    totalApprox += approx;
    if (totalApprox > AD_MAX_INPUT_BYTES) return null;
    out.push(t);
  }
  return out;
}

export async function POST(req: Request) {
  const url = resolveAdGenerateUrl();
  if (!url) {
    return NextResponse.json(
      { error: "server_misconfigured", message: "Set CRAVE_AWS_API_BASE or CRAVE_AD_GENERATE_URL." },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt_required" }, { status: 400 });
  }

  const images = sanitizeImages(body.images);
  if (images === null) {
    return NextResponse.json(
      {
        error: "images_invalid",
        message: `Send images as base64 strings (max ${AD_MAX_INPUT_IMAGES} images, ${AD_MAX_INPUT_BYTES} bytes total).`,
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, images }),
  });

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
