import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ShieldIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { getMyDeclaration, addDeclarationItem, uploadProofForItem, TAX_SECTIONS, type TaxDeclarationItemRow } from '@/modules/tax/taxService';
import { listMyForm16s, getSignedForm16Url } from '@/modules/tax/taxService';
import { currentFinancialYear } from '@/modules/tax/financialYear';

const itemStatusTone: Record<TaxDeclarationItemRow['status'], BadgeTone> = {
  declared: 'neutral',
  proof_uploaded: 'info',
  verified: 'success',
  rejected: 'danger',
};

export function TaxDeclarationPanel() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const financialYear = currentFinancialYear();
  const [section, setSection] = useState<string>(TAX_SECTIONS[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadItemId = useRef<string | null>(null);

  const { data: declaration, isLoading, error: loadError } = useQuery({
    queryKey: ['my-tax-declaration', user?.employeeId, financialYear],
    queryFn: () => getMyDeclaration(user!.employeeId, financialYear),
    enabled: Boolean(user?.employeeId),
  });
  const form16Query = useQuery({
    queryKey: ['my-form16s', user?.employeeId],
    queryFn: () => listMyForm16s(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });

  const addMutation = useMutation({
    mutationFn: () => addDeclarationItem(user!.companyId, user!.employeeId, financialYear, section, description.trim(), Number(amount)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tax-declaration', user?.employeeId, financialYear] });
      setDescription('');
      setAmount('');
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add declaration.'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProofForItem(pendingUploadItemId.current!, user!.companyId, user!.employeeId, file, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tax-declaration', user?.employeeId, financialYear] });
      setUploadingId(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Could not upload proof.');
      setUploadingId(null);
    },
  });

  async function handleOpenForm16(letterId: string) {
    setOpeningId(letterId);
    try {
      const url = await getSignedForm16Url(letterId);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that document.');
    } finally {
      setOpeningId(null);
    }
  }

  if (loadError) return <ErrorState message={(loadError as Error).message} />;
  if (isLoading) return <LoadingRows />;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-[12.5px] font-semibold text-text-faint">Financial Year {financialYear}</div>

      <form
        className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface p-4"
        onSubmit={(e) => { e.preventDefault(); setError(null); addMutation.mutate(); }}
      >
        <div className="flex gap-2">
          <select className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]" value={section} onChange={(e) => setSection(e.target.value)}>
            {TAX_SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="number"
            min="0"
            placeholder="Amount"
            className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <input
          placeholder="Description (optional)"
          className="rounded-lg border border-border bg-white px-3 py-2 text-[12.5px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {error && <p className="text-[11.5px] text-danger">{error}</p>}
        <button type="submit" disabled={!amount || addMutation.isPending} className="self-end rounded-lg bg-accent px-4 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">
          {addMutation.isPending ? 'Adding…' : 'Add Declaration'}
        </button>
      </form>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && pendingUploadItemId.current) {
            setError(null);
            uploadMutation.mutate(file);
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      {(declaration?.items.length ?? 0) === 0 ? (
        <EmptyState icon={<ShieldIcon width={20} height={20} />} title="No declarations yet" description="Add your investment declarations for this financial year." />
      ) : (
        <div className="flex flex-col gap-2">
          {declaration!.items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-surface p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-text">{item.section}</div>
                <Badge tone={itemStatusTone[item.status]}>{item.status.replace('_', ' ')}</Badge>
              </div>
              <div className="mt-0.5 text-[12px] text-text-muted">₹{item.declaredAmount.toLocaleString('en-IN')}{item.description ? ` — ${item.description}` : ''}</div>
              {item.status === 'declared' && (
                <button
                  disabled={uploadingId === item.id}
                  onClick={() => {
                    pendingUploadItemId.current = item.id;
                    setUploadingId(item.id);
                    fileInputRef.current?.click();
                  }}
                  className="mt-2 text-[11.5px] font-semibold text-accent"
                >
                  {uploadingId === item.id ? 'Uploading…' : 'Upload Proof'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 text-[12.5px] font-semibold text-text-faint">Form 16</div>
      {(form16Query.data ?? []).length === 0 ? (
        <p className="text-[12px] text-text-faint">No Form 16 generated yet — available once your admin runs it after year-end.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {(form16Query.data ?? []).map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
              <span className="text-[13px] font-medium text-text">{f.title}</span>
              <button disabled={openingId === f.id} onClick={() => handleOpenForm16(f.id)} className="text-[12px] font-semibold text-accent">
                {openingId === f.id ? 'Opening…' : 'View'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
