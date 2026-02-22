import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const places = await prisma.place.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(places);
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, addressRaw, categoryId } = body;

  if (!name?.trim() || !addressRaw?.trim()) {
    return NextResponse.json({ error: "장소명과 주소는 필수입니다." }, { status: 400 });
  }

  const place = await prisma.place.create({
    data: {
      userId,
      name: name.trim(),
      addressRaw: addressRaw.trim(),
      categoryId: categoryId || null,
    },
    include: { category: true },
  });
  return NextResponse.json(place, { status: 201 });
}
