"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { dataModules } from "@/lib/data-modules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ModuleRecordState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function saveModuleRecord(
  _previousState: ModuleRecordState,
  formData: FormData,
): Promise<ModuleRecordState> {
  const moduleKey = formData.get("module");
  if (typeof moduleKey !== "string" || !dataModules[moduleKey]) return { error: "This record type is not supported." };
  const definition = dataModules[moduleKey];
  const recordId = formData.get("recordId");
  const editing = typeof recordId === "string" && recordId.length > 0;
  if (moduleKey === "settings" && !editing) return { error: "Agency settings are not available." };
  await requirePermission(definition.resource, editing ? "update" : "create");

  const shape: Record<string, z.ZodType> = {};
  for (const field of definition.fields) {
    let schema: z.ZodType;
    if (field.kind === "uuid") schema = z.string().uuid();
    else if (field.kind === "number") schema = z.string().regex(/^\d+$/).transform(Number).refine(Number.isSafeInteger, "Enter a valid whole number.");
    else if (field.kind === "date") schema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
    else if (field.kind === "datetime-local") schema = z.string().min(1).max(40);
    else if (field.kind === "select") schema = z.enum(field.options as [string, ...string[]]);
    else if (field.kind === "email") schema = z.string().trim().email().max(field.maxLength ?? 254);
    else schema = z.string().trim().max(field.maxLength ?? 5000);

    if (field.required) {
      if (field.kind === "password" && editing) {
        shape[field.name] = z.string().trim().max(field.maxLength ?? 5000);
        continue;
      }
      if (field.kind === "text" || field.kind === "textarea" || field.kind === "password" || field.kind === undefined) {
        schema = (schema as z.ZodString).min(1, `${field.label} is required.`);
      }
      shape[field.name] = schema;
    } else if (field.kind === "uuid") {
      shape[field.name] = z.union([schema, z.literal("")]).transform((value) => value || null);
    } else if (field.kind === "number" || field.kind === "select") {
      shape[field.name] = z.union([schema, z.literal("")]).transform((value) => value === "" ? null : value);
    } else if (field.kind === "date" || field.kind === "datetime-local") {
      shape[field.name] = z.union([schema, z.literal("")]).transform((value) => value || null);
    } else if (field.kind === "email") {
      shape[field.name] = z.union([schema, z.literal("")]).transform((value) => value || null);
    } else {
      shape[field.name] = z.string().trim().max(field.maxLength ?? 5000).transform((value) => value || null);
    }
  }

  const input: Record<string, unknown> = {};
  for (const field of definition.fields) {
    const value = formData.get(field.name);
    if (typeof value !== "string") return { error: `Invalid value for ${field.label}.` };
    input[field.name] = value;
  }
  const parsed = z.object(shape).safeParse(input);
  if (!parsed.success) {
    return { error: "Check the fields and try again.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const payload = { ...parsed.data } as Record<string, unknown>;
  if (typeof payload.currency === "string") payload.currency = payload.currency.toUpperCase();
  for (const field of definition.fields) {
    if (field.kind === "password" && editing && payload[field.name] === "") delete payload[field.name];
  }
  for (const field of definition.fields) {
    if (field.kind === "datetime-local" && payload[field.name]) {
      const date = new Date(String(payload[field.name]));
      if (!Number.isFinite(date.getTime())) return { error: `Enter a valid ${field.label.toLowerCase()}.` };
      payload[field.name] = date.toISOString();
    }
  }
  if (moduleKey === "bookings") {
    const base = Number(payload.base_price_minor);
    const discount = Number(payload.discount_minor ?? 0);
    const additional = Number(payload.additional_charges_minor ?? 0);
    if (base - discount + additional !== Number(payload.total_payable_minor)) {
      return { error: "Total payable must equal base price minus discount plus additional charges." };
    }
    payload.discount_minor ??= 0;
    payload.additional_charges_minor ??= 0;
  }
  if (moduleKey === "settings") {
    payload.id = true;
    payload.updated_by = (await requirePermission("settings", "update")).id;
  }

  const supabase = await createSupabaseServerClient();
  const table = supabase.from(definition.table);
  const query = editing
    ? table.update(payload).eq("id", moduleKey === "settings" ? true : recordId).select("id").maybeSingle()
    : table.insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) {
    if (error.code === "23505") return { error: "A record with that reference already exists." };
    if (error.code === "23503") return { error: "A linked record does not exist or is not accessible." };
    if (error.code === "42501") return { error: "Your agency role does not allow this change." };
    if (error.code === "23514" || error.code === "22P02" || error.code === "22007") return { error: `The record does not meet database constraints: ${error.message}` };
    throw new Error(`Unable to save ${definition.title.toLowerCase()} record: ${error.message}`);
  }
  if (!data) return { error: "This record no longer exists. Refresh the page and try again." };
  revalidatePath(`/${moduleKey}`);
  revalidatePath("/");
  return { success: editing ? "Record updated." : "Record created." };
}

export async function deleteModuleRecord(
  _previousState: ModuleRecordState,
  formData: FormData,
): Promise<ModuleRecordState> {
  const moduleKey = formData.get("module");
  const recordId = formData.get("recordId");
  if (typeof moduleKey !== "string" || !dataModules[moduleKey] || typeof recordId !== "string" || !z.string().uuid().safeParse(recordId).success) {
    return { error: "Invalid record selection." };
  }
  const definition = dataModules[moduleKey];
  if (definition.allowDelete === false || moduleKey === "settings") return { error: "This record type cannot be deleted." };
  await requirePermission(definition.resource, "delete");
  const { data, error } = await (await createSupabaseServerClient())
    .from(definition.table).delete().eq("id", recordId).select("id").maybeSingle();
  if (error?.code === "23503") return { error: "This record is linked to other saved records and cannot be deleted." };
  if (error?.code === "42501") return { error: "Your agency role does not allow deleting this record." };
  if (error) throw new Error(`Unable to delete record: ${error.message}`);
  if (!data) return { error: "This record no longer exists or cannot be deleted." };
  revalidatePath(`/${moduleKey}`);
  revalidatePath("/");
  return { success: "Record deleted." };
}
