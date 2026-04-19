import { DashboardHomeExperience } from "@/components/dashboard/dashboard-home-experience";
import { loadDashboardData } from "@/lib/dashboard/load-dashboard-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const data = await loadDashboardData(supabase);

  return <DashboardHomeExperience {...data} />;
}
