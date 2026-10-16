"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { decimalToMinorUnits, packageInput } from "@/lib/validations/package";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PackageFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function readPackageInput(formData: FormData) {
  return packageInput.safeParse({
    packageId: formData.get("packageId") ?? "",
    code: formData.get("code"),
    name: formData.get("name"),
    durationDays: formData.get("durationDays"),
    departureDate: formData.get("departureDate"),
    returnDate: formData.get("returnDate"),
    makkahHotel: formData.get("makkahHotel") ?? "",
    madinahHotel: formData.get("madinahHotel") ?? "",
    roomType: formData.get("roomType") ?? "",
    transportDetails: formData.get("transportDetails") ?? "",
    flightDetails: formData.get("flightDetails") ?? "",
    inclusions: formData.get("inclusions") ?? "",
    exclusions: formData.get("exclusions") ?? "",
    capacity: formData.get("capacity"),
    price: formData.get("price"),
    currency: formData.get("currency"),
    status: formData.get("status"),
  });
}

export async function savePackage(
  _previousState: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  const parsed = readPackageInput(formData);
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const isEditing = Boolean(input.packageId);
  await requirePermission("packages", isEditing ? "update" : "create");
  const details = {
    code: input.code.toUpperCase(),
    name: input.name,
    duration_days: input.durationDays,
    departure_date: input.departureDate,
    return_date: input.returnDate,
    makkahHotel: input.makkahHotel || null,
    madinahHotel: input.madinahHotel || null,
    roomType: input.roomType || null,
    transport_details: input.transportDetails || null,
    flight_details: input.flightDetails || null,
    inclusions: input.inclusions.trim() || null,
    exclusions: input.exclusions.trim() || null,
    capacity: input.capacity,
    price_minor: decimalToMinorUnits(input.price).toString(),
    currency: input.currency.toUpperCase(),
    status: input.status,
  };

  const supabase = await createSupabaseServerClient();
  const query = input.packageId
    ? supabase.from("umrah_packages").update(details).eq("id", input.packageId).select("id").maybeSingle()
    : supabase.from("umrah_packages").insert(details).select("id").single();
  const { data: record, error } = await query;
  if (error) {
    if (error.code === "23505") return { error: "A package with this code already exists." };
    if (error.code === "42501") return { error: "You do not have permission to save packages." };
    throw new Error(`Unable to save package: ${error.message}`);
  }
  if (!record) return { error: "This package no longer exists. Refresh the page and try again." };
  revalidatePath("/packages");
  revalidatePath(`/packages/${record.id}`);
  return { success: input.packageId ? "Package details saved." : "Package created." };
}

export async function deletePackage(
  _previousState: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  const packageId = formData.get("packageId");
  if (typeof packageId !== "string" || !/^[\w-]{8,40}$/.test(packageId)) {
    return { error: "The selected package is invalid." };
  }

  await requirePermission("packages", "delete");
  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("package_id", packageId);
  if (countError) throw new Error(`Unable to check package bookings: ${countError.message}`);
  if (count) return { error: "This package has bookings and cannot be deleted. Archive it instead." };

  const { error } = await supabase.from("umrah_packages").delete().eq("id", packageId);
  if (error?.code === "23503") return { error: "This package is linked to another record and cannot be deleted." };
  if (error) throw new Error(`Unable to delete package: ${error.message}`);
  revalidatePath("/packages");
  redirect("/packages");
}
