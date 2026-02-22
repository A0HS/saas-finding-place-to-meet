import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
      const friendCount = await prisma.friend.count({ where: { userId } });
      if (friendCount === 0) {
        await prisma.friend.createMany({
          data: DUMMY_FRIENDS.map((f) => ({
            userId,
            name: f.name,
            addressRaw: f.addressRaw,
            addressDisplay: f.addressDisplay,
            latitude: f.latitude,
            longitude: f.longitude,
          })),
        });
        for (const p of DUMMY_PLACES) {
          await prisma.place.create({
            data: {
              userId,
              name: p.name,
              addressRaw: p.addressRaw,
              addressDisplay: p.addressDisplay,
              latitude: p.latitude,
              longitude: p.longitude,
              categoryId: null,
            },
          });
        }
      }
    }
  }

  return NextResponse.redirect(origin);
}
