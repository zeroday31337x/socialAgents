import { prisma } from '@/lib/db';

export async function assertPostCapacity(organizationId: string, requested = 1) {
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { dailyPostLimit: true, subscriptionEnds: true }
  });

  if (organization.subscriptionEnds && organization.subscriptionEnds < new Date()) {
    throw new Error('SUBSCRIPTION_INACTIVE');
  }

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const usage = await prisma.usageLedger.aggregate({
    where: {
      organizationId,
      kind: 'PUBLISHED_POST',
      createdAt: { gte: start }
    },
    _sum: { quantity: true }
  });

  const used = usage._sum.quantity ?? 0;
  if (used + requested > organization.dailyPostLimit) {
    throw new Error('DAILY_POST_LIMIT_REACHED');
  }

  return { used, limit: organization.dailyPostLimit, remaining: organization.dailyPostLimit - used };
}

export async function recordPublishedPost(organizationId: string, postId: string) {
  return prisma.usageLedger.create({
    data: {
      organizationId,
      kind: 'PUBLISHED_POST',
      quantity: 1,
      metadata: { postId }
    }
  });
}
