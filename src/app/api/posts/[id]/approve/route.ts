import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authError, requireContext } from '@/lib/auth/context';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireContext();
    const { id } = await context.params;

    const post = await prisma.scheduledPost.findFirst({
      where: { id, organizationId: auth.organizationId }
    });

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (!['DRAFT', 'AWAITING_APPROVAL', 'FAILED'].includes(post.status)) {
      return NextResponse.json({ error: 'Post cannot be approved from its current state' }, { status: 409 });
    }

    const approved = await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: 'SCHEDULED',
        approvedAt: new Date(),
        scheduledFor: post.scheduledFor ?? new Date(),
        errorCode: null,
        errorMessage: null
      }
    });

    return NextResponse.json({ post: approved });
  } catch (error) {
    return NextResponse.json(
      { error: authError(error) ? 'Unauthorized' : 'Unable to approve post' },
      { status: authError(error) ? 401 : 500 }
    );
  }
}
