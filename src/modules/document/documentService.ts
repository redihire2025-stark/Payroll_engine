import { supabase } from '@/shared/lib/supabaseClient';
import { callNetlifyFunction } from '@/shared/lib/netlifyFunctions';

export interface DocumentRow {
  id: string;
  documentType: string;
  storagePath: string;
  verifiedAt: string | null;
  createdAt: string;
}

export async function listDocuments(employeeId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from('employee_documents')
    .select('id, document_type, storage_path, verified_at, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    documentType: r.document_type as string,
    storagePath: r.storage_path as string,
    verifiedAt: r.verified_at as string | null,
    createdAt: r.created_at as string,
  }));
}

export interface UploadDocumentInput {
  companyId: string;
  employeeId: string;
  documentType: string;
  file: File;
  uploadedBy: string;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<void> {
  const ext = input.file.name.split('.').pop() || 'bin';
  const path = `${input.companyId}/${input.employeeId}/${Date.now()}-${input.documentType.replace(/\s+/g, '-')}.${ext}`;
  const { error: uploadErr } = await supabase.storage.from('employee-documents').upload(path, input.file);
  if (uploadErr) throw uploadErr;

  const { error: insertErr } = await supabase.from('employee_documents').insert({
    employee_id: input.employeeId,
    document_type: input.documentType,
    storage_path: path,
    uploaded_by: input.uploadedBy,
  });
  if (insertErr) throw insertErr;
}

export async function getSignedDocumentUrl(documentId: string): Promise<string> {
  const { url } = await callNetlifyFunction<{ url: string }>('get-document-url', { documentId });
  return url;
}

export async function verifyDocument(documentId: string): Promise<void> {
  const { error } = await supabase.from('employee_documents').update({ verified_at: new Date().toISOString() }).eq('id', documentId);
  if (error) throw error;
}
