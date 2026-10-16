"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Passenger = { id: string; name: string };
type PassengerDocument = {
  id: string;
  passenger_id: string;
  document_type: "passport" | "visa" | "other";
  storage_path: string;
  original_name: string;
  byte_size: number;
  created_at: string;
  downloadUrl: string;
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export function PassengerDocuments({ passengers, canUpload }: { passengers: Passenger[]; canUpload: boolean }) {
  const [documents, setDocuments] = useState<PassengerDocument[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshDocuments = useCallback(async () => {
    if (!passengers.length) {
      setDocuments([]);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const passengerIds = passengers.map((passenger) => passenger.id);
    const { data, error } = await supabase.from("documents")
      .select("id,passenger_id,document_type,storage_path,original_name,byte_size,created_at")
      .in("passenger_id", passengerIds)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Unable to load passenger documents: ${error.message}`);
    const fileRows = (data ?? []) as Omit<PassengerDocument, "downloadUrl">[];
    const withLinks = await Promise.all(fileRows.map(async (file) => {
      const { data: signed, error: linkError } = await supabase.storage
        .from("passenger-private").createSignedUrl(file.storage_path, 600);
      if (linkError) throw new Error(`Unable to authorize document access: ${linkError.message}`);
      return { ...file, downloadUrl: signed.signedUrl } as PassengerDocument;
    }));
    setDocuments(withLinks);
  }, [passengers]);

  useEffect(() => {
    let active = true;
    if (!passengers.length) return;
    createSupabaseBrowserClient();
    const load = async () => {
      try {
        await refreshDocuments();
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Unable to load private documents.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [passengers.length, refreshDocuments]);

  async function uploadDocument(event: FormEvent<HTMLFormElement>, passengerId: string) {
    event.preventDefault();
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const type = data.get("documentType");
    if (!(file instanceof File) || !file.size) {
      setMessage("Choose a document to upload.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage("Documents must be 10 MB or smaller.");
      return;
    }
    if (!allowedTypes.has(file.type)) {
      setMessage("Use a PDF, JPEG, or PNG document.");
      return;
    }
    if (type !== "passport" && type !== "visa" && type !== "other") {
      setMessage("Select a valid document type.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    setLoading(true);
    const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : "png";
    const storagePath = `passengers/${passengerId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("passenger-private").upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      setMessage(`Unable to upload private document: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      passenger_id: passengerId,
      document_type: type,
      storage_path: storagePath,
      original_name: file.name.slice(0, 255),
      content_type: file.type,
      byte_size: file.size,
    });
    if (insertError) {
      const { error: cleanupError } = await supabase.storage.from("passenger-private").remove([storagePath]);
      setMessage(cleanupError
        ? `Document metadata could not be saved (${insertError.message}); uploaded object cleanup failed (${cleanupError.message}).`
        : `Document metadata could not be saved; the uploaded file was removed. ${insertError.message}`);
      setLoading(false);
      return;
    }

    form.reset();
    try {
      await refreshDocuments();
      setMessage("Private document uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Uploaded successfully, but the document list could not refresh.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="mb-4"><h2 className="section-title">Private passenger documents</h2><p className="section-subtitle mt-1">Stored in the private Supabase bucket. Signed access links expire after 10 minutes.</p></div>
      {message && <p aria-live="polite" className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">{message}</p>}
      {loading && <p className="mb-3 text-xs text-slate-400">Loading document records...</p>}
      {!passengers.length ? <p className="text-xs text-slate-400">Create a passenger before attaching documents.</p> : (
        <div className="space-y-3">
          {passengers.map((passenger) => (
            <details className="rounded-lg border border-slate-200 p-4" key={passenger.id}>
              <summary className="cursor-pointer text-xs font-semibold text-slate-800">{passenger.name}</summary>
              <div className="mt-4 space-y-4">
                {canUpload && <form className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end" onSubmit={(event) => uploadDocument(event, passenger.id)}>
                  <label><span className="form-label">Document type</span><select className="form-input" name="documentType"><option value="passport">Passport</option><option value="visa">Visa</option><option value="other">Other</option></select></label>
                  <label><span className="form-label">PDF, JPEG, PNG · up to 10 MB</span><input accept="application/pdf,image/jpeg,image/png" className="form-input" name="file" required type="file" /></label>
                  <button className="button-primary" disabled={loading} type="submit">Upload private file</button>
                </form>}
                <ul className="divide-y divide-slate-100">
                  {documents.filter((document) => document.passenger_id === passenger.id).map((document) => (
                    <li className="flex items-center justify-between gap-3 py-2 text-xs" key={document.id}>
                      <span className="min-w-0 truncate text-slate-600">{document.document_type} · {document.original_name}</span>
                      <a className="shrink-0 font-medium text-blue-700 hover:text-blue-900" href={document.downloadUrl} rel="noreferrer" target="_blank">Open</a>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
