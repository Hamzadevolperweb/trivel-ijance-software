"use client";

import { useActionState } from "react";
import { deleteCustomer, type CustomerFormState } from "@/app/actions/customers";

const initialState: CustomerFormState = {};

export function CustomerDeleteButton({ customerId }: { customerId: string }) {
  const [state, action, pending] = useActionState(deleteCustomer, initialState);

  return (
    <div>
      <form
        action={action}
        onSubmit={(event) => {
          if (!globalThis.confirm("Delete this customer? This cannot be undone.")) event.preventDefault();
        }}
      >
        <input name="customerId" type="hidden" value={customerId} />
        <button className="button-secondary !border-rose-200 !text-rose-700 hover:!bg-rose-50 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Deleting..." : "Delete customer"}
        </button>
      </form>
      {state.error && <p aria-live="polite" className="mt-2 text-xs text-rose-700">{state.error}</p>}
      {state.success && <p aria-live="polite" className="mt-2 text-xs text-emerald-700">{state.success}</p>}
    </div>
  );
}
