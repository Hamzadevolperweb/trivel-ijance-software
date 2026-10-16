import Link from "next/link";
import { ChevronLeft, ChevronRight, PackagePlus, Search } from "lucide-react";
import { PackageForm } from "@/components/package-form";
import { hasPermission, requirePermission } from "@/lib/auth";
import { formatMinorCurrency } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE_SIZE = 10;
const packageStatuses = ["DRAFT", "ACTIVE", "FULL", "ARCHIVED"] as const;
type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

export default async function PackagesPage({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([
    requirePermission("packages", "read"),
    searchParams,
  ]);
  const search = (params.q ?? "").trim().slice(0, 100);
  const status = packageStatuses.find((item) => item === params.status);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const safePage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createSupabaseServerClient();
  let countQuery = supabase.from("umrah_packages").select("id", { count: "exact", head: true });
  if (status) countQuery = countQuery.eq("status", status);
  if (search) countQuery = countQuery.ilike("name", `%${search}%`);
  const { count: totalCount, error: countError } = await countQuery;
  if (countError) throw new Error(`Unable to count packages: ${countError.message}`);
  const total = totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(safePage, pageCount);
  let packageQuery = supabase
    .from("umrah_packages")
    .select("id,code,name,departure_date,return_date,duration_days,capacity,price_minor,currency,status,created_at")
    .order("departure_date", { ascending: true })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) packageQuery = packageQuery.eq("status", status);
  if (search) packageQuery = packageQuery.ilike("name", `%${search}%`);
  const { data: packageRows, error } = await packageQuery;
  if (error) throw new Error(`Unable to load packages: ${error.message}`);
  const packageIds = packageRows.map((item) => item.id);
  const { data: bookings, error: bookingsError } = packageIds.length
    ? await supabase.from("bookings").select("package_id").in("package_id", packageIds)
    : { data: [], error: null };
  if (bookingsError) throw new Error(`Unable to load package booking counts: ${bookingsError.message}`);
  const bookingCounts = new Map<string, number>();
  for (const booking of bookings ?? []) {
    if (booking.package_id) bookingCounts.set(booking.package_id, (bookingCounts.get(booking.package_id) ?? 0) + 1);
  }
  const packages = packageRows.map((item) => ({ ...item, bookingCount: bookingCounts.get(item.id) ?? 0 }));
  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (status) query.set("status", status);
  const queryPrefix = query.size ? `?${query.toString()}&` : "?";

  return (
    <div className="space-y-5">
      {hasPermission(user, "packages", "create") && (
        <details className="panel group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-semibold text-slate-800">Create a package</span>
              <span className="mt-1 block text-xs text-slate-400">Add schedule, capacity, pricing, and travel details.</span>
            </span>
            <span className="grid size-9 place-items-center rounded-lg bg-blue-700 text-white transition group-open:rotate-45"><PackagePlus size={18} /></span>
          </summary>
          <div className="mt-5 border-t border-slate-100 pt-5"><PackageForm /></div>
        </details>
      )}

      <section className="panel overflow-hidden !p-0">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Umrah packages</h2>
            <p className="mt-1 text-xs text-slate-400">{total} {total === 1 ? "package" : "packages"}</p>
          </div>
          <form action="/packages" className="flex flex-wrap gap-2">
            <label className="flex h-9 min-w-48 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400">
              <Search size={15} />
              <input aria-label="Search packages" className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400" defaultValue={search} maxLength={100} name="q" placeholder="Search name or code" />
            </label>
            <select aria-label="Filter by package status" className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600" defaultValue={status ?? ""} name="status">
              <option value="">All statuses</option>
              {packageStatuses.map((item) => <option key={item} value={item}>{item.charAt(0) + item.slice(1).toLowerCase()}</option>)}
            </select>
            <button className="button-secondary !h-9 !min-h-9 !px-3" type="submit">Apply</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {["Package", "Departure", "Duration", "Capacity", "Bookings", "Price", "Status"].map((heading) => <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-400" key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packages.map((travelPackage) => (
                <tr className="transition hover:bg-slate-50/70" key={travelPackage.id}>
                  <td className="px-4 py-3.5">
                    {hasPermission(user, "packages", "update") ? (
                      <Link className="text-xs font-semibold text-blue-700 hover:text-blue-900" href={`/packages/${travelPackage.id}`}>{travelPackage.name}</Link>
                    ) : <span className="text-xs font-semibold text-slate-800">{travelPackage.name}</span>}
                    <span className="mt-1 block text-[10px] text-slate-400">{travelPackage.code}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{new Date(`${travelPackage.departure_date}T00:00:00`).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{travelPackage.duration_days} days</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{travelPackage.capacity}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{travelPackage.bookingCount}</td>
                  <td className="px-4 py-3.5 text-xs font-medium text-slate-700">{formatMinorCurrency(BigInt(travelPackage.price_minor), travelPackage.currency)}</td>
                  <td className="px-4 py-3.5"><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase text-slate-600">{travelPackage.status.toLowerCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {packages.length === 0 && (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400"><PackagePlus size={20} /></span>
            <p className="mt-3 text-sm font-semibold text-slate-700">{search || status ? "No matching packages" : "No packages yet"}</p>
            <p className="mt-1 text-xs text-slate-400">Create a package to organize upcoming Umrah departures.</p>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
          <span>Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex items-center gap-2">
            {page > 1 ? <Link aria-label="Previous page" className="grid size-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" href={`${queryPrefix}page=${page - 1}`}><ChevronLeft size={15} /></Link> : <span className="grid size-7 place-items-center rounded-md border border-slate-100 text-slate-300"><ChevronLeft size={15} /></span>}
            <span>Page {page} of {pageCount}</span>
            {page < pageCount ? <Link aria-label="Next page" className="grid size-7 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" href={`${queryPrefix}page=${page + 1}`}><ChevronRight size={15} /></Link> : <span className="grid size-7 place-items-center rounded-md border border-slate-100 text-slate-300"><ChevronRight size={15} /></span>}
          </div>
        </div>
      </section>
    </div>
  );
}
