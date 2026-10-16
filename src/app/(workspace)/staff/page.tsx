import { setStaffActive } from "@/app/actions/staff";
import { StaffInviteForm } from "@/components/staff-invite-form";
import { hasPermission, requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  BOOKING_AGENT: "Booking Agent",
  ACCOUNTS_OFFICER: "Accounts Officer",
  VISA_OFFICER: "Visa Officer",
};

export default async function StaffPage() {
  const user = await requirePermission("staff", "read");
  const supabase = await createSupabaseServerClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,active,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Unable to load staff accounts: ${error.message}`);

  return (
    <div className="space-y-5">
      {hasPermission(user, "staff", "create") && <StaffInviteForm />}
      <section className="panel overflow-hidden !p-0">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="section-title">Staff accounts</h2><p className="section-subtitle mt-1">{profiles.length} accounts</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead><tr className="border-b border-slate-100 bg-slate-50/70">{["Name", "Email", "Role", "Status", "Created", "Access"].map((column) => <th className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400" key={column}>{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{profiles.map((profile) => (
              <tr key={profile.id}>
                <td className="px-4 py-3 text-xs font-semibold text-slate-800">{profile.full_name}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{profile.email}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{roleLabels[profile.role] ?? profile.role}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{profile.active ? "Active" : "Inactive"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{new Date(profile.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {hasPermission(user, "staff", "update") && profile.role !== "SUPER_ADMIN" && profile.id !== user.id ? (
                    <form action={setStaffActive}>
                      <input name="userId" type="hidden" value={profile.id} />
                      <input name="active" type="hidden" value={String(!profile.active)} />
                      <button className="text-xs font-medium text-blue-700 hover:text-blue-900" type="submit">{profile.active ? "Deactivate" : "Activate"}</button>
                    </form>
                  ) : <span className="text-[11px] text-slate-400">{profile.id === user.id ? "Current account" : "Protected account"}</span>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
