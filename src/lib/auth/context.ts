import { headers } from 'next/headers';
import { prisma } from '@/lib/db';

export type RequestContext = {
  userId: string;
  organizationId: string;
  role: string;
};

export async function requireContext(): Promise<RequestContext> {
  const h = await headers();
  const externalAuthId = h.get('x-user-id') ?? h.get('x-auth-user-id');
  const email = h.get('x-user-email');

  if (!externalAuthId || !email) {
    if (process.env.AUTH_DEV_BYPASS !== 'true') {
      throw new Error('UNAUTHENTICATED');
    }

    return bootstrapUser('dev-user', process.env.AUTH_DEV_EMAIL ?? 'dev@localhost');
  }

  return bootstrapUser(externalAuthId, email);
}

async function bootstrapUser(externalAuthId: string, email: string): Promise<RequestContext> {
  const existing = await prisma.user.findUnique({
    where: { externalAuthId },
    include: { memberships: { take: 1 } }
  });

  if (existing?.memberships[0]) {
    return {
      userId: existing.id,
      organizationId: existing.memberships[0].organizationId,
      role: existing.memberships[0].role
    };
  }

  const slugBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

  const created = await prisma.user.create({
    data: {
      externalAuthId,
      email,
      memberships: {
        create: {
          role: 'OWNER',
          organization: { create: { name: `${email}'s workspace`, slug } }
        }
      }
    },
    include: { memberships: true }
  });

  return {
    userId: created.id,
    organizationId: created.memberships[0].organizationId,
    role: created.memberships[0].role
  };
}

export function authError(error: unknown) {
  return error instanceof Error && error.message === 'UNAUTHENTICATED';
}
