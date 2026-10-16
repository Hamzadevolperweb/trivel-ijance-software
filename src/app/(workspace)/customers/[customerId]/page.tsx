import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, MapPin, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { CustomerDeleteButton } from "@/components/customer-delete-button";
import { CustomerForm } from "@/components/customer-form";
import { hasPermission, requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ customerId: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { customerId } = await params;
  const user = await requirePermission("customers", "read");
  const supabase = await createSupabaseServerClient();
  const { data: customerRow, error } = await supabase.from("customers")
    .select("id,full_name,phone,email,nationality,address,emergency_contact,notes,created_at")
    .eq("id", customerId).maybeSingle();
  if (error) throw new Error(`Unable to load customer: ${error.message}`);
  const customer = customerRow ? {
    id: customerRow.id,
    name: customerRow.full_name,
    phone: customerRow.phone,
    email: customerRow.email,
    nationality: customerRow.nationality,
    address: customerRow.address,
    emergencyContact: customerRow.emergency_contact,
    notes: customerRow.notes,
    createdAt: new Date(customerRow.created_at),
  } : null;

  if (!customer) notFound();

  const { data: bookingRows, error: bookingsError } = await supabase.from("bookings")
    .select("id,reference,status,departure_date,umrah_packages(name)")
    .eq("customer_id", customerId).order("created_at", { ascending: false }).limit(5);
  if (bookingsError) throw new Error(`Unable to load customer bookings: ${bookingsError.message}`);
  const bookings = (bookingRows ?? []).map((booking) => ({
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    startDate: booking.departure_date ? new Date(`${booking.departure_date}T00:00:00`) : null,
    package: Array.isArray(booking.umrah_packages) ? booking.umrah_packages[0] : booking.umrah_packages,
  }));

  return (
    <div className="space-y-5">
      <Link className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-700" href="/customers">
        <ArrowLeft size={14} /> Back to customers
      </Link>
      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="panel">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><UserRound size={20} /></span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-slate-900">{customer.name}</h2>
              <p className="mt-1 text-xs text-slate-400">Customer profile · Added {customer.createdAt.toLocaleDateString()}</p>
            </div>
          </div>
          {hasPermission(user, "customers", "update") ? (
            <CustomerForm customer={customer} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-2 text-xs text-slate-600"><Phone size={15} />{customer.phone}</div>
              <div className="flex gap-2 text-xs text-slate-600"><Mail size={15} />{customer.email ?? "No email provided"}</div>
              <div className="flex gap-2 text-xs text-slate-600"><MapPin size={15} />{customer.address ?? "No address provided"}</div>
            </div>
          )}
          {hasPermission(user, "customers", "delete") && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs font-semibold text-slate-700">Remove customer</p>
              <CustomerDeleteButton customerId={customer.id} />
            </div>
          )}
        </section>

        <section className="panel">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={17} className="text-blue-700" />
            <h2 className="section-title">Recent bookings</h2>
          </div>
          {bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
              <p className="text-xs font-medium text-slate-600">No bookings yet</p>
              <p className="mt-1 text-[11px] text-slate-400">Reservations for this customer will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bookings.map((booking) => (
                <div className="py-3 first:pt-0 last:pb-0" key={booking.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link className="text-xs font-semibold text-blue-700 hover:text-blue-900" href="/bookings">{booking.reference}</Link>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{booking.package?.name ?? "Custom booking"}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase text-slate-600">{booking.status.toLowerCase()}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    {booking.startDate ? booking.startDate.toLocaleDateString() : "Departure date not set"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
