import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  FileText,
  Plus,
  UsersRound,
} from "lucide-react";
import { hasPermission, requirePermission } from "@/lib/auth";
import { formatMinorCurrency } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const shortcuts = [
  { label: "New booking", icon: CalendarDays, href: "/bookings" },
  { label: "Add customer", icon: UsersRound, href: "/customers" },
  { label: "Record payment", icon: ArrowUpRight, href: "/payments" },
];

export default async function DashboardPage() {
  const user = await requirePermission("dashboard", "read");
  const supabase = await createSupabaseServerClient();
  const canRead = {
    customers: hasPermission(user, "customers", "read"),
    bookings: hasPermission(user, "bookings", "read"),
    passengers: hasPermission(user, "passengers", "read"),
    visas: hasPermission(user, "visas", "read"),
    payments: hasPermission(user, "payments", "read"),
    expenses: hasPermission(user, "expenses", "read"),
  };
  const [settingsResult, customersResult, bookingsResult, passengersResult, visasResult, paymentsResult, expensesResult, bookingRowsResult] = await Promise.all([
    supabase.from("agency_settings").select("default_currency").eq("id", true).maybeSingle(),
    canRead.customers ? supabase.from("customers").select("id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
    canRead.bookings ? supabase.from("bookings").select("id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
    canRead.passengers ? supabase.from("passengers").select("id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
    canRead.visas ? supabase.from("visa_applications").select("id", { count: "exact", head: true }).in("status", ["DOCUMENTS_REQUIRED", "SUBMITTED", "IN_REVIEW"]) : Promise.resolve({ count: null, error: null }),
    canRead.payments ? supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "PENDING") : Promise.resolve({ count: null, error: null }),
    canRead.expenses ? supabase.from("expenses").select("id", { count: "exact", head: true }) : Promise.resolve({ count: null, error: null }),
    canRead.bookings
      ? supabase.from("bookings").select("id,reference,status,created_at,departure_date,customers(full_name),umrah_packages(name)").order("created_at", { ascending: false }).limit(5)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const [label, result] of [
    ["agency settings", settingsResult],
    ["customers", customersResult],
    ["bookings", bookingsResult],
    ["passengers", passengersResult],
    ["visa applications", visasResult],
    ["payments", paymentsResult],
    ["expenses", expensesResult],
    ["recent bookings", bookingRowsResult],
  ] as const) {
    if (result.error) throw new Error(`Unable to load ${label}: ${result.error.message}`);
  }
  const currency = settingsResult.data?.default_currency ?? "PKR";
  const { data: financeRows, error: financeError } = canRead.payments || canRead.expenses
    ? await supabase.rpc("dashboard_finance_summary", { target_currency: currency })
    : { data: [], error: null };
  if (financeError) throw new Error(`Unable to load finance summary: ${financeError.message}`);
  const finance = financeRows?.[0];
  const revenue = BigInt(String(finance?.verified_payment_minor ?? 0)) - BigInt(String(finance?.paid_refund_minor ?? 0));
  const expenses = BigInt(String(finance?.expenses_minor ?? 0));
  const payable = BigInt(String(finance?.payable_minor ?? 0));
  const paid = BigInt(String(finance?.verified_payment_minor ?? 0));
  const refunds = BigInt(String(finance?.paid_refund_minor ?? 0));
  const balance = payable - paid + refunds;
  const stats = [
    { label: "Customers", count: customersResult.count, allowed: canRead.customers, icon: UsersRound, href: "/customers" },
    { label: "Bookings", count: bookingsResult.count, allowed: canRead.bookings, icon: CalendarDays, href: "/bookings" },
    { label: "Passengers", count: passengersResult.count, allowed: canRead.passengers, icon: UsersRound, href: "/passengers" },
    { label: "Visas in progress", count: visasResult.count, allowed: canRead.visas, icon: FileText, href: "/visas" },
    { label: "Payments pending", count: paymentsResult.count, allowed: canRead.payments, icon: ArrowUpRight, href: "/payments" },
    { label: "Expenses", count: expensesResult.count, allowed: canRead.expenses, icon: CircleAlert, href: "/expenses" },
  ];
  const bookings = bookingRowsResult.data ?? [];

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">Agency overview</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">Welcome back, {user.name}</h1>
          <p className="mt-1.5 text-sm text-slate-500">Live data from your Supabase workspace.</p>
        </div>
        <Link className="button-primary" href="/bookings"><Plus size={16} />Create booking</Link>
      </div>

      <section aria-label="Business overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, count, allowed, icon: Icon, href }) => (
          <Link key={label} href={href} className="stat-card transition hover:border-blue-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-3 text-[25px] font-semibold tracking-tight text-slate-900">{allowed ? (count ?? 0).toLocaleString() : "Restricted"}</p>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={19} /></div>
            </div>
          </Link>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {canRead.payments && (
          <article className="panel">
            <div className="mb-4 flex items-center gap-2"><ArrowUpRight className="text-emerald-600" size={18} /><h2 className="section-title">Net verified revenue</h2></div>
            <p className="text-2xl font-semibold text-slate-900">{formatMinorCurrency(revenue, currency)}</p>
            <p className="mt-2 text-xs text-slate-400">Verified collections less paid refunds.</p>
          </article>
        )}
        {canRead.bookings && canRead.payments && (
          <article className="panel">
            <div className="mb-4 flex items-center gap-2"><ArrowDownRight className="text-amber-600" size={18} /><h2 className="section-title">Outstanding balances</h2></div>
            <p className="text-2xl font-semibold text-slate-900">{formatMinorCurrency(balance > 0 ? balance : BigInt(0), currency)}</p>
            <p className="mt-2 text-xs text-slate-400">Open booking amounts less verified payments.</p>
          </article>
        )}
        {canRead.expenses && (
          <article className="panel">
            <div className="mb-4 flex items-center gap-2"><CircleAlert className="text-rose-600" size={18} /><h2 className="section-title">Recorded expenses</h2></div>
            <p className="text-2xl font-semibold text-slate-900">{formatMinorCurrency(expenses, currency)}</p>
            <p className="mt-2 text-xs text-slate-400">Saved expenses in {currency}.</p>
          </article>
        )}
      </section>

      {canRead.bookings && (
        <section className="panel">
          <div className="panel-heading">
            <div><h2 className="section-title">Recent bookings</h2><p className="section-subtitle">Latest saved agency reservations</p></div>
            <Link href="/bookings" className="text-xs font-medium text-blue-700">View all</Link>
          </div>
          {!bookings.length ? <p className="py-8 text-center text-xs text-slate-400">No bookings yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead><tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400">{["Reference", "Customer", "Package", "Departure", "Status"].map((column) => <th className="px-3 py-2" key={column}>{column}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">{bookings.map((booking) => {
                  const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
                  const pack = Array.isArray(booking.umrah_packages) ? booking.umrah_packages[0] : booking.umrah_packages;
                  return <tr key={booking.id}>
                    <td className="px-3 py-3 font-semibold text-blue-700">{booking.reference}</td>
                    <td className="px-3 py-3 text-slate-600">{customer?.full_name ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{pack?.name ?? "Custom booking"}</td>
                    <td className="px-3 py-3 text-slate-600">{booking.departure_date ?? "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{booking.status.toLowerCase()}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="panel">
        <div className="panel-heading"><div><h2 className="section-title">Quick actions</h2><p className="section-subtitle">Create or manage common records</p></div></div>
        <div className="grid gap-3 sm:grid-cols-3">
          {shortcuts.map(({ label, icon: Icon, href }) => <Link href={href} key={label} className="quick-action">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={19} /></span>
            <span className="flex-1 text-sm font-medium text-slate-700">{label}</span><Plus size={16} className="text-slate-400" />
          </Link>)}
        </div>
      </section>
    </div>
  );
}
