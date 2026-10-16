import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f9fc] px-4">
      <section className="panel max-w-md text-center">
        <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">Your agency role does not allow access to this page.</p>
        <Link className="button-primary mt-5" href="/">Return to workspace</Link>
      </section>
    </main>
  );
}
