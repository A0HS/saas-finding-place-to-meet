import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("place_categories")
    .select("*, places(count)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Transform { places: [{ count: N }] } → { places_count: N }
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const categories = (data || []).map(({ places, ...rest }: any) => ({
    ...rest,
    places_count: places?.[0]?.count ?? 0,
  }));
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "카테고리명은 필수입니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("place_categories")
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
