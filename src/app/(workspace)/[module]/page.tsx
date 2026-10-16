import { notFound } from "next/navigation";
import { BookingPassengers } from "@/components/booking-passengers";
import { ModuleRecords } from "@/components/module-records";
import { PassengerDocuments } from "@/components/passenger-documents";
import { hasPermission, requirePermission } from "@/lib/auth";
import { dataModules } from "@/lib/data-modules";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { module: moduleSlug } = await params;
  const definition = dataModules[moduleSlug];

  return definition ? { title: definition.title } : {};
}

export default async function ModulePage({ params, searchParams }: Props) {
  const [{ module: moduleSlug }, queryParams] = await Promise.all([params, searchParams]);
  const definition = dataModules[moduleSlug];
  if (!definition) notFound();
  const user = await requirePermission(definition.resource, "read");
  const search = (queryParams.q ?? "").trim().slice(0, 100);
  const requestedPage = Number.parseInt(queryParams.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const supabase = await createSupabaseServerClient();
  const sort = definition.orderBy ?? "created_at";
  const pageSize = 50;
  let countQuery = supabase.from(definition.table).select("id", { count: "exact", head: true });
  if (search && definition.searchColumn) countQuery = countQuery.ilike(definition.searchColumn, `%${search}%`);
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(`Unable to count ${definition.title.toLowerCase()}: ${countError.message}`);
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  let query = supabase.from(definition.table).select("*");
  if (search && definition.searchColumn) query = query.ilike(definition.searchColumn, `%${search}%`);
  query = query.order(sort, { ascending: sort === "check_in" || sort === "travel_at" || sort === "departure_at" });
  const { data, error } = await query.range((safePage - 1) * pageSize, safePage * pageSize - 1);
  if (error) throw new Error(`Unable to load ${definition.title.toLowerCase()}: ${error.message}`);
  const safeRows = (data ?? []).map((row) => {
    const safeValues: Record<string, unknown> = {};
    for (const column of definition.columns) safeValues[column.key] = row[column.key];
    for (const field of definition.fields) {
      if (field.kind !== "password") safeValues[field.name] = row[field.name];
    }
    return {
      id: String(row.id ?? true),
      values: safeValues,
    };
  });

  return (
    <>
    <ModuleRecords
      canCreate={hasPermission(user, definition.resource, "create")}
      canDelete={hasPermission(user, definition.resource, "delete")}
      canUpdate={hasPermission(user, definition.resource, "update")}
      module={definition}
      moduleKey={moduleSlug}
      page={safePage}
      pageCount={pageCount}
      rows={safeRows}
      search={search}
      total={total}
    />
    {moduleSlug === "bookings" && (
      <BookingPassengers
        bookings={safeRows.map((row) => ({ id: row.id, reference: String(row.values.reference ?? "") }))}
        canManage={hasPermission(user, "bookings", "create")}
      />
    )}
    {moduleSlug === "passengers" && hasPermission(user, "passengers", "read") && (
      <PassengerDocuments
        canUpload={hasPermission(user, "passengers", "create") || hasPermission(user, "visas", "create")}
        passengers={safeRows.map((row) => ({
          id: row.id,
          name: String(row.values.passport_name ?? "Passenger"),
        }))}
      />
    )}
    </>
  );
}
