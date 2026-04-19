import type { Metadata } from "next";
import { AdCampaignStudioView } from "@/components/ad-campaign-studio/ad-campaign-studio-view";

export const metadata: Metadata = {
  title: "Ad Campaign Studio",
};

export default function AdCampaignStudioPage() {
  return <AdCampaignStudioView />;
}
