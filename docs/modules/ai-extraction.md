# Module: AI extraction from a photo

**Reference implementation:** TabMath (`src/lib/server/ai-extract.ts`, Gemini).

## Pattern

- Lives in `src/lib/server/` (it holds an API key). Never call a model from the client.
- Downscale and hash the image first (`sharp`); if the hash matches the last
  extraction, return the saved result instead of calling the model again.
- Ask for structured output with a JSON schema, never parse free text.
- Keep an ordered list of models: retry the primary, then fall back to a
  sibling. Model names change; the error usually names the replacement.
- Rate limit only the real model calls (10 per 10 minutes per IP in TabMath),
  after the cache check.
- Set `maxDuration` on the route above the worst-case retry time so it always
  answers instead of being killed mid-retry.
- Messages shown to people live in one module (`receipt-errors.ts`); raw model
  or SDK errors never reach the screen.
- Test the fallback flow with a mocked SDK class (a real `function`, since the
  code calls `new`).

Using Claude instead of Gemini works the same way: the Anthropic SDK in
`src/lib/server/`, a tool or JSON schema for structured output, same caching,
fallback and rate limit.

## Packages

`@google/genai` (or `@anthropic-ai/sdk`), `sharp`. Env: the provider key, server only.
