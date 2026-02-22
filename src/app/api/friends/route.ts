import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const friends = await prisma.friend.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(friends);
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, addressRaw } = body;

  if (!name?.trim() || !addressRaw?.trim()) {
    return NextResponse.json({ error: "이름과 주소는 필수입니다." }, { status: 400 });
  }

  const friend = await prisma.friend.create({
    data: { userId, name: name.trim(), addressRaw: addressRaw.trim() },
  });
  return NextResponse.json(friend, { status: 201 });
}
