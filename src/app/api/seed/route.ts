import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { DUMMY_FRIENDS, DUMMY_PLACES } from "@/lib/dummyData";

export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user already has data
  const friendCount = await prisma.friend.count({ where: { userId } });
  if (friendCount > 0) {
    return NextResponse.json({ seeded: false, message: "Data already exists" });
  }

  // Seed dummy friends
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

  // Seed dummy places
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

  return NextResponse.json({ seeded: true });
}
