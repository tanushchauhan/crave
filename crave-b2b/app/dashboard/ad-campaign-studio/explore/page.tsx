import type { Metadata } from "next";
import { ExploreYourOptionsView } from "@/components/explore-your-options/explore-your-options-view";

export const metadata: Metadata = {
  title: "Explore your options",
};

export default function ExploreYourOptionsPage() {
  return <ExploreYourOptionsView />;
}
