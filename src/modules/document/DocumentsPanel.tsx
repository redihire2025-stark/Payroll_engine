import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { LoadingRows, EmptyState } from '@/shared/ui/EmptyState';
import { FileTextIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listDocuments, uploadDocument, getSignedDocumentUrl, verifyDocument } from './documentService';

/** Shared between the admin Employee Detail page and the ESS Profile page — the only difference is whether Verify is shown. */
export function DocumentsPanel({ employeeId, canVerify = false }: { employeeId: string; canVerify?: boolean }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['documents', employeeId], queryFn: () => listDocuments(employeeId) });
  const documents = data ?? [];

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadDocument({ companyId: user!.companyId, employeeId, documentType: documentType.trim() || 'Document', file, uploadedBy: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', employeeId] });
      setDocumentType('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not upload that file.'),
  });

  const verifyMutation = useMutation({
    mutationFn: (documentId: string) => verifyDocument(documentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', employeeId] }),
  });

  async function handleOpen(documentId: string) {
    setOpeningId(documentId);
    try {
      const url = await getSignedDocumentUrl(documentId);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that document.');
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          placeholder="Document type (e.g. PAN Card)"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-[13px]"
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setError(null);
              uploadMutation.mutate(file);
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
        <Button size="sm" variant="secondary" disabled={uploadMutation.isPending} onClick={() => fileInputRef.current?.click()}>
          {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </div>
      {error && <p className="text-[11.5px] text-danger">{error}</p>}

      {isLoading ? (
        <LoadingRows />
      ) : documents.length === 0 ? (
        <EmptyState icon={<FileTextIcon width={18} height={18} />} title="No documents yet" description="Uploaded documents will appear here." />
      ) : (
        <div className="flex flex-col gap-1.5">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-border-soft px-3 py-2 text-[12.5px]">
              <button onClick={() => handleOpen(d.id)} disabled={openingId === d.id} className="truncate text-left font-medium text-accent">
                {openingId === d.id ? 'Opening…' : d.documentType}
              </button>
              <div className="flex items-center gap-2">
                {d.verifiedAt ? (
                  <Badge tone="success">Verified</Badge>
                ) : canVerify ? (
                  <Button size="sm" variant="secondary" disabled={verifyMutation.isPending} onClick={() => verifyMutation.mutate(d.id)}>
                    Verify
                  </Button>
                ) : (
                  <Badge tone="neutral">Pending</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
