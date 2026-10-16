"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { customerInput } from "@/lib/validations/customer";

export type CustomerFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function readCustomerInput(formData: FormData) {
  return customerInput.safeParse({
    customerId: formData.get("customerId") ?? "",
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    nationality: formData.get("nationality") ?? "",
    address: formData.get("address") ?? "",
    emergencyContact: formData.get("emergencyContact") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function saveCustomer(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const parsed = readCustomerInput(formData);
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const input = parsed.data;
  const isEditing = Boolean(input.customerId);
  await requirePermission("customers", isEditing ? "update" : "create");
  const details = {
    full_name: input.name,
    phone: input.phone,
    email: input.email ? input.email.toLowerCase() : null,
    nationality: input.nationality || null,
    address: input.address || null,
    emergency_contact: input.emergencyContact || null,
    notes: input.notes || null,
  };

  const supabase = await createSupabaseServerClient();
  const query = input.customerId
    ? supabase.from("customers").update(details).eq("id", input.customerId).select("id").maybeSingle()
    : supabase.from("customers").insert(details).select("id").single();
  const { data: customer, error } = await query;

  if (error) {
    if (error.code === "23505") return { error: "A customer with this email address already exists." };
    if (error.code === "42501") return { error: "You do not have permission to save customers." };
    throw new Error(`Unable to save customer: ${error.message}`);
  }
  if (!customer) return { error: "This customer no longer exists. Refresh the page and try again." };
  revalidatePath("/customers");
  revalidatePath(`/customers/${customer.id}`);
  return { success: input.customerId ? "Customer details saved." : "Customer added." };
}

export async function deleteCustomer(
  _previousState: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const customerId = formData.get("customerId");
  if (typeof customerId !== "string" || !/^[\w-]{8,40}$/.test(customerId)) {
    return { error: "The selected customer is invalid." };
  }

  await requirePermission("customers", "delete");
  const supabase = await createSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  if (countError) throw new Error(`Unable to check customer bookings: ${countError.message}`);
  if (count) return { error: "This customer has bookings and cannot be deleted. Keep the record for its booking history." };

  const { error } = await supabase.from("customers").delete().eq("id", customerId);
  if (error?.code === "23503") return { error: "This customer is still linked to another record and cannot be deleted." };
  if (error) throw new Error(`Unable to delete customer: ${error.message}`);
  revalidatePath("/customers");
  redirect("/customers");
}
