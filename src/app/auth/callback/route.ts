import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DUMMY_FRIENDS, DUMMY_PLACES } from "@/lib/dummyData";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Seed dummy data for new users
    if (data?.user) {
      const userId = data.user.id;

      const { count } = await supabase
        .from("friends")
        .select("*", { count: "exact", head: true });

      if (!count || count === 0) {
        await supabase.from("friends").insert(
          DUMMY_FRIENDS.map((f) => ({
            user_id: userId,
            name: f.name,
            address_raw: f.address_raw,
            address_display: f.address_display,
            latitude: f.latitude,
            longitude: f.longitude,
          }))
        );

        await supabase.from("places").insert(
          DUMMY_PLACES.map((p) => ({
            user_id: userId,
            name: p.name,
            address_raw: p.address_raw,
            address_display: p.address_display,
            latitude: p.latitude,
            longitude: p.longitude,
            category_id: null,
          }))
        );
      }
    }
  }

  return NextResponse.redirect(origin);
}
