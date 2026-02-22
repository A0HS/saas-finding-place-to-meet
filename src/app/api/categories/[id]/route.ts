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
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "카테고리명은 필수입니다." }, { status: 400 });
  }

  // Verify ownership
  const existing = await prisma.placeCategory.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const category = await prisma.placeCategory.update({
    where: { id },
    data: { name: name.trim() },
  });
  return NextResponse.json(category);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.placeCategory.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const placeCount = await prisma.place.count({ where: { categoryId: id, userId } });
  if (placeCount > 0) {
    return NextResponse.json(
      { error: `이 카테고리를 사용하는 장소가 ${placeCount}개 있습니다. 먼저 해당 장소의 카테고리를 변경해주세요.` },
      { status: 400 }
    );
  }

  await prisma.placeCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
