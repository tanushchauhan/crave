import type { Metadata } from "next";
import { MenuManagementView } from "@/components/menu-management/menu-management-view";

export const metadata: Metadata = {
  title: "Menu Management",
};

export default function MenuManagementPage() {
  return <MenuManagementView />;
}
