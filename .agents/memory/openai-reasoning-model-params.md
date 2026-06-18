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
(`/^(gpt-5|o1|o3|o4)/i`) and omit `temperature` for those. NOTE: the GPT-5
non-reasoning variant `gpt-5.1-chat-latest` ALSO rejects custom temperature
(verified — 400 "Only the default (1) value is supported"), so the broad
`gpt-5`-prefix gate is correct for it too; don't special-case chat-latest back in.

## GPT-5.1 reasoning is too slow for synchronous proxied calls

Measured against this OpenAI account with a ~20k-token grounded prompt: the
`gpt-5.1` **reasoning** model takes >55s even at `reasoning_effort:'low'`, while
`gpt-5.1-chat-latest` returns in ~16s and `gpt-4.1` in ~25s (both non-reasoning).

**Why:** any LLM call made synchronously inside a request that flows through an
upstream proxy/gateway (here the Next→NestJS proxy in front of GraphQL, which
resets at ~42s) will surface as an opaque 500 / `socket hang up` / `ECONNRESET`
if inference exceeds the proxy budget — NOT as a code error. A long reasoning
model is the classic trigger.

**How to apply:** for a synchronous LLM endpoint, default to a fast non-reasoning
flagship (`gpt-5.1-chat-latest`) rather than a reasoning model, even when the user
asks for "best quality" — quality is worthless if it times out. Set the OpenAI
client `timeout` BELOW the known proxy cutoff (e.g. 35s vs a 42s proxy) and
`maxRetries:0` so the app owns the failure with a clear error instead of letting
the proxy reset. If true reasoning quality is required, move the call to a
background job / async pattern instead of blocking the request.
