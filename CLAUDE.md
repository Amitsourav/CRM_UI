# CLAUDE.md

Guidance for working in this repository. This is the **frontend** of a multi-tenant education-consultancy CRM.

## What this is

A Next.js 16 (App Router) + React 19 CRM UI. It is a **single codebase deployed as two brands** off the same backend:

- **FundMyCampus (FMC)** — an education **loan-origination** funnel (bank entries, sanctions, disbursement).
- **Admitverse** — a university **admissions** funnel (university applications, offers, CAS, visa, enrollment).

The brand is not a build flag — it is resolved **at runtime** from the logged-in user's `company_slug` (`"fundmycampus"` vs `"admitverse"`). The two Vercel projects deploy the same repo; only `NEXT_PUBLIC_APP_NAME` and the tenant data differ. See "Dual-brand architecture" below — it is the single most important concept in this codebase.

- **Repo:** https://github.com/Amitsourav/CRM_UI.git
- **Backend:** FastAPI-style API at `NEXT_PUBLIC_API_URL` (prod: `https://be-crm-production.up.railway.app/api/v1`). This repo is UI-only.

## Commands

```bash
npm run dev     # next dev (localhost:3000)
npm run build   # next build
npm run start   # next start (prod server)
npm run lint    # eslint
```

There is **no test suite** in this repo. Verify changes by running the app.

## Tech stack

- **Next.js 16.1.6** App Router, **React 19.2**, **TypeScript** (strict), path alias `@/* → src/*`
- **Tailwind CSS v4** + **shadcn/ui** (new-york style, `src/components/ui/`) + **lucide-react** icons
- **Zustand** for global state (`src/stores/`) — no Redux, no React Query
- **axios** single client (`src/lib/api.ts`) — all data fetching goes through it
- **@hello-pangea/dnd** for the Kanban drag-and-drop
- **recharts** for report charts, **sonner** for toasts, **date-fns** for dates
- **@supabase/ssr** client exists (`src/lib/supabase-client.ts`) but auth is handled by the backend JWT flow, not Supabase directly

## Architecture

### Directory layout (`src/`)

| Dir | Contents |
|-----|----------|
| `app/` | App Router routes. `(auth)` = public login/signup; `(dashboard)` = gated app; `api/auth/set-cookie` = httpOnly cookie setter; `welcome` = brand selector |
| `components/` | Feature-grouped UI: `leads/`, `pipeline/`, `calls/`, `tasks/`, `campaigns/`, `reports/`, `agents/`, `csv/`, `notifications/`, `users/`, `shared/`, `layout/`, `ui/` (shadcn primitives) |
| `hooks/` | Data-fetching + logic hooks (`use-leads`, `use-calls`, `use-tasks`, `use-agents`, `use-reports`, `use-notifications`, `use-stage-config`, `use-auth`, `use-debounce`) |
| `services/` | Thin axios wrappers per domain (agents, applications, calls, campaigns, invoices, lead-banks, reports, voice) |
| `stores/` | Zustand stores (auth + lazy-loaded reference-data caches) |
| `lib/` | `api.ts` (axios client), `constants.ts` (⭐ brand stage config), `pipeline-filters.ts`, `follow-up.ts`, `lead-copy.ts`, `supabase-client.ts`, `utils.ts` |
| `types/index.ts` | All shared TypeScript types (single file, ~640 lines) — the source of truth for API shapes |

### Data flow

`Component → hook (use-*) / service (*-service) → src/lib/api.ts (axios) → Next.js rewrite proxy → backend`

- **On the client**, `api` uses baseURL `/api/v1` so requests pass through the `next.config.ts` rewrite proxy to `NEXT_PUBLIC_API_URL` (avoids CORS). On the server it hits the backend URL directly.
- The axios request interceptor injects `Authorization: Bearer <access_token>` from `localStorage`.
- The response interceptor handles **429** (toast) and **401** (one-shot refresh via `/auth/refresh`, then retry; on failure clears tokens and redirects to `/login`). It's careful not to clobber tokens refreshed by a concurrent login.
- Error convention: services/hooks surface `error.response?.data?.detail` as a `sonner` toast.

## Dual-brand architecture ⭐

Everything brand-specific funnels through **`src/lib/constants.ts`** and the **`useStageConfig()`** hook.

**Golden rule: never import `FMC_STAGE_CONFIG` / `ADMITVERSE_STAGE_CONFIG` / stage lists directly in components.** Call `useStageConfig()`, which reads `company_slug` from the auth store and returns the correct brand's config:

