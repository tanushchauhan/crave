import type { Metadata } from "next";
import { AskCraveExperience } from "@/components/crave-assistant/ask-crave-experience";

export const metadata: Metadata = {
  title: "Ask Crave",
};

type AskPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function CraveAskPage({ searchParams }: AskPageProps) {
  const sp = await searchParams;
  const raw = sp.q;
  const initialPrompt =
    typeof raw === "string" ? raw : Array.isArray(raw) ? (raw[0] ?? "") : "";

  return (
    <AskCraveExperience
      key={initialPrompt.trim() || "prechat"}
      initialPrompt={initialPrompt}
    />
  );
}