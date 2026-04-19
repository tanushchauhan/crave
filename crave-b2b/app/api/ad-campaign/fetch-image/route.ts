import { NextResponse } from "next/server";

const MAX_BYTES = 20 * 1024 * 1024;

function isAllowedImageUrl(raw: string): { ok: true; url: URL } | { ok: false; message: string } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, message: "Invalid URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, message: "Only http(s) URLs are allowed" };
  }
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  ) {
    return { ok: false, message: "URL not allowed" };
  }
  return { ok: true, url: u };
}

/**
 * Server-side image fetch for ZIP downloads. Browser fetch() to third-party URLs often fails (CORS).
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const urlStr =
    typeof body === "object" && body !== null && "url" in body
      ? String((body as { url?: unknown }).url ?? "")
      : "";
  const checked = isAllowedImageUrl(urlStr.trim());
  if (!checked.ok) {
    return NextResponse.json({ error: "bad_url", message: checked.message }, { status: 400 });
  }

  const res = await fetch(checked.url.toString(), {
    redirect: "follow",
    headers: { Accept: "image/*,*/*" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "upstream", message: `Image request failed (${res.status})` },
      { status: 502 },
    );
  }
  const len = res.headers.get("content-length");
  if (len && Number.parseInt(len, 10) > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const type = res.headers.get("content-type") ?? "application/octet-stream";
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, no-store",
    },
  });
}
