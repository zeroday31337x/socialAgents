import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authError, requireContext } from '@/lib/auth/context';

const CampaignInput = z.object({
  brandId: z.string().min(1),
  name: z.string().min(1).max(120),
  objective: z.string().min(1).max(2000),
  instructions: z.string().min(1).max(8000),
  approvalMode: z.enum(['DRAFT_ONLY', 'APPROVE_EACH', 'CAMPAIGN_APPROVED', 'AUTOPILOT']).default('APPROVE_EACH'),
  timezone: z.string().min(1).default('America/Toronto'),
  intervalMinutes: z.number().int().min(60).max(10080).nullable().default(null),
  platforms: z.array(z.enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'REDDIT', 'LINKEDIN', 'GITHUB'])).min(1)
});

export async function GET() {
  try {
    const context = await requireContext();
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: context.organizationId },
      include: { brand: true, _count: { select: { posts: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json({ error: authError(error) ? 'Unauthorized' : 'Unable to load campaigns' }, { status: authError(error) ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireContext();
    const input = CampaignInput.parse(await request.json());
    const brand = await prisma.brandProfile.findFirst({
      where: { id: input.brandId, organizationId: context.organizationId },
      select: { id: true }
    });
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });

    const campaign = await prisma.campaign.create({
      data: {
        ...input,
        organizationId: context.organizationId,
        status: 'DRAFT'
      }
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid campaign', details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: authError(error) ? 'Unauthorized' : 'Unable to create campaign' }, { status: authError(error) ? 401 : 500 });
  }
}
