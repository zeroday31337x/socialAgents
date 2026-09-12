import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authError, requireContext } from '@/lib/auth/context';

const UpdateInput = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
  name: z.string().min(1).max(120).optional(),
  objective: z.string().min(1).max(2000).optional(),
  instructions: z.string().min(1).max(8000).optional(),
  approvalMode: z.enum(['DRAFT_ONLY', 'APPROVE_EACH', 'CAMPAIGN_APPROVED', 'AUTOPILOT']).optional(),
  timezone: z.string().min(1).optional(),
  intervalMinutes: z.number().int().min(60).max(10080).nullable().optional(),
  platforms: z.array(z.enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'REDDIT', 'LINKEDIN', 'GITHUB'])).min(1).optional()
}).refine((value) => Object.keys(value).length > 0, 'At least one update is required');

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireContext();
    const { id } = await context.params;
    const input = UpdateInput.parse(await request.json());
    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: auth.organizationId }
    });
    if (!existing) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const interval = input.intervalMinutes === undefined ? existing.intervalMinutes : input.intervalMinutes;
    if (input.status === 'ACTIVE' && interval === null) {
      return NextResponse.json({ error: 'Active campaigns require an interval' }, { status: 409 });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { ...input, nextRunAt: input.status === 'ACTIVE' ? new Date() : undefined }
    });
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid campaign update', details: error.flatten() }, { status: 400 });
    }
    const unauthorized = authError(error);
    return NextResponse.json(
      { error: unauthorized ? 'Unauthorized' : 'Unable to update campaign' },
      { status: unauthorized ? 401 : 500 }
    );
  }
}
