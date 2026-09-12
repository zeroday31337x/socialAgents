import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { generatePost } from '@/lib/agent/generate-post';
import { authError, requireContext } from '@/lib/auth/context';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await requireContext();
    const body = await request.json();
    const result = await generatePost(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 }
      );
    }

    if (authError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Post generation failed', error);
    return NextResponse.json({ error: 'Post generation failed' }, { status: 500 });
  }
}
