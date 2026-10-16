"use client";

import { useActionState } from "react";
import { LockKeyhole, Plane } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4 py-10">
      <section className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_16px_50px_rgba(15,23,42,0.08)] sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-blue-700 text-white">
            <Plane size={21} />
          </span>
          <span>
            <span className="block text-base font-semibold text-slate-900">SafarDesk</span>
            <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.13em] text-slate-400">Travel operations</span>
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in to your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Use your agency account to manage customers, bookings, and travel operations.
        </p>

        <form action={action} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Email address</span>
            <input
              autoComplete="username"
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              name="email"
              placeholder="you@agency.com"
              required
              type="email"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-700">Password</span>
            <input
              autoComplete="current-password"
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              name="password"
              placeholder="Enter your password"
              required
              type="password"
            />
          </label>
          {state.error && (
            <p aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-800">
              {state.error}
            </p>
          )}
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            <LockKeyhole size={16} />
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] leading-5 text-slate-400">
          Sign-in is securely handled by Supabase Auth.
        </p>
      </section>
    </main>
  );
}
