import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generatePost } from '@/lib/agent/generate-post';

export const runtime = 'nodejs';
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: 'ACTIVE',
      intervalMinutes: { not: null },
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }]
    },
    include: { brand: true },
    take: 10,
    orderBy: { nextRunAt: 'asc' }
  });

  let created = 0;
  const failures: Array<{ campaignId: string; error: string }> = [];

  for (const campaign of campaigns) {
    try {
      const recent = await prisma.scheduledPost.findMany({
        where: { campaignId: campaign.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { body: true }
      });

      for (const platform of campaign.platforms) {
        const result = await generatePost({
          brandName: campaign.brand.name,
          brandDescription: campaign.brand.description,
          brandVoice: campaign.brand.voice ?? undefined,
          campaignObjective: campaign.objective,
          campaignInstructions: campaign.instructions,
          platform,
          recentPosts: recent.map((post) => post.body)
        });

        const status = campaign.approvalMode === 'AUTOPILOT' || campaign.approvalMode === 'CAMPAIGN_APPROVED'
          ? 'SCHEDULED'
          : campaign.approvalMode === 'DRAFT_ONLY'
            ? 'DRAFT'
            : 'AWAITING_APPROVAL';

        await prisma.scheduledPost.create({
          data: {
            organizationId: campaign.organizationId,
            campaignId: campaign.id,
            platform,
            status,
            body: result.text,
            scheduledFor: status === 'SCHEDULED' ? now : null,
            idempotencyKey: `${campaign.id}:${platform}:${now.toISOString()}`,
            modelProvider: result.provider,
            modelName: result.model,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens
          }
        });
        created += 1;
      }

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { nextRunAt: new Date(now.getTime() + (campaign.intervalMinutes ?? 180) * 60_000) }
      });
    } catch (error) {
      failures.push({ campaignId: campaign.id, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return NextResponse.json({ processed: campaigns.length, created, failures });
}
