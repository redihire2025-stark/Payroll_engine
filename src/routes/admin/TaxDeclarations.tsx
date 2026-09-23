import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Badge, type BadgeTone } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Input';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ShieldIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listCompanyDeclarations, setItemStatus, generateForm16, type TaxDeclarationItemRow } from '@/modules/tax/taxService';
import { currentFinancialYear } from '@/modules/tax/financialYear';
import { listEmployeesLite } from '@/modules/employee/employeeService';

const itemStatusTone: Record<TaxDeclarationItemRow['status'], BadgeTone> = {
  declared: 'neutral',
  proof_uploaded: 'info',
  verified: 'success',
  rejected: 'danger',
};

function fyOptions(): string[] {
  const current = currentFinancialYear();
  const startYear = Number(current.split('-')[0]);
  return [startYear - 1, startYear, startYear + 1].map((y) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`);
}

export default function TaxDeclarations() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const [financialYear, setFinancialYear] = useState(currentFinancialYear());
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useQuery({
    queryKey: ['tax-declarations', companyId, financialYear],
    queryFn: () => listCompanyDeclarations(companyId, financialYear),
  });
  const employeesQuery = useQuery({ queryKey: ['employees-lite', companyId], queryFn: () => listEmployeesLite(companyId) });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'verified' | 'rejected' }) => setItemStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tax-declarations', companyId, financialYear] }),
  });

  async function handleGenerateForm16(employeeId: string) {
    setGeneratingId(employeeId);
    setError(null);
    try {
      await generateForm16(companyId, employeeId, financialYear);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate Form 16.');
    } finally {
      setGeneratingId(null);
    }
  }

  const declarations = data ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Tax Declarations</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">Verify employee investment declarations and generate Form 16</p>
        </div>
        <Select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} className="w-32">
          {fyOptions().map((fy) => <option key={fy} value={fy}>{fy}</option>)}
        </Select>
      </div>

      {listError && <ErrorState message={(listError as Error).message} />}
      {error && <p className="text-[12.5px] text-danger">{error}</p>}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : declarations.length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<ShieldIcon width={20} height={20} />} title="No declarations yet" description={`No employee has declared for FY ${financialYear}.`} />
          </div>
        ) : (
          declarations.map((d) => (
            <div key={d.id} className="border-b border-border-soft px-5 py-4 last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-text">{d.employeeName}</div>
                <Button size="sm" variant="secondary" disabled={generatingId === d.employeeId} onClick={() => handleGenerateForm16(d.employeeId)}>
                  {generatingId === d.employeeId ? 'Generating…' : 'Generate Form 16'}
                </Button>
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {d.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-[12.5px]">
                    <div>
                      <span className="font-medium text-text">{item.section}</span>
                      <span className="ml-2 text-text-muted">₹{item.declaredAmount.toLocaleString('en-IN')}</span>
                      {item.description && <span className="ml-2 text-text-faint">{item.description}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={itemStatusTone[item.status]}>{item.status.replace('_', ' ')}</Badge>
                      {(item.status === 'declared' || item.status === 'proof_uploaded') && (
                        <>
                          <button
                            className="text-[11.5px] font-semibold text-success"
                            onClick={() => statusMutation.mutate({ id: item.id, status: 'verified' })}
                          >
                            Verify
                          </button>
                          <button
                            className="text-[11.5px] font-semibold text-danger"
                            onClick={() => statusMutation.mutate({ id: item.id, status: 'rejected' })}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </Card>

      {!isLoading && declarations.length > 0 && (employeesQuery.data?.length ?? 0) > declarations.length && (
        <p className="text-[11.5px] text-text-faint">
          {(employeesQuery.data?.length ?? 0) - declarations.length} employee(s) have not declared for this financial year yet.
        </p>
      )}
    </div>
  );
}
