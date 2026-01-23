// src/app/api/user/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    // ရှိပြီးသား User လား အရင်စစ်မယ် (Login Logic)
    let user = await prisma.user.findUnique({
      where: { username },
    });

    // မရှိသေးရင် အသစ်ဆောက်မယ် (Register Logic)
    if (!user) {
      user = await prisma.user.create({
        data: { username, points: 0 },
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}