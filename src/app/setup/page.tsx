import Link from "next/link";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";

export default function SetupPage() {
  const configured = hasSupabasePublicEnv();
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-10">
      <section className="panel w-full max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">SafarDesk setup</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{configured ? "Supabase is configured" : "Connect your Supabase project"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">SafarDesk uses the hosted Supabase project for database, authentication, and private document storage.</p>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
          <li>Copy <code>.env.example</code> to <code>.env.local</code>, then set the project URL and publishable key.</li>
          <li>Run the SQL migration in the Supabase Dashboard SQL Editor.</li>
          <li>Set the server-only service-role key and initialize the administrator using the documented bootstrap flow.</li>
        </ol>
        <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Project URL and publishable key: {configured ? "configured" : "missing"} · Server service-role key: {serviceRoleConfigured ? "configured" : "missing"}
        </p>
        <div className="mt-5 flex gap-4 text-sm">
          <Link className="font-medium text-blue-700" href="/login">Go to sign in</Link>
          <a className="font-medium text-blue-700" href="https://supabase.com/dashboard">Open Supabase Dashboard</a>
        </div>
      </section>
    </main>
  );
}
