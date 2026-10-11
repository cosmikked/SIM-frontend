# SIMS frontend

React + TypeScript client for the SIM Laravel API in `../backend` (Sanctum bearer tokens, `/api/v1`).

Vite · React 19 · React Router · TanStack Query · react-hook-form + zod · Tailwind v4 · Radix-based UI components.
Styling follows `../SIMS Design System 1b.md` ("Green as brand").

## Run

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:8000/api/v1
npm install
npm run dev              # http://localhost:3000  (matches FRONTEND_URL in the backend)
```

Start the API first (`php artisan serve` in `../backend`, migrated and seeded). CORS is open in `backend/config/cors.php`, so no proxy is needed.

Other scripts: `npm run build` (typecheck + production build), `npm run lint`.

Dev accounts (development only, password `password`): `admin@`, `registrar@`, `instructor@`, `student@gmail.com`.
Password-reset emails are written to `backend/storage/logs/laravel.log`; the link opens `/reset-password?token=&email=`.

## Layout (`src/`)

| Path | What it holds |
|---|---|
| `lib/api/client.ts` | One fetch wrapper: base URL, bearer token, envelope parsing, typed `ApiError`, 401 handling |
| `lib/api/types.ts`, `schemas.ts` | Hand-written resource types, enums and zod form schemas |
| `lib/api/endpoints/` | One module per resource (`crud()` helper + custom calls) |
| `lib/auth/` | `AuthProvider`, `useAuth`, role → area `permissions.ts` |
| `lib/query/` | QueryClient, key factories, `useLookups()` for client-side joins on IDs |
| `lib/forms/` | `handleApiError` (422 onto fields, 403/409/429/5xx toasts), `fieldProps` |
| `components/` | `DataTable` + `useListParams` (URL-bound list state), `ConfirmDialog`, `StatusBadge`, `PageHeader`, ... |
| `components/ui/` | Base components styled to the design system |
| `app/` | Router, role-aware `AppShell`, route guards, nav config |
| `features/` | Screens, one folder per area; every screen in the PRD is built |
| `styles/index.css` | Design tokens (light + dark), shadcn variable mapping, type scale |

`features/programs/` is the reference for list screens (search, sort, filter, pagination, create/edit dialog, confirmed delete). Copy its shape for courses, terms, students and so on.

`/dev/design` (dev builds only) renders every token, the type scale and the base components in light and dark.

## Notes

- Authorization is enforced by the API; the UI hides what a role cannot use (`lib/auth/permissions.ts`) so nobody sees an action that would return 403.
- List responses carry IDs only. Use `useLookups()` to join names client-side.
- Send raw scores (0–100) only on grade forms; never `remarks`, equivalent grades or `final_raw_score`.
- Term names are `First Semester | Second Semester | MidYear`; year level is 1–4 (verified against the Form Requests, not the docs).
- Dark mode defines six tokens in the design system; the rest are derived and marked in `styles/index.css`.
