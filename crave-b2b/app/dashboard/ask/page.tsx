import type { Metadata } from "next";
import { AskCraveExperience } from "@/components/crave-assistant/ask-crave-experience";

export const metadata: Metadata = {
  title: "Ask Crave",
};

export default function CraveAskPage() {
  return <AskCraveExperience />;
}