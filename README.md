# ZDX Social Agent

A focused multi-tenant agentic social-media management platform.

## Current foundation

- Next.js App Router + TypeScript
- Prisma + PostgreSQL
- Organization, brand, campaign, scheduled post, and usage models
- Provider-neutral model interface
- Ollama-first inference
- OpenAI overflow/fallback
- Initial post-generation API
- Idempotency-ready scheduled post records

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Configure `DATABASE_URL`.
3. Optionally configure Ollama and pull the selected model.
4. Configure `OPENAI_API_KEY` for overflow.
5. Run:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## First API test

```bash
curl -X POST http://localhost:3000/api/agent/generate-post \
  -H 'content-type: application/json' \
  -d '{
    "brandName": "ZeroDriveX",
    "brandDescription": "Security-focused AI and deterministic virtual-machine engineering.",
    "brandVoice": "technical, direct, understated",
    "campaignObjective": "Explain ZDXVM to technical founders.",
    "campaignInstructions": "Focus on deterministic execution and avoid unsupported claims.",
    "platform": "FACEBOOK",
    "recentPosts": []
  }'
```

## Next build passes

1. Authentication and organization onboarding
2. Brand profile and campaign UI
3. Persistent agent conversations
4. Durable scheduler and worker
5. Approval queue
6. Facebook Page OAuth and publisher
7. Stripe subscriptions and publishing-credit enforcement
8. Analytics and campaign learning
