"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { deleteModuleRecord, saveModuleRecord, type ModuleRecordState } from "@/app/actions/modules";
import type { DataField, DataModule } from "@/lib/data-modules";

type Row = { id: string; values: Record<string, unknown> };

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="button-primary disabled:opacity-60" disabled={pending} type="submit">
      {pending ? "Saving..." : editing ? "Save changes" : "Create record"}
    </button>
  );
}

function RecordForm({
  moduleKey,
  fields,
  record,
}: {
  moduleKey: string;
  fields: DataField[];
  record?: Row;
}) {
  const [state, action] = useActionState(saveModuleRecord, {} as ModuleRecordState);
  return (
    <form action={action} className="space-y-4">
      <input name="module" type="hidden" value={moduleKey} />
      {record && <input name="recordId" type="hidden" value={record.id} />}
      {state.error && <p aria-live="polite" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{state.error}</p>}
      {state.success && <p aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{state.success}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const kind = field.kind ?? "text";
          const value = record?.values[field.name];
          const defaultValue = kind === "datetime-local" && typeof value === "string"
            ? value.slice(0, 16)
            : kind === "date" && typeof value === "string"
              ? value.slice(0, 10)
              : value === null || value === undefined ? "" : String(value);
          const error = state.fieldErrors?.[field.name]?.[0];
          return (
            <label className={kind === "textarea" ? "block sm:col-span-2" : "block"} key={field.name}>
              <span className="form-label">{field.label}{field.required && <span className="text-rose-600"> *</span>}</span>
              {kind === "textarea" ? (
                <textarea className="form-textarea" defaultValue={defaultValue} maxLength={field.maxLength} name={field.name} required={field.required} rows={3} />
              ) : kind === "select" ? (
                <select className="form-input" defaultValue={defaultValue} name={field.name} required={field.required}>
                  {!field.required && <option value="">Not set</option>}
                  {field.options?.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ").toLowerCase()}</option>)}
                </select>
              ) : (
                <input
                  className="form-input"
                  defaultValue={defaultValue}
                  max={kind === "number" ? Number.MAX_SAFE_INTEGER : undefined}
                  maxLength={field.maxLength}
                  min={kind === "number" ? 0 : undefined}
                  name={field.name}
                  required={field.required}
                  step={kind === "number" ? 1 : undefined}
                  type={kind === "uuid" ? "text" : kind}
                />
              )}
              {error && <span className="form-error">{error}</span>}
            </label>
          );
        })}
      </div>
      <div className="flex justify-end"><SubmitButton editing={Boolean(record)} /></div>
    </form>
  );
}

function DeleteRecord({ moduleKey, recordId }: { moduleKey: string; recordId: string }) {
  const [state, action] = useActionState(deleteModuleRecord, {} as ModuleRecordState);
  return (
    <form action={action}>
      <input name="module" type="hidden" value={moduleKey} />
      <input name="recordId" type="hidden" value={recordId} />
      <button className="text-[11px] font-medium text-rose-700 hover:text-rose-900" onClick={(event) => {
        if (!window.confirm("Delete this record? This cannot be undone.")) event.preventDefault();
      }} type="submit">Delete</button>
      {state.error && <span className="text-[10px] text-rose-700">{state.error}</span>}
    </form>
  );
}

function EditRecord({ moduleKey, module, record }: { moduleKey: string; module: DataModule; record: Row }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="text-[11px] font-medium text-blue-700" onClick={() => setOpen(true)} type="button">Edit</button>
      {open && <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/30 p-4">
        <div className="mx-auto my-10 max-w-4xl rounded-xl bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="section-title">Edit {module.title.toLowerCase()}</h3>
            <button className="text-xs text-slate-500 hover:text-slate-800" onClick={() => setOpen(false)} type="button">Close</button>
          </div>
          <RecordForm moduleKey={moduleKey} fields={module.fields} record={record} />
        </div>
      </div>}
    </>
  );
}

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ModuleRecords({
  moduleKey,
  module,
  rows,
  total,
  search,
  page,
  pageCount,
  canCreate,
  canUpdate,
  canDelete,
}: {
  moduleKey: string;
  module: DataModule;
  rows: Row[];
  total: number;
  search: string;
  page: number;
  pageCount: number;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="panel">
        <div className="mb-4">
          <h2 className="section-title">{module.title} workspace</h2>
          <p className="section-subtitle mt-1">{module.description}</p>
        </div>
        {canCreate && !module.readOnly && (
          <details className="group rounded-lg border border-slate-200 p-4">
            <summary className="cursor-pointer text-xs font-semibold text-blue-700">Add {module.title.toLowerCase()} record</summary>
            <div className="mt-4 border-t border-slate-100 pt-4"><RecordForm moduleKey={moduleKey} fields={module.fields} /></div>
          </details>
        )}
        {moduleKey === "payments" && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <Link className="font-medium text-blue-700 hover:text-blue-900" href="/refunds">Manage refunds</Link>
            <Link className="font-medium text-blue-700 hover:text-blue-900" href="/supplier-payments">Manage supplier payments</Link>
          </div>
        )}
        {moduleKey === "reports" && <p className="text-xs text-slate-500">Reports use live, access-controlled records. Select the CSV export below to download a current dataset.</p>}
      </section>

      <section className="panel overflow-hidden !p-0">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <div><h2 className="section-title">{module.title} records</h2><p className="section-subtitle">{total} saved records</p></div>
          <form action={`/${moduleKey}`} className="flex gap-2">
            <input aria-label={`Search ${module.title.toLowerCase()}`} className="h-9 rounded-lg border border-slate-200 px-3 text-xs" defaultValue={search} maxLength={100} name="q" placeholder="Search records" />
            <button className="button-secondary !h-9 !min-h-9 !px-3" type="submit">Search</button>
            {moduleKey === "reports" && <Link className="button-secondary !h-9 !min-h-9 !px-3" href="/api/reports/export">Export CSV</Link>}
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead><tr className="border-b border-slate-100 bg-slate-50/70">
              {module.columns.map((column) => <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400" key={column.key}>{column.label}</th>)}
              {(canUpdate || canDelete) && <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Actions</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => <tr className="align-top hover:bg-slate-50/70" key={row.id}>
                {module.columns.map((column) => <td className="max-w-64 px-4 py-3 text-xs text-slate-600" key={column.key}>{display(row.values[column.key])}</td>)}
                {(canUpdate || canDelete) && <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {canUpdate && <EditRecord moduleKey={moduleKey} module={module} record={row} />}
                    {canDelete && module.allowDelete !== false && <DeleteRecord moduleKey={moduleKey} recordId={row.id} />}
                  </div>
                </td>}
              </tr>)}
              {!rows.length && <tr><td className="px-5 py-12 text-center text-xs text-slate-400" colSpan={module.columns.length + 1}>{search ? "No matching records." : `No ${module.title.toLowerCase()} records yet.`}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
          <span>Showing {total ? (page - 1) * 50 + 1 : 0}–{Math.min(page * 50, total)} of {total} · Supabase Row Level Security applies.</span>
          <div className="flex items-center gap-3">
            {page > 1 && <Link className="font-medium text-blue-700" href={`/${moduleKey}?${search ? `q=${encodeURIComponent(search)}&` : ""}page=${page - 1}`}>Previous</Link>}
            <span>Page {page} of {pageCount}</span>
            {page < pageCount && <Link className="font-medium text-blue-700" href={`/${moduleKey}?${search ? `q=${encodeURIComponent(search)}&` : ""}page=${page + 1}`}>Next</Link>}
          </div>
        </div>
      </section>
    </div>
  );
}