```ts
const { slug, stages, configMap, getEntry, getValidTransitions, canTransition } = useStageConfig();
const isFmc = slug !== "admitverse";
```

`constants.ts` exposes pure (slug-parameterized) functions — `getStageList`, `getStageConfigMap`, `getStageEntry`, `canTransition`, `getValidTransitions`, `getStageHex`, `isDnpStage`. The hook binds them to the current slug. Use the pure functions only where no React context exists.

### The two funnels

| | **FMC (`fundmycampus`)** | **Admitverse (`admitverse`)** |
|---|---|---|
| Domain | Education loan origination | University admissions |
| Child entity | **Bank entries** (`lead-banks-service`, `/leads/{id}/banks`) | **University applications** (`applications-service`, `/leads/{id}/applications`) |
| Entity manager UI | `lead-banks-manager.tsx` + `sanction-details-dialog.tsx` | `applications-manager.tsx` + `application-offer-dialog.tsx` |
| Status ladder | `BankStatus`: applied → … → sanctioned → pf_paid → disbursed | `ApplicationStatus`: applied → … → offer_received → deposit_paid → cas_received → visa_applied → enrolled |
| Detail-field gate | Sanction fields editable only at `sanctioned`+ | Offer fields editable only at `offer_received`+ (`OFFER_OR_BEYOND`) |
| Pipeline stages | 12: created→contacted→dnp→qualified→processing→docs_pending→logged_in→sanctioned→pf_paid→disbursed→opportunity→lost | 19: created→contacted→dnp_pre_qualified→connected→qualified→opportunity→dnp_post_qualified→processing→important→partial_docs_collected→docs_collected→application_done→conditional_draft→ucol→deposit_paid→cas_received→visa_applied→enrolled→lost |
| Terminal stages | `disbursed` (lost reopens to `created`, admin-only) | `enrolled`, `lost` |
| Filters | `loan_min/max` (lakhs), `bank_name`, `bank_status`, sort `loan_asc/desc` | `application_status`, `budget_min/max` (+currency), `university`, `target_country`, `target_intake`, sort `budget_asc/desc` |
| Reference data | `banks-store`, `lost-reasons-store` (locked dropdown) | `universities-store` (autocomplete), lost-reasons free-text |

The Admitverse applications feature is intentionally a **file-for-file mirror** of the FMC bank-entries feature (same offer/sanction gating pattern, filters, card shapes). When editing one, check whether the other needs the parallel change.

**DNP handling is shared:** `DNP_STAGES` = {`dnp`, `dnp_pre_qualified`, `dnp_post_qualified`}. Backend increments `dnp_count` on entry to any of these and auto-moves to Lost at `dnp_count >= 6`. The **DNP-N badge** (`dnp-badge.tsx`) shows a 1–6 color ramp; changing it requires a note.

The `Lead` type carries **both** brands' fields (all optional): FMC's `top_banks`/`bank_count`/`loan_amount`, Admitverse's `top_applications`/`application_count`/`budget_amount`/`primary_university`. The backend only populates the relevant set per tenant.

### Legacy stages

`LeadStage` and `constants.ts` retain pre-2026-05 FMC stages (`lead`, `called`, `qualified_lead`, `won`, `connected`) with labels/colors so historical `stage_log` badges still render. They are **not** in `FMC_STAGES_LIST`, so they never appear as Kanban columns.

## Auth & session

1. **Login** (`stores/auth-store.ts` `login()`) → `POST /auth/login` → stores `access_token`/`refresh_token` in `localStorage`, then `GET /users/me` to hydrate `user` + `company` (id/name/slug/timezone). Falls back to decoding the JWT payload if `/users/me` fails.
2. **Cookie sync** — the login page also POSTs the token to `/api/auth/set-cookie` to set an **httpOnly `access_token` cookie**, which `src/middleware.ts` reads to gate routes (public paths: `/login`, `/signup`, `/reset-password`, `/update-password`, `/welcome`; everything else redirects to `/login` without the cookie).
3. **Dashboard layout** (`app/(dashboard)/layout.tsx`) gates on mount: rehydrates via `fetchMe()`, shows a skeleton while loading, redirects to `/login` if no user. Renders `Sidebar` + `Topbar` + `main`, plus `ActiveCallsBar` for managers.
4. **Roles** — `Role` = `admin | manager | pre_counsellor`. Store derives `isAdmin`, `isManager` (admin∪manager), `isPreCounsellor`. Guard UI with `AdminGuard` / role checks (e.g. `pre_counsellor` is blocked from `/leads/import`). Note the **`telecaller` → `pre_counsellor` compat shim** in `constants.ts` and `auth-store.ts` (old cached JWTs).

