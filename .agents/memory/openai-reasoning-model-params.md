---
name: OpenAI reasoning-model params
description: GPT-5 family and o-series reasoning models reject custom temperature in chat.completions; detect by model-id prefix before adding sampling params.
---

# OpenAI reasoning-model parameters

The GPT-5 family (`gpt-5`, `gpt-5.1`, `gpt-5-pro`, etc.) and the o-series
(`o1`/`o3`/`o4`) reasoning models only accept the **default** `temperature` (1)
on the chat.completions API. Passing any custom `temperature` returns a 400.

**Why:** these are reasoning models; OpenAI disallows sampling-param overrides on
them. Code that hard-codes `temperature: 0.7` (fine for gpt-4o/gpt-4.1) breaks the
moment the model is switched to a GPT-5/o-series id via an env override.

**How to apply:** when a model is configurable (e.g. an env var like
`SEO_DRAFT_MODEL`), gate sampling params on a prefix check
(`/^(gpt-5|o1|o3|o4)/i`) and omit `temperature` for those. The chat models'
non-reasoning variants (`*-chat-latest`) do accept temperature, but prefix-gating
to the safe behaviour is the simplest robust default.
