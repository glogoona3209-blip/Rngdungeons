# Procedural Room Generator

An atlas-driven room generator mockup that assembles floors, halls, water, stairs, and surrounding walls from the supplied 32×32 tileset.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `PORT=8081 pnpm --filter @workspace/mockup-sandbox run dev` — run the room-generator preview locally
- `pnpm run typecheck` — full typecheck across all packages
- `PORT=8081 BASE_PATH=/__mockup pnpm run build` — typecheck + build all packages (the mockup Vite config requires both values)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mockup-sandbox/src/components/mockups/room-generator/FirstGeneratedRoom.tsx` — room layouts, tile classification, and wall/floor generation
- `artifacts/mockup-sandbox/public/images/tileset/` — copied atlas PNGs and labels
- `lib/api-spec/openapi.yaml` — API contract
- `lib/db/src/schema/` — Drizzle schema source

## Architecture decisions

- Floor cells remain walkable tiles; boundary walls are emitted into adjacent void cells so narrow halls do not turn into walls.
- Perspective wall pieces are restricted to outside top edges; thin caps and side pieces are used for the other boundaries.
- Corner pieces are derived from diagonal footprint neighbors and are optional per layout.
- The preview keeps the supplied tile IDs and native 32×32 rendering for atlas fidelity.

## Product

The current product surface is a deterministic visual room-generation preview with multiple layouts, optional irregular corners, connected hall strips, water pockets with bridges, and stairs.

## Gotchas

- The mockup preview build needs `PORT` and `BASE_PATH` set; the managed artifact workflow supplies them automatically.
- The API scaffold currently has only `/api/healthz`; its database schema is intentionally empty.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
