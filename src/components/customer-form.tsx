"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveCustomer, type CustomerFormState } from "@/app/actions/customers";

type CustomerValues = {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  nationality?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
};

const emptyState: CustomerFormState = {};

function TextField({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}{required && <span className="text-rose-600"> *</span>}
      </span>
      <input
        aria-invalid={Boolean(error)}
        className={`h-10 w-full rounded-lg border px-3 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${error ? "border-rose-300" : "border-slate-200"}`}
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
        type={type}
      />
      {error && <span className="mt-1 block text-[11px] text-rose-700">{error}</span>}
    </label>
  );
}

export function CustomerForm({ customer, compact = false }: { customer?: CustomerValues; compact?: boolean }) {
  const [state, action, pending] = useActionState(saveCustomer, emptyState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!customer?.id && state.success) formRef.current?.reset();
  }, [customer?.id, state.success]);

  const errors = state.fieldErrors;

  return (
    <form action={action} className="space-y-4" ref={formRef}>
      {customer?.id && <input name="customerId" type="hidden" value={customer.id} />}
      {state.error && (
        <p aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {state.error}
        </p>
      )}
      {state.success && (
        <p aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {state.success}
        </p>
      )}
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "md:grid-cols-2"}`}>
        <TextField defaultValue={customer?.name} error={errors?.name?.[0]} label="Full name" name="name" required />
        <TextField defaultValue={customer?.phone} error={errors?.phone?.[0]} label="Phone" name="phone" required type="tel" />
        <TextField defaultValue={customer?.email} error={errors?.email?.[0]} label="Email" name="email" type="email" />
        <TextField defaultValue={customer?.nationality} error={errors?.nationality?.[0]} label="Nationality" name="nationality" />
        <TextField defaultValue={customer?.emergencyContact} error={errors?.emergencyContact?.[0]} label="Emergency contact" name="emergencyContact" type="tel" />
        {!compact && <TextField defaultValue={customer?.address} error={errors?.address?.[0]} label="Address" name="address" />}
      </div>
      {!compact && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-700">Notes</span>
          <textarea
            className="min-h-20 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            defaultValue={customer?.notes ?? ""}
            name="notes"
            rows={3}
          />
          {errors?.notes?.[0] && <span className="mt-1 block text-[11px] text-rose-700">{errors.notes[0]}</span>}
        </label>
      )}
      {compact && (
        <>
          <input name="address" type="hidden" value="" />
          <input name="notes" type="hidden" value="" />
        </>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-slate-400">Fields marked * are required.</p>
        <button className="button-primary disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Saving..." : customer?.id ? "Save changes" : "Add customer"}
        </button>
      </div>
    </form>
  );
}
