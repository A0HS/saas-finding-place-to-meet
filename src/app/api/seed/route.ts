import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DUMMY_FRIENDS, DUMMY_PLACES } from "@/lib/dummyData";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user already has data
  const { count } = await supabase
    .from("friends")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    return NextResponse.json({ seeded: false, message: "Data already exists" });
  }

  // Seed dummy friends
  await supabase.from("friends").insert(
    DUMMY_FRIENDS.map((f) => ({
      user_id: user.id,
      name: f.name,
      address_raw: f.address_raw,
      address_display: f.address_display,
      latitude: f.latitude,
      longitude: f.longitude,
    }))
  );

  // Seed dummy places
  await supabase.from("places").insert(
    DUMMY_PLACES.map((p) => ({
      user_id: user.id,
      name: p.name,
      address_raw: p.address_raw,
      address_display: p.address_display,
      latitude: p.latitude,
      longitude: p.longitude,
      category_id: null,
    }))
  );

  return NextResponse.json({ seeded: true });
}
