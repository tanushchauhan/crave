import { NextResponse } from "next/server";
import { fetchMergedLiveRows } from "@/lib/dashboard/live-rows";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const beforeMsRaw = searchParams.get("before_ms");
  const beforeMs =
    beforeMsRaw !== null && beforeMsRaw !== "" ? Number.parseInt(beforeMsRaw, 10) : undefined;
  const limitRaw = searchParams.get("limit");
  const mergedCap = limitRaw ? Math.min(80, Math.max(1, Number.parseInt(limitRaw, 10))) : 30;
  const perTable = Math.min(60, mergedCap + 20);

  if (beforeMs !== undefined && !Number.isFinite(beforeMs)) {
    return NextResponse.json({ error: "invalid_before_ms" }, { status: 400 });
  }

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

  const { rows, bookingsError, ordersError } = await fetchMergedLiveRows(supabase, restaurant.id, {
    perTableLimit: perTable,
    beforeMs: Number.isFinite(beforeMs) ? beforeMs : undefined,
    maxMerged: mergedCap,
  });

  if (bookingsError || ordersError) {
    return NextResponse.json(
      { error: bookingsError || ordersError },
      { status: 500 },
    );
  }

  return NextResponse.json({ rows });
}
