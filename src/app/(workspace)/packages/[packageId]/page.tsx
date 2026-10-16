import Link from "next/link";
import { ArrowLeft, CalendarDays, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { PackageDeleteButton } from "@/components/package-delete-button";
import { PackageForm } from "@/components/package-form";
import { hasPermission, requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ packageId: string }> };

export default async function PackageDetailPage({ params }: Props) {
  const [{ packageId }, user] = await Promise.all([
    params,
    requirePermission("packages", "read"),
  ]);
  const supabase = await createSupabaseServerClient();
  const { data: packageRow, error } = await supabase.from("umrah_packages")
    .select("*").eq("id", packageId).maybeSingle();
  if (error) throw new Error(`Unable to load package: ${error.message}`);
  const { count, error: bookingsError } = await supabase.from("bookings")
    .select("id", { count: "exact", head: true }).eq("package_id", packageId);
  if (bookingsError) throw new Error(`Unable to count package bookings: ${bookingsError.message}`);
  const travelPackage = packageRow ? {
    id: packageRow.id,
    code: packageRow.code,
    name: packageRow.name,
    durationDays: packageRow.duration_days,
    departureDate: new Date(`${packageRow.departure_date}T00:00:00`),
    returnDate: new Date(`${packageRow.return_date}T00:00:00`),
    makkahHotel: packageRow.makkah_hotel,
    madinahHotel: packageRow.madinah_hotel,
    roomType: packageRow.room_type,
    transportDetails: packageRow.transport_details,
    flightDetails: packageRow.flight_details,
    inclusions: packageRow.inclusions ? packageRow.inclusions.split(/\r?\n/) : [],
    exclusions: packageRow.exclusions ? packageRow.exclusions.split(/\r?\n/) : [],
    capacity: packageRow.capacity,
    priceMinor: String(packageRow.price_minor),
    currency: packageRow.currency,
    status: packageRow.status,
    bookingCount: count ?? 0,
  } : null;

  if (!travelPackage) notFound();

  return (
    <div className="space-y-5">
      <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-700" href="/packages">
        <ArrowLeft size={14} /> Back to packages
      </Link>
      <section className="panel">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">{travelPackage.code}</p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">{travelPackage.name}</h2>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <CalendarDays size={14} /> {travelPackage.durationDays} days
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <UsersRound size={14} /> {travelPackage.bookingCount} bookings
            </span>
          </div>
        </div>
        {hasPermission(user, "packages", "update") ? (
          <PackageForm travelPackage={{ ...travelPackage, priceMinor: travelPackage.priceMinor.toString() }} />
        ) : (
          <p className="text-xs text-slate-500">You have read-only access to this package.</p>
        )}
        {hasPermission(user, "packages", "delete") && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs font-semibold text-slate-700">Remove package</p>
            <PackageDeleteButton packageId={travelPackage.id} />
          </div>
        )}
      </section>
    </div>
  );
}
