import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { PlusIcon, WalletIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listAssets, createAsset, issueAsset, returnAsset } from '@/modules/asset/assetService';
import { listEmployeesLite } from '@/modules/employee/employeeService';

const statusTone = { available: 'success', assigned: 'info', maintenance: 'warning', retired: 'neutral' } as const;
const cols = '1.6fr 1fr 1fr 1.2fr 1fr';

function NewAssetModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => createAsset(companyId, name.trim(), category.trim(), serialNumber.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create asset.'),
  });
  return (
    <Modal title="New Asset" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input placeholder="Name (e.g. MacBook Pro 14)" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <Input placeholder="Category (e.g. Laptop)" value={category} onChange={(e) => setCategory(e.target.value)} required />
        <Input placeholder="Serial number (optional)" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || !category.trim() || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function IssueAssetModal({ companyId, assetId, onClose }: { companyId: string; assetId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const employeesQuery = useQuery({ queryKey: ['employees-lite', companyId], queryFn: () => listEmployeesLite(companyId) });
  const [employeeId, setEmployeeId] = useState('');
  const [condition, setCondition] = useState('Good');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => issueAsset(assetId, employeeId, condition),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not issue asset.'),
  });
  return (
    <Modal title="Issue Asset" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <select className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
          <option value="">Select employee…</option>
          {(employeesQuery.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
        </select>
        <Input placeholder="Condition on issue" value={condition} onChange={(e) => setCondition(e.target.value)} />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!employeeId || mutation.isPending}>{mutation.isPending ? 'Issuing…' : 'Issue'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Assets() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['assets', companyId], queryFn: () => listAssets(companyId) });
  const assets = data ?? [];

  const returnMutation = useMutation({
    mutationFn: (assetId: string) => returnAsset(assetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', companyId] }),
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Assets</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">Company equipment issued to employees</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />} onClick={() => setShowNew(true)}>New Asset</Button>
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : assets.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<WalletIcon width={20} height={20} />} title="No assets yet" description="Add company equipment to start tracking issue/return." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 700 }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Asset', 'Category', 'Serial', 'Status', ''].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {assets.map((a) => (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 700 }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                <div className="font-medium text-text">{a.name}</div>
                <div className="text-text-muted">{a.category}</div>
                <div className="font-mono-num text-text-faint">{a.serialNumber ?? '—'}</div>
                <div>
                  <Badge tone={statusTone[a.status]}>{a.status}</Badge>
                  {a.assignedTo && <span className="ml-2 text-[11.5px] text-text-faint">{a.assignedTo}</span>}
                </div>
                <div className="flex justify-end">
                  {a.status === 'available' ? (
                    <Button size="sm" variant="secondary" onClick={() => setIssuingId(a.id)}>Issue</Button>
                  ) : a.status === 'assigned' ? (
                    <Button size="sm" variant="secondary" disabled={returnMutation.isPending} onClick={() => returnMutation.mutate(a.id)}>Return</Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showNew && <NewAssetModal companyId={companyId} onClose={() => setShowNew(false)} />}
      {issuingId && <IssueAssetModal companyId={companyId} assetId={issuingId} onClose={() => setIssuingId(null)} />}
    </div>
  );
}
