// src/app/api/collect/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { userId, pointsToAdd, itemName } = await req.json();

    const result = await prisma.$transaction([
      // ၁။ User ရဲ့ Point ကို တိုးမယ်
      prisma.user.update({
        where: { id: userId },
        data: { points: { increment: pointsToAdd } },
      }),
      // ၂။ Item အသစ်ကို Inventory ထဲ ထည့်မယ်
      prisma.item.create({
        data: {
          name: itemName,
          type: "Common",
          userId: userId,
        },
      }),
    ]);

    return NextResponse.json({ success: true, points: result[0].points });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}