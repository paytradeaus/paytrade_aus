---
name: OpenAI/external client guarded init
description: Why OpenAI clients must be constructed guarded/nullable, never eagerly in a NestJS provider constructor
---

# OpenAI (and similar SDK) clients must be constructed guarded, not eagerly

**Rule:** never do `this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })`
unconditionally in a NestJS provider constructor. Guard it:
```ts
private openai: OpenAI | null = null;
constructor() {
  if (process.env.OPENAI_API_KEY) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    this.logger.warn('OPENAI_API_KEY not set — <feature> will refuse to run.');
  }
}
```
and have the call site throw on `!this.openai`.

**Why:** the OpenAI v4 SDK constructor THROWS when `apiKey` is missing/empty. A
provider is instantiated during module init, so an unguarded throw crashes the
ENTIRE Nest app at boot. On Railway this surfaces only as a failed deploy
healthcheck ("backend never became healthy / 1/1 replicas never became healthy")
— the build passes, the container starts, then the backend dies before binding,
so `/health` (proxied from the frontend to the backend) never responds. The dev
environment hides it because the key is always present there.

**How to apply:** every existing OpenAI service in this repo already guards this
way — ai-support.service.ts, community-bot.service.ts, ai-chat/llm/openai.llm-provider.ts.
Mirror them for any NEW service that holds an OpenAI (or any throw-on-missing-key
SDK) client. Same caution for any other external-SDK client whose constructor can
throw on a missing prod env var.
