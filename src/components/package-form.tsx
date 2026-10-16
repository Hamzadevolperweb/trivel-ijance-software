"use client";

import { useActionState, useEffect, useRef } from "react";
import { savePackage, type PackageFormState } from "@/app/actions/packages";

type PackageValues = {
  id?: string;
  code?: string;
  name?: string;
  durationDays?: number;
  departureDate?: Date;
  returnDate?: Date;
  makkahHotel?: string | null;
  madinahHotel?: string | null;
  roomType?: string | null;
  transportDetails?: string | null;
  flightDetails?: string | null;
  inclusions?: string[];
  exclusions?: string[];
  capacity?: number;
  priceMinor?: string;
  currency?: string;
  status?: "DRAFT" | "ACTIVE" | "FULL" | "ARCHIVED";
};

const initialState: PackageFormState = {};
const statuses = ["DRAFT", "ACTIVE", "FULL", "ARCHIVED"] as const;

function inputDate(date?: Date) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function inputPrice(priceMinor?: string) {
  if (priceMinor === undefined) return "";
  const value = BigInt(priceMinor);
  const absolute = value < BigInt(0) ? -value : value;
  return `${absolute / BigInt(100)}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}

export function PackageForm({ travelPackage }: { travelPackage?: PackageValues }) {
  const [state, action, pending] = useActionState(savePackage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors;

  useEffect(() => {
    if (!travelPackage?.id && state.success) formRef.current?.reset();
  }, [travelPackage?.id, state.success]);

  const detailFields = [
    { label: "Makkah hotel", name: "makkahHotel", value: travelPackage?.makkahHotel, maxLength: 120 },
    { label: "Madinah hotel", name: "madinahHotel", value: travelPackage?.madinahHotel, maxLength: 120 },
    { label: "Room type", name: "roomType", value: travelPackage?.roomType, maxLength: 60 },
    { label: "Flight details", name: "flightDetails", value: travelPackage?.flightDetails, maxLength: 500 },
    { label: "Transport details", name: "transportDetails", value: travelPackage?.transportDetails, maxLength: 500 },
  ];

  return (
    <form action={action} className="space-y-5" ref={formRef}>
      {travelPackage?.id && <input name="packageId" type="hidden" value={travelPackage.id} />}
      {state.error && <p aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{state.error}</p>}
      {state.success && <p aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{state.success}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="form-label">Package code *</span>
          <input className="form-input" defaultValue={travelPackage?.code} maxLength={30} name="code" required />
          {errors?.code?.[0] && <span className="form-error">{errors.code[0]}</span>}
        </label>
        <label className="block sm:col-span-2 lg:col-span-2">
          <span className="form-label">Package name *</span>
          <input className="form-input" defaultValue={travelPackage?.name} maxLength={120} name="name" required />
          {errors?.name?.[0] && <span className="form-error">{errors.name[0]}</span>}
        </label>
        <label className="block">
          <span className="form-label">Departure date *</span>
          <input className="form-input" defaultValue={inputDate(travelPackage?.departureDate)} name="departureDate" required type="date" />
          {errors?.departureDate?.[0] && <span className="form-error">{errors.departureDate[0]}</span>}
        </label>
        <label className="block">
          <span className="form-label">Return date *</span>
          <input className="form-input" defaultValue={inputDate(travelPackage?.returnDate)} name="returnDate" required type="date" />
          {errors?.returnDate?.[0] && <span className="form-error">{errors.returnDate[0]}</span>}
        </label>
        <label className="block">
          <span className="form-label">Duration (days) *</span>
          <input className="form-input" defaultValue={travelPackage?.durationDays ?? 14} min={1} max={90} name="durationDays" required type="number" />
          {errors?.durationDays?.[0] && <span className="form-error">{errors.durationDays[0]}</span>}
        </label>
        <label className="block">
          <span className="form-label">Capacity *</span>
          <input className="form-input" defaultValue={travelPackage?.capacity ?? 1} min={1} max={10000} name="capacity" required type="number" />
          {errors?.capacity?.[0] && <span className="form-error">{errors.capacity[0]}</span>}
        </label>
        <label className="block">
          <span className="form-label">Price per passenger *</span>
          <input className="form-input" defaultValue={inputPrice(travelPackage?.priceMinor)} inputMode="decimal" name="price" placeholder="250000.00" required />
          {errors?.price?.[0] && <span className="form-error">{errors.price[0]}</span>}
        </label>
        <label className="block">
          <span className="form-label">Currency code *</span>
          <input className="form-input uppercase" defaultValue={travelPackage?.currency ?? "PKR"} maxLength={3} minLength={3} name="currency" required />
          {errors?.currency?.[0] && <span className="form-error">{errors.currency[0]}</span>}
        </label>
        <label className="block">
          <span className="form-label">Status *</span>
          <select className="form-input" defaultValue={travelPackage?.status ?? "DRAFT"} name="status">
            {statuses.map((status) => <option key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>)}
          </select>
          {errors?.status?.[0] && <span className="form-error">{errors.status[0]}</span>}
        </label>
      </div>

      <details className="rounded-lg border border-slate-100 px-4 py-3">
        <summary className="cursor-pointer text-xs font-semibold text-slate-700">Accommodation, travel, and package details</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {detailFields.map(({ label, name, value, maxLength }) => (
            <label className="block" key={name}>
              <span className="form-label">{label}</span>
              <input className="form-input" defaultValue={value ?? ""} maxLength={maxLength} name={name} />
            </label>
          ))}
          <label className="block">
            <span className="form-label">Inclusions (one per line)</span>
            <textarea className="form-textarea" defaultValue={travelPackage?.inclusions?.join("\n")} maxLength={2000} name="inclusions" rows={3} />
            {errors?.inclusions?.[0] && <span className="form-error">{errors.inclusions[0]}</span>}
          </label>
          <label className="block">
            <span className="form-label">Exclusions (one per line)</span>
            <textarea className="form-textarea" defaultValue={travelPackage?.exclusions?.join("\n")} maxLength={2000} name="exclusions" rows={3} />
            {errors?.exclusions?.[0] && <span className="form-error">{errors.exclusions[0]}</span>}
          </label>
        </div>
      </details>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-slate-400">Price is entered in major currency units; it is stored as integer minor units.</p>
        <button className="button-primary disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Saving..." : travelPackage?.id ? "Save changes" : "Create package"}</button>
      </div>
    </form>
  );
}
