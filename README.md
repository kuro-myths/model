# Kuro Model Lab

Web studio for AI image generation through Max Router and 2D puppet auto-rigging with Iki.

## Stack
- Vite + React
- Iki: `@ikijs/editor`, `@ikijs/engine`, `@ikijs/format`
- PSD import: `ag-psd`
- Supabase Auth + PostgreSQL model library
- Max Router image-generation endpoint

## Required Vercel environment variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `MAX_ROUTER_BASE_URL` (defaults to https://max-router.vercel.app)

The Max Router API key is entered in Settings and kept only in the current browser session. It is sent to the serverless proxy and never written into the repository or database.

## Rigging input
Iki auto-rigging needs role-named transparent PNG layers or one layered PSD. Required roles: `face`, `eye_L`, `eye_R`, and `mouth`. A flattened PNG is not a complete rigging source; prepare separate layers first.

## Development
`npm install && npm run dev && npm run build`

The application exports Iki's open `.iki` JSON format. It does not export Live2D Cubism `.moc3` files.
