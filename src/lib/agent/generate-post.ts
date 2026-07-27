import { z } from 'zod';
import { ModelRouter } from '@/lib/models/router';

export const GeneratePostInput = z.object({
  brandName: z.string().min(1),
  brandDescription: z.string().min(1),
  brandVoice: z.string().optional(),
  campaignObjective: z.string().min(1),
  campaignInstructions: z.string().min(1),
  platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'REDDIT', 'LINKEDIN']),
  recentPosts: z.array(z.string()).max(30).default([])
});

export type GeneratePostInput = z.infer<typeof GeneratePostInput>;

export async function generatePost(rawInput: GeneratePostInput) {
  const input = GeneratePostInput.parse(rawInput);
  const router = new ModelRouter();

  const system = [
    'You are a production social-media campaign agent.',
    'Write truthful, original content grounded only in the supplied brand information.',
    'Do not invent product capabilities, customers, metrics, partnerships, or releases.',
    'Make the content native to the requested platform.',
    'Avoid repeating the recent posts or merely paraphrasing them.',
    'Return only the final post text.'
  ].join(' ');

  const prompt = `
Brand: ${input.brandName}
Brand description: ${input.brandDescription}
Brand voice: ${input.brandVoice ?? 'clear, credible, direct'}
Campaign objective: ${input.campaignObjective}
Campaign instructions: ${input.campaignInstructions}
Platform: ${input.platform}

Recent posts to avoid repeating:
${input.recentPosts.length ? input.recentPosts.map((p, i) => `${i + 1}. ${p}`).join('\n') : 'None'}

Generate one platform-native post now.
`.trim();

  return router.generate({
    task: 'post-generation',
    system,
    prompt,
    temperature: 0.8,
    maxOutputTokens: 700
  });
}
