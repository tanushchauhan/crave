import { supabase } from "@/lib/supabase";

function craveApiBase(): string | null {
    const raw = process.env.EXPO_PUBLIC_CRAVE_API_BASE?.trim();
    if (!raw) return null;
    return raw.replace(/\/$/, "");
}

type SignedUrlResponse = {
    put_url: string;
    headers?: { "Content-Type"?: string };
    error?: string;
    message?: string;
};

function normalizeReceiptContentType(mime: string | null | undefined): string {
    const m = (mime ?? "image/jpeg").split(";")[0]!.trim().toLowerCase();
    if (m === "image/jpg" || m === "image/jpeg") return "image/jpeg";
    if (m === "image/png") return "image/png";
    if (m === "image/webp") return "image/webp";
    throw new Error("Receipt upload supports JPEG, PNG, or WebP only.");
}

/**
 * Presigned S3 PUT from crave-bedrock-proxy (docs/client-env.md), then upload bytes.
 * Triggers receipt OCR pipeline on S3 (infra/aws/lambdas/receipt-ocr).
 */
export async function uploadReceiptImageForBooking(input: {
    bookingId: string;
    localFileUri: string;
    mimeType?: string | null;
}): Promise<void> {
    const base = craveApiBase();
    if (!base) {
        throw new Error(
            "Receipt upload is not configured. Set EXPO_PUBLIC_CRAVE_API_BASE to your API Gateway URL.",
        );
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
        throw new Error("Sign in to upload a receipt.");
    }

    const contentType = normalizeReceiptContentType(input.mimeType);

    const signedRes = await fetch(`${base}/receipts/signed-url`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            booking_id: input.bookingId,
            content_type: contentType,
        }),
    });

    const signedText = await signedRes.text();
    let signedJson: SignedUrlResponse;
    try {
        signedJson = JSON.parse(signedText) as SignedUrlResponse;
    } catch {
        throw new Error(
            signedText.trim().slice(0, 200) || `Signed URL failed (${signedRes.status})`,
        );
    }

    if (!signedRes.ok) {
        const msg =
            typeof signedJson.error === "string"
                ? signedJson.error
                : typeof signedJson.message === "string"
                  ? signedJson.message
                  : signedText.trim().slice(0, 200);
        throw new Error(msg || `Signed URL failed (${signedRes.status})`);
    }

    const putUrl = signedJson.put_url;
    if (!putUrl) {
        throw new Error("Signed URL response missing put_url.");
    }

    const uploadHeaders: Record<string, string> = {
        "Content-Type": signedJson.headers?.["Content-Type"] ?? contentType,
    };

    const fileRes = await fetch(input.localFileUri);
    if (!fileRes.ok) {
        throw new Error("Could not read the selected file.");
    }
    const blob = await fileRes.blob();

    const putRes = await fetch(putUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: blob,
    });
    if (!putRes.ok) {
        const t = (await putRes.text()).trim().slice(0, 200);
        throw new Error(t || `Upload failed (${putRes.status})`);
    }
}
