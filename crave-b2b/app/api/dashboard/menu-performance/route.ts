import { NextResponse } from "next/server";
import { buildMenuPerformanceRows } from "@/lib/dashboard/build-menu-performance";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: restaurant, error: rErr } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 });
  }
  if (!restaurant?.id) {
    return NextResponse.json({ error: "no_restaurant" }, { status: 404 });
  }

  const { rows, error } = await buildMenuPerformanceRows(supabase, restaurant.id);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ rows });
}
