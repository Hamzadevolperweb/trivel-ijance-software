"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Booking = { id: string; reference: string };
type Passenger = { id: string; passport_name: string };
type Assignment = { booking_id: string; passenger_id: string };

export function BookingPassengers({
  bookings,
  canManage,
}: {
  bookings: Booking[];
  canManage: boolean;
}) {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadAssignments() {
    const supabase = createSupabaseBrowserClient();
    const passengerResult = await supabase.from("passengers")
      .select("id,passport_name").order("passport_name").limit(500);
    if (passengerResult.error) throw new Error(`Unable to load passengers: ${passengerResult.error.message}`);
    setPassengers(passengerResult.data ?? []);
    if (bookings.length) {
      const assignmentResult = await supabase.from("booking_passengers")
        .select("booking_id,passenger_id").in("booking_id", bookings.map((booking) => booking.id));
      if (assignmentResult.error) throw new Error(`Unable to load booking assignments: ${assignmentResult.error.message}`);
      setAssignments(assignmentResult.data ?? []);
    }
    setLoaded(true);
  }

  async function addPassenger(event: FormEvent<HTMLFormElement>, bookingId: string) {
    event.preventDefault();
    const passengerId = selected[bookingId];
    if (!passengerId) {
      setMessage("Select a passenger first.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await createSupabaseBrowserClient().from("booking_passengers")
      .insert({ booking_id: bookingId, passenger_id: passengerId });
    if (error) {
      setMessage(error.code === "23505" ? "This passenger is already linked to the booking." : `Unable to assign passenger: ${error.message}`);
      setBusy(false);
      return;
    }
    try {
      await loadAssignments();
      setMessage("Passenger assigned.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Passenger assigned, but the list could not refresh.");
    } finally {
      setBusy(false);
    }
  }

  async function removePassenger(assignment: Assignment) {
    setBusy(true);
    setMessage("");
    const { error } = await createSupabaseBrowserClient().from("booking_passengers")
      .delete().eq("booking_id", assignment.booking_id).eq("passenger_id", assignment.passenger_id);
    if (error) {
      setMessage(`Unable to remove passenger assignment: ${error.message}`);
      setBusy(false);
      return;
    }
    try {
      await loadAssignments();
      setMessage("Passenger removed from booking.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment removed, but the list could not refresh.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <details onToggle={(event) => {
        if ((event.currentTarget as HTMLDetailsElement).open && !loaded && !busy) {
          setBusy(true);
          void loadAssignments().catch((error: unknown) => {
            setMessage(error instanceof Error ? error.message : "Unable to load booking assignments.");
          }).finally(() => setBusy(false));
        }
      }}>
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">Passenger assignments</summary>
        <p className="mt-1 text-xs text-slate-400">Link passenger records to their bookings.</p>
        {message && <p aria-live="polite" className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">{message}</p>}
        {busy && <p className="mt-3 text-xs text-slate-400">Loading...</p>}
        {loaded && <div className="mt-4 divide-y divide-slate-100">
          {bookings.map((booking) => {
            const linked = assignments.filter((assignment) => assignment.booking_id === booking.id);
            return <div className="py-3 first:pt-0 last:pb-0" key={booking.id}>
              <p className="text-xs font-semibold text-slate-700">{booking.reference}</p>
              {canManage && <form className="mt-2 flex flex-wrap gap-2" onSubmit={(event) => addPassenger(event, booking.id)}>
                <select aria-label={`Select passenger for booking ${booking.reference}`} className="form-input min-w-64 flex-1" onChange={(event) => setSelected({ ...selected, [booking.id]: event.target.value })} value={selected[booking.id] ?? ""}>
                  <option value="">Select passenger</option>
                  {passengers.map((passenger) => <option key={passenger.id} value={passenger.id}>{passenger.passport_name} · {passenger.id}</option>)}
                </select>
                <button className="button-secondary" disabled={busy} type="submit">Assign</button>
              </form>}
              {linked.length ? <ul className="mt-2 space-y-1">
                {linked.map((assignment) => {
                  const passenger = passengers.find((item) => item.id === assignment.passenger_id);
                  return <li className="flex items-center justify-between gap-3 text-xs text-slate-600" key={assignment.passenger_id}>
                    <span>{passenger?.passport_name ?? assignment.passenger_id}</span>
                    {canManage && <button className="text-rose-700" disabled={busy} onClick={() => void removePassenger(assignment)} type="button">Remove</button>}
                  </li>;
                })}
              </ul> : <p className="mt-2 text-[11px] text-slate-400">No passengers assigned.</p>}
            </div>;
          })}
        </div>}
        {!canManage && <p className="mt-3 text-xs text-slate-500">Read-only access.</p>}
        {!bookings.length && <p className="mt-3 text-xs text-slate-400">Create a booking first.</p>}
      </details>
    </section>
  );
}
