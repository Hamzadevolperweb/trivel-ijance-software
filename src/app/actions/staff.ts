"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const roles = ["ADMIN", "MANAGER", "BOOKING_AGENT", "ACCOUNTS_OFFICER", "VISA_OFFICER"] as const;
const inviteSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  role: z.enum(roles),
});

export type StaffActionState = { error?: string; success?: string };

export async function inviteStaff(_state: StaffActionState, formData: FormData): Promise<StaffActionState> {
  await requirePermission("staff", "create");
  const parsed = inviteSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the invitation details." };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email.toLowerCase(), {
    data: { full_name: parsed.data.fullName },
  });
  if (error) return { error: `Unable to invite staff member: ${error.message}` };
  if (!data.user) return { error: "Supabase did not return the invited user." };

  const { data: profile, error: profileError } = await admin.from("profiles").update({
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    active: true,
  }).eq("id", data.user.id).select("id").maybeSingle();
  if (profileError || !profile) {
    const { error: rollbackError } = await admin.auth.admin.deleteUser(data.user.id);
    if (rollbackError) {
      throw new Error(`Invitation was created but the staff profile failed and cleanup also failed: ${profileError?.message ?? "staff profile not found"}; ${rollbackError.message}`);
    }
    throw new Error(`Invitation profile setup failed; the incomplete Auth invitation was removed: ${profileError?.message ?? "staff profile not found"}`);
  }

  revalidatePath("/staff");
  return { success: `Invitation sent to ${parsed.data.email.toLowerCase()}.` };
}

export async function setStaffActive(formData: FormData) {
  const currentUser = await requirePermission("staff", "update");
  const userId = formData.get("userId");
  const activeValue = formData.get("active");
  if (typeof userId !== "string" || !z.string().uuid().safeParse(userId).success || (activeValue !== "true" && activeValue !== "false")) {
    throw new Error("Invalid staff account selection.");
  }
  if (userId === currentUser.id) throw new Error("You cannot deactivate your own account.");

  const admin = createSupabaseAdminClient();
  const { data: profile, error: readError } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (readError) throw new Error(`Unable to check the staff account: ${readError.message}`);
  if (!profile) throw new Error("The selected staff account no longer exists.");
  if (profile.role === "SUPER_ADMIN") throw new Error("The Super Admin account cannot be deactivated here.");

  const { data: updatedProfile, error } = await admin.from("profiles").update({ active: activeValue === "true" })
    .eq("id", userId).select("id").maybeSingle();
  if (error) throw new Error(`Unable to update staff access: ${error.message}`);
  if (!updatedProfile) throw new Error("The selected staff account could not be updated.");
  revalidatePath("/staff");
}
