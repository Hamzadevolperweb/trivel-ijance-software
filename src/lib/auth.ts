import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "BOOKING_AGENT"
  | "ACCOUNTS_OFFICER"
  | "VISA_OFFICER";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: { name: UserRole };
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*:*"],
  ADMIN: ["*:*"],
  MANAGER: ["*:*", "-staff:*", "-payments:delete", "-refunds:delete", "-supplier_payments:delete", "-expenses:delete", "-invoices:delete"],
  BOOKING_AGENT: [
    "dashboard:read",
    "customers:*",
    "packages:*",
    "bookings:*",
    "passengers:*",
    "visas:read",
    "flights:*",
    "hotels:*",
    "transport:*",
    "suppliers:*",
    "notifications:*",
  ],
  ACCOUNTS_OFFICER: [
    "dashboard:read",
    "customers:read",
    "bookings:read",
    "suppliers:read",
    "payments:*",
    "refunds:*",
    "supplier_payments:*",
    "expenses:*",
    "invoices:*",
    "reports:read",
    "notifications:*",
    "-payments:delete",
    "-refunds:delete",
    "-supplier_payments:delete",
    "-expenses:delete",
    "-invoices:delete",
  ],
  VISA_OFFICER: [
    "dashboard:read",
    "bookings:read",
    "passengers:*",
    "visas:*",
    "notifications:*",
  ],
};

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) {
    if (authError.status === 401 || authError.status === 403) return null;
    throw authError;
  }
  if (!authData.user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,active")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (error) throw new Error(`Unable to load your staff profile: ${error.message}`);
  if (!profile || !profile.active) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    role: { name: profile.role as UserRole },
  };
}

export function hasPermission(user: AuthenticatedUser, resource: string, action: string) {
  const permissions = ROLE_PERMISSIONS[user.role.name] ?? [];
  const denied = permissions.some((permission) => {
    if (!permission.startsWith("-")) return false;
    const [deniedResource, deniedAction] = permission.slice(1).split(":");
    return deniedResource === resource && (deniedAction === "*" || deniedAction === action);
  });
  if (denied) return false;

  return permissions.some((permission) => {
    if (permission.startsWith("-")) return false;
    const [allowedResource, allowedAction] = permission.split(":");
    return (
      (allowedResource === "*" || allowedResource === resource) &&
      (allowedAction === "*" || allowedAction === action)
    );
  });
}

export async function requirePermission(resource: string, action: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, resource, action)) redirect("/unauthorized");
  return user;
}
