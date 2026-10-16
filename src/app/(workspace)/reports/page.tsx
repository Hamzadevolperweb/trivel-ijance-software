import Link from "next/link";
import { Activity, Download, FileText } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { formatMinorCurrency } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  await requirePermission("reports", "read");
  const supabase = await createSupabaseServerClient();
  const [settings, bookings, payments, refunds, expenses, invoices] = await Promise.all([
    supabase.from("agency_settings").select("default_currency").eq("id", true).maybeSingle(),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("id", { count: "exact", head: true }),
    supabase.from("refunds").select("id", { count: "exact", head: true }),
    supabase.from("expenses").select("id", { count: "exact", head: true }),
    supabase.from("invoices").select("id", { count: "exact", head: true }),
  ]);
  for (const [name, result] of [["settings", settings], ["bookings", bookings], ["payments", payments], ["refunds", refunds], ["expenses", expenses], ["invoices", invoices]] as const) {
    if (result.error) throw new Error(`Unable to load report ${name}: ${result.error.message}`);
  }
  const currency = settings.data?.default_currency ?? "PKR";
  const { data: finance, error } = await supabase.rpc("dashboard_finance_summary", { target_currency: currency });
  if (error) throw new Error(`Unable to load finance report: ${error.message}`);
  const summary = finance?.[0];
  const revenue = BigInt(String(summary?.verified_payment_minor ?? 0)) - BigInt(String(summary?.paid_refund_minor ?? 0));
  const totalExpenses = BigInt(String(summary?.expenses_minor ?? 0));
  const payable = BigInt(String(summary?.payable_minor ?? 0));
  const cards = [
    ["Bookings", bookings.count],
    ["Payments", payments.count],
    ["Refunds", refunds.count],
    ["Expenses", expenses.count],
    ["Invoices", invoices.count],
  ];
  return (
    <div className="space-y-5">
      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="section-title">Live operations and finance report</h2><p className="section-subtitle mt-1">Totals are computed from accessible Supabase records in {currency}.</p></div>
          <Link className="button-primary" href="/api/reports/export"><Download size={15} />Download CSV</Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map(([label, count]) => <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4" key={label as string}>
            <p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-semibold text-slate-900">{count ?? 0}</p>
          </div>)}
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Net verified revenue", revenue, "Verified payment receipts less paid refunds.", Activity],
          ["Total expenses", totalExpenses, "Saved agency expenses.", FileText],
          ["Booking value", payable, "Non-cancelled booking amounts.", Activity],
        ].map(([label, amount, description, Icon]) => {
          const FinanceIcon = Icon as typeof Activity;
          return <article className="panel" key={label as string}>
            <div className="mb-4 flex items-center gap-2 text-blue-700"><FinanceIcon size={17} /><h3 className="section-title">{label as string}</h3></div>
            <p className="text-2xl font-semibold text-slate-900">{formatMinorCurrency(amount as bigint, currency)}</p>
            <p className="mt-2 text-xs text-slate-400">{description as string}</p>
          </article>;
        })}
      </section>
      <p className="text-[11px] leading-5 text-slate-400">CSV exports include current booking, payment, expense, and invoice ledger records permitted by your agency role.</p>
    </div>
  );
}
