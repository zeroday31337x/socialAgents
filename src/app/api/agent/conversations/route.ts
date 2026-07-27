import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authError, requireContext } from '@/lib/auth/context';
import { ModelRouter } from '@/lib/models/router';

const Input = z.object({
  conversationId: z.string().optional(),
  campaignId: z.string().optional(),
  message: z.string().min(1).max(12000)
});

export async function POST(request: Request) {
  try {
    const context = await requireContext();
    const input = Input.parse(await request.json());

    const conversation = input.conversationId
      ? await prisma.agentConversation.findFirst({
          where: { id: input.conversationId, organizationId: context.organizationId }
        })
      : await prisma.agentConversation.create({
          data: {
            organizationId: context.organizationId,
            campaignId: input.campaignId,
            title: input.message.slice(0, 80)
          }
        });

    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    await prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        userId: context.userId,
        role: 'USER',
        content: input.message
      }
    });

    const history = await prisma.agentMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const campaign = conversation.campaignId
      ? await prisma.campaign.findFirst({
          where: { id: conversation.campaignId, organizationId: context.organizationId },
          include: { brand: true }
        })
      : null;

    const router = new ModelRouter();
    const result = await router.generate({
      task: 'intent',
      system: [
        'You are the control agent for a social-media campaign platform.',
        'Help the user define brands, campaigns, schedules, platforms, approval modes, and post instructions.',
        'Never claim an external account is connected or a post was published unless the supplied context confirms it.',
        'Give precise operational responses and identify any configuration still required.'
      ].join(' '),
      prompt: [
        campaign ? `Campaign: ${campaign.name}\nBrand: ${campaign.brand.name}\nObjective: ${campaign.objective}\nInstructions: ${campaign.instructions}` : 'No campaign is attached.',
        'Recent conversation:',
        ...history.reverse().map((item) => `${item.role}: ${item.content}`),
        `USER: ${input.message}`
      ].join('\n'),
      temperature: 0.4,
      maxOutputTokens: 900
    });

    const assistant = await prisma.agentMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: result.text,
        metadata: { provider: result.provider, model: result.model, latencyMs: result.latencyMs }
      }
    });

    return NextResponse.json({ conversationId: conversation.id, message: assistant });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Invalid message', details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: authError(error) ? 'Unauthorized' : 'Agent request failed' }, { status: authError(error) ? 401 : 500 });
  }
}
