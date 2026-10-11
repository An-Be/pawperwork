# Module: photo uploads with Uploadthing

**Reference implementation:** TabMath receipt photos.

## Files to bring over

- `src/app/api/uploadthing/core.ts` and `route.ts`: the file router. The
  middleware resolves the actor and rate limits by IP before any upload.
- `src/lib/uploadthing.ts`: the typed `useUploadThing` hook for client code.
- The uploader component pattern in `src/components/splits/receipt-uploader.tsx`:
  `<input type="file" accept="image/*" capture="environment">` opens the phone's
  camera app, so `Permissions-Policy: camera=()` stays on.

## CSP entries (`src/config/csp.ts`)

```ts
"connect-src": ["https://*.ingest.uploadthing.com", "https://api.uploadthing.com", "https://*.ufs.sh", "https://utfs.io"],
"img-src": ["https://*.ufs.sh", "https://utfs.io"],
```

## If the server fetches an uploaded file

Only fetch URLs on Uploadthing's file hosts and refuse redirects. Copy
`src/lib/receipt-url.ts` (`isUploadthingFileUrl`) and its tests. Fetching a
client-supplied URL without this is a server-side request forgery hole.

## Packages

`uploadthing`, `@uploadthing/react`. Env: `UPLOADTHING_TOKEN`.
