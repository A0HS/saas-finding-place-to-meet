import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, addressRaw, addressDisplay, categoryId, latitude, longitude } = body;

  // Verify ownership
  const existing = await prisma.place.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (addressRaw !== undefined) data.addressRaw = addressRaw.trim();
  if (addressDisplay !== undefined) data.addressDisplay = addressDisplay;
  if (categoryId !== undefined) data.categoryId = categoryId || null;
  if (latitude !== undefined) data.latitude = latitude;
  if (longitude !== undefined) data.longitude = longitude;

  const place = await prisma.place.update({
    where: { id },
    data,
    include: { category: true },
  });
  return NextResponse.json(place);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.place.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.place.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
