import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!hasPermission(user, "reports", "read")) return NextResponse.json({ error: "Access denied." }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  const outputRows: unknown[][] = [["record_type", "id", "date", "reference", "status", "amount_minor", "currency", "details"]];

  const exportPages = async <T,>(tableName: string, select: string, toRow: (row: T) => unknown[]) => {
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await supabase.from(tableName).select(select).range(offset, offset + pageSize - 1);
      if (error) throw new Error(`Unable to export ${tableName}: ${error.message}`);
      const rows = (data ?? []) as T[];
      outputRows.push(...rows.map(toRow));
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
  };

  await Promise.all([
    exportPages("bookings", "id,created_at,reference,status,total_payable_minor,currency,customer_id", (row: {
      id: string; created_at: string; reference: string; status: string; total_payable_minor: string; currency: string; customer_id: string;
    }) => ["booking", row.id, row.created_at, row.reference, row.status, row.total_payable_minor, row.currency, `customer_id=${row.customer_id}`]),
    exportPages("payments", "id,created_at,reference,status,amount_minor,currency,booking_id,method", (row: {
      id: string; created_at: string; reference: string | null; status: string; amount_minor: string; currency: string; booking_id: string; method: string;
    }) => ["payment", row.id, row.created_at, row.reference, row.status, row.amount_minor, row.currency, `booking_id=${row.booking_id}; method=${row.method}`]),
    exportPages("expenses", "id,spent_at,category,amount_minor,currency,description", (row: {
      id: string; spent_at: string; category: string; amount_minor: string; currency: string; description: string;
    }) => ["expense", row.id, row.spent_at, row.category, "", row.amount_minor, row.currency, row.description]),
    exportPages("invoices", "id,issued_at,number,status,amount_minor,currency,booking_id", (row: {
      id: string; issued_at: string; number: string; status: string; amount_minor: string; currency: string; booking_id: string;
    }) => ["invoice", row.id, row.issued_at, row.number, row.status, row.amount_minor, row.currency, `booking_id=${row.booking_id}`]),
  ]);

  const csv = outputRows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="safardesk-report.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
