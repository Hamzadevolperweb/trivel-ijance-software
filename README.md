# SafarDesk

SafarDesk is a Next.js CRM/ERP for Umrah travel operations. Supabase is the only backend: the hosted Supabase Postgres database, Supabase Auth, private Supabase Storage, and row-level security. The application does not run a local PostgreSQL service or use Prisma.

## Supabase setup

1. In the Supabase Dashboard, create or select the project and copy its **Project URL** and **publishable key** from **Project Settings → API**.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Open the project's **SQL Editor**, paste and run [`supabase/migrations/20261016000000_safar_desk.sql`](./supabase/migrations/20261016000000_safar_desk.sql). This creates the application schema, indexes, triggers, RLS policies, private document bucket, and the finance summary function.
4. Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` from the project's server-side secret key. It must never be exposed in a `NEXT_PUBLIC_` variable or included in browser code.
5. Set `INITIAL_ADMIN_PASSWORD` to a strong, unique password using a secure local/private setup flow, then run:

   ```powershell
   npm run admin:bootstrap
   ```

   This creates or promotes the administrator account `h.nit.amza@gmail.com`. The script does not print the password. Remove `INITIAL_ADMIN_PASSWORD` after successful setup. Staff accounts are invited by email through Supabase Auth.
6. Start the app:

   ```powershell
   npm run dev
   ```

Do not install PostgreSQL locally, run Prisma, or commit `.env.local`. The service-role key bypasses RLS and is used only by server-side bootstrap/staff-invitation code.

## Data and access

- Supabase Auth owns sign-in, sign-out, and session refresh.
- Application records are queried through the Supabase client. RLS policies check the active agency role; application permission checks provide matching route/action gating.
- Passenger and visa files belong in the private `passenger-private` Storage bucket. Files are referenced by private object paths, not public URLs.
- Passenger passport numbers are not included in passenger list output. Online payments cannot be marked verified by a normal authenticated client; a trusted provider/webhook integration using server-side credentials is required.
- The migration creates schema and security policies only; it does not seed fake customers, packages, passengers, payments, or bookings.

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
```

Live login, CRUD, storage, and RLS-denial verification require the Supabase project URL, publishable key, and the SQL migration to be configured/applied. No Supabase credentials are stored in this repository.