## Routes

Auth: `/login`, `/signup`, `/reset-password`, `/update-password`. Root `/` → `/login`; `/welcome` = brand selector.

Dashboard (`(dashboard)/`, root redirects admin/manager→`/admin/reports`, others→`/leads`):
- `/leads`, `/leads/[id]`, `/leads/import` — list, detail (tabbed), CSV import
- `/pipeline` — Kanban board (full-height, no page header)
- `/calls`, `/tasks`, `/notifications`, `/settings/profile`
- `/admin/reports`, `/admin/users`, `/admin/users/[id]`, `/admin/agents`, `/admin/sources`, `/admin/csv-history` (admin/manager)
- `/campaigns`, `/campaigns/new`, `/campaigns/[id]` (manager)
- `/invoices`, `/invoices/new`, `/invoices/[id]`, `/invoices/settings` (admin)

## Feature domains (quick reference)

- **Leads** (`components/leads/`) — list (`lead-table`), tabbed detail (`lead-detail-tabs`: timeline/remarks/banks-or-apps/docs/calls/tasks), form, assignment dialogs (single/bulk/reassign/distribute-by-range), remarks, docs checklist, summary tiles.
- **Pipeline** (`components/pipeline/`) — `pipeline-board` owns `DragDropContext`; drag → `canTransition()` validation → confirm dialog (notes/due-date/lost-reason) → `POST /leads/{id}/stage`, optimistic move with rollback on error. Filters are URL-backed (`pipeline-filters.ts`).
- **Calls** (`components/calls/`, `call-service`, `voice-service`, `voice-store`) — call history/detail, manual log form, AI + live outbound via `/voice/*` (telephony), `ActiveCallsBar` polls active calls for managers.
- **Tasks** (`components/tasks/`, `use-tasks`, `task-count-store`) — table with today/overdue/completed tabs; count store powers the sidebar badge.
- **Campaigns** (`components/campaigns/`, `campaign-service`) — bulk-add leads by filter or CSV; start/pause/stop AI-calling campaigns.
- **Reports** (`components/reports/`, `report-service`, `use-reports`) — recharts dashboards: pipeline, agent/user performance, source, task compliance, trends.
- **AI Agents** (`components/agents/`, `agent-service`, `use-agents`) — voice-agent CRUD (STT/TTS/LLM/telephony config, prompts, pricing, `test-chat`); default-agent protections. `AIAgent` type is large — see `types/index.ts`.
- **CSV** (`components/csv/`) — upload → column mapper → preview → progress; used by lead import and campaign lead-loading.
- **Invoices** (`invoice-service`, pages only) — GST-aware invoicing (CGST/SGST/IGST), PDF generate/download, settings (legal name, GSTIN, PAN, logo/signature).
- **Notifications** (`components/notifications/`, `notification-store`) — bell with unread count, polls `/notifications/unread-count` ~30s.

## Conventions & gotchas

- **Brand-aware or bust:** any stage/status/filter logic must go through `useStageConfig()` / `constants.ts`, never hardcode a brand's stages.
- **Money fields** may serialize as **string or number** from the backend (`loan_amount`, `tuition_fee`, etc.) — handle both.
- **State:** global/shared → Zustand store; server data → a `use-*` hook or `*-service`. Reference lists (banks, universities, docs checklist, lost reasons) use lazy `ensureFetched()` stores that fetch once per session.
- **UI primitives:** reuse `components/ui/` (shadcn) and `components/shared/` (data-table, pagination, confirm-dialog, page-header, empty-state, guards) before adding new ones. Match new-york shadcn style.
- **No regressions:** this app has had brand-specific behavior repeatedly reworked; when a change touches shared code (constants, api, stage config), confirm both FMC and Admitverse paths still behave.
- **Env vars:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).

## Deployment

Both Vercel projects auto-deploy `Amitsourav/CRM_UI` → `main` to production (one per brand). A push to `main` triggers two ~2-min prod deploys. The brand each serves is decided at runtime by the tenant's `company_slug`, not by the build.
