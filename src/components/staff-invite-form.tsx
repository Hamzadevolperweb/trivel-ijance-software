"use client";

import { useActionState } from "react";
import { inviteStaff, type StaffActionState } from "@/app/actions/staff";

const roles = ["ADMIN", "MANAGER", "BOOKING_AGENT", "ACCOUNTS_OFFICER", "VISA_OFFICER"] as const;

export function StaffInviteForm() {
  const [state, action, pending] = useActionState(inviteStaff, {} as StaffActionState);
  return (
    <form action={action} className="panel space-y-4">
      <div><h2 className="section-title">Invite a staff member</h2><p className="section-subtitle mt-1">Supabase Auth sends the account invitation to their email.</p></div>
      {state.error && <p aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{state.error}</p>}
      {state.success && <p aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{state.success}</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <label><span className="form-label">Full name *</span><input className="form-input" maxLength={120} name="fullName" required /></label>
        <label><span className="form-label">Email address *</span><input className="form-input" maxLength={254} name="email" required type="email" /></label>
        <label><span className="form-label">Role *</span><select className="form-input" defaultValue="BOOKING_AGENT" name="role">{roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
      </div>
      <div className="flex justify-end"><button className="button-primary disabled:opacity-60" disabled={pending} type="submit">{pending ? "Sending invitation..." : "Invite staff"}</button></div>
    </form>
  );
}
