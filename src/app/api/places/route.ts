import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("places")
    .select("*, category:place_categories(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, address_raw, category_id, address_display, latitude, longitude } = body;

  if (!name?.trim() || !address_raw?.trim()) {
    return NextResponse.json({ error: "장소명과 주소는 필수입니다." }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    name: name.trim(),
    address_raw: address_raw.trim(),
    category_id: category_id || null,
  };
  if (address_display !== undefined) row.address_display = address_display;
  if (latitude !== undefined) row.latitude = latitude;
  if (longitude !== undefined) row.longitude = longitude;

  const { data, error } = await supabase
    .from("places")
    .insert(row)
    .select("*, category:place_categories(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
