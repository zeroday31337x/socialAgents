import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authError, requireContext } from '@/lib/auth/context';

const BrandInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(4000),
  voice: z.string().max(2000).nullable().optional(),
  audience: z.string().max(2000).nullable().optional(),
  prohibited: z.string().max(4000).nullable().optional(),
  sourceUrls: z.array(z.string().url()).max(25).default([])
});

export async function GET() {
  try {
    const context = await requireContext();
    const brands = await prisma.brandProfile.findMany({
      where: { organizationId: context.organizationId },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ brands });
  } catch (error) {
    const unauthorized = authError(error);
    return NextResponse.json(
      { error: unauthorized ? 'Unauthorized' : 'Unable to load brands' },
      { status: unauthorized ? 401 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireContext();
    const input = BrandInput.parse(await request.json());
    const brand = await prisma.brandProfile.create({
      data: { ...input, organizationId: context.organizationId }
    });
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid brand', details: error.flatten() }, { status: 400 });
    }
    const unauthorized = authError(error);
    return NextResponse.json(
      { error: unauthorized ? 'Unauthorized' : 'Unable to create brand' },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
