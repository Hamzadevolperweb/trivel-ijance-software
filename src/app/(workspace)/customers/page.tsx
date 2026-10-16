import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search, UsersRound } from "lucide-react";
import { CustomerForm } from "@/components/customer-form";
import { hasPermission, requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 10;

type CustomerSearchParams = Promise<{ q?: string; page?: string }>;

export default async function CustomersPage({ searchParams }: { searchParams: CustomerSearchParams }) {
  const [user, params] = await Promise.all([
    requirePermission("customers", "read"),
    searchParams,
  ]);
  const search = (params.q ?? "").trim().slice(0, 100);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createSupabaseServerClient();
  let customersQuery = supabase
    .from("customers")
    .select("id,full_name,phone,email,nationality,created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (search) customersQuery = customersQuery.ilike("full_name", `%${search}%`);
  const { count: totalCount, error: listError } = await customersQuery.range(0, 0);
  if (listError) throw new Error(`Unable to count customers: ${listError.message}`);
  const total = totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(safePage, pageCount);
  let pageQuery = supabase
    .from("customers")
    .select("id,full_name,phone,email,nationality,created_at")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (search) pageQuery = pageQuery.ilike("full_name", `%${search}%`);
  const { data: customerRows, error } = await pageQuery;
  if (error) throw new Error(`Unable to load customers: ${error.message}`);
  const customerIds = customerRows.map((customer) => customer.id);
  const { data: bookings, error: bookingsError } = customerIds.length
    ? await supabase.from("bookings").select("customer_id").in("customer_id", customerIds)
    : { data: [], error: null };
  if (bookingsError) throw new Error(`Unable to load customer booking counts: ${bookingsError.message}`);
  const bookingCounts = new Map<string, number>();
  for (const booking of bookings ?? []) {
    bookingCounts.set(booking.customer_id, (bookingCounts.get(booking.customer_id) ?? 0) + 1);
  }
  const customers = customerRows.map((customer) => ({
    ...customer,
    bookingCount: bookingCounts.get(customer.id) ?? 0,
  }));

  const query = search ? `?q=${encodeURIComponent(search)}&` : "?";

  return (
    <div className="space-y-5">
      {hasPermission(user, "customers", "create") && (
        <details className="panel group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-slate-800">Add a customer</span>
              <span className="mt-1 block text-xs text-slate-400">Create a profile with contact and emergency details.</span>
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-700 text-white transition group-open:rotate-45">
              <Plus size={18} />
            </span>
          </summary>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <CustomerForm compact />
          </div>
        </details>
      )}

      <section className="panel overflow-hidden !p-0">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Customer directory</h2>
            <p className="mt-1 text-xs text-slate-400">{total} {total === 1 ? "customer" : "customers"}</p>
          </div>
          <form action="/customers" className="flex gap-2">
            <label className="flex h-9 min-w-52 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400">
              <Search size={15} />
              <input
                aria-label="Search customers"
                className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
                defaultValue={search}
                maxLength={100}
                name="q"
                placeholder="Search name, phone, email"
              />
            </label>
            <button className="button-secondary !h-9 !min-h-9 !px-3" type="submit">Search</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {["Customer", "Phone", "Email", "Nationality", "Bookings", "Added"].map((heading) => (
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr className="transition hover:bg-slate-50/70" key={customer.id}>
                  <td className="px-5 py-3.5">
                    <Link className="text-xs font-semibold text-slate-800 hover:text-blue-700" href={`/customers/${customer.id}`}>{customer.full_name}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{customer.phone}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{customer.email ?? "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{customer.nationality ?? "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{customer.bookingCount}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{new Date(customer.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><UsersRound size={20} /></span>
            <p className="mt-3 text-sm font-semibold text-slate-700">{search ? "No matching customers" : "No customers yet"}</p>
            <p className="mt-1 text-xs text-slate-400">{search ? "Try a different name, phone, or email." : "Add a customer to start building your CRM."}</p>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
          <span>Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link aria-label="Previous page" className="grid size-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" href={`${query}page=${page - 1}`}><ChevronLeft size={15} /></Link>
            ) : <span className="grid size-7 place-items-center rounded-md border border-slate-100 text-slate-300"><ChevronLeft size={15} /></span>}
            <span>Page {page} of {pageCount}</span>
            {page < pageCount ? (
              <Link aria-label="Next page" className="grid size-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" href={`${query}page=${page + 1}`}><ChevronRight size={15} /></Link>
            ) : <span className="grid size-7 place-items-center rounded-md border border-slate-100 text-slate-300"><ChevronRight size={15} /></span>}
          </div>
        </div>
      </section>
    </div>
  );
}
