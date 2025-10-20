# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Framework: Next.js 15 (App Router) with TypeScript and Tailwind CSS
- Runtime: Custom Node server (server.js) for production/cPanel deployments
- Data: Supabase (auth, database, migrations)
- State & data fetching: React Query and Zustand
- UI: Radix UI primitives and shadcn-style components
- Payments: KPay integration (see src/lib/services/kpay.ts, src/hooks/useKPayPayment.ts and app/api/payments/kpay/*)
- Internationalization: src/locales/{en,rw}.ts
- Static data: Rwanda administrative divisions JSON in src/lib/data/*

Common commands
Use pnpm in this repo (pnpm-workspace.yaml exists):
- Install deps: pnpm install
- Dev server: pnpm dev (Next.js on http://localhost:3000)
- Build: pnpm build
- Start (production): pnpm start (runs server.js)
- Lint: pnpm lint
- Type-check: pnpm exec tsc --noEmit

Supabase (requires Supabase CLI)
- Start/stop local stack: pnpm supabase:start / pnpm supabase:stop
- Create migration: pnpm supabase:migrate:new "your_message"
- Apply migrations to local DB: pnpm supabase:migrate:up
- Reset DB and re-apply migrations: pnpm supabase:migrate:reset
- Migration status: pnpm supabase:migrate:status
- Generate DB types: pnpm supabase:typegen (writes to src/supabase/types.ts; requires jq)

Data seeding
- Seed initial admin user: pnpm run seed:admin

Tests
- There is no test runner configured in package.json at this time.

Architecture and layout
- App routes and pages: src/app/** (Next.js App Router)
- API routes:
  - New (App Router): src/app/api/**
  - Legacy (Pages Router): src/pages/api/**
- Supabase:
  - SQL migrations: supabase/migrations/*.sql
  - Project config: supabase/config.toml
  - Client and helpers: src/integrations/supabase/**
- Payments (KPay):
  - Service/client: src/lib/services/kpay.ts
  - Hooks: src/hooks/useKPayPayment.ts
  - API endpoints: src/app/api/payments/kpay/**
- Admin and Rider dashboards: src/app/admin/**, src/app/rider/**
- Global notifications: src/contexts/NotificationsContext.tsx (with supporting DB triggers in migrations)
- UI components: src/components/** (includes shadcn/radix-based primitives under src/components/ui/**)
- Path alias: import from @/* resolves to src/* (see tsconfig.json)
- Custom server: server.js wraps Next request handler for production/cPanel

Build/runtime notes
- ESLint is configured via eslint.config.mjs; Next’s build ignores ESLint errors (next.config.ts: eslint.ignoreDuringBuilds = true).
- Images are configured to allow remote SVG/WebP/AVIF from any host (see next.config.ts images.remotePatterns).
- For deployment via GitHub Actions to cPanel, see .github/workflows/deploy-to-cpanel.yml. If the environment variable NEXT_EXPORT=true is provided, the workflow runs next export and deploys the static out folder; otherwise it deploys a dist with .next, public, package.json, and server.js.

Additional docs
- Getting started and deployment details: README.md
- KPay testing procedures and test data: KPAY_TESTING_GUIDE.md
