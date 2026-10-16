"use client";

import { useActionState } from "react";
import { deletePackage, type PackageFormState } from "@/app/actions/packages";

const initialState: PackageFormState = {};

export function PackageDeleteButton({ packageId }: { packageId: string }) {
  const [state, action, pending] = useActionState(deletePackage, initialState);

  return (
    <div>
      <form
        action={action}
        onSubmit={(event) => {
          if (!globalThis.confirm("Delete this package? Packages with bookings cannot be deleted.")) event.preventDefault();
        }}
      >
        <input name="packageId" type="hidden" value={packageId} />
        <button className="button-secondary !border-rose-200 !text-rose-700 hover:!bg-rose-50 disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Deleting..." : "Delete package"}
        </button>
      </form>
      {state.error && <p aria-live="polite" className="mt-2 text-xs text-rose-700">{state.error}</p>}
    </div>
  );
}
