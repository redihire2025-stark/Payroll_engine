import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { PlusIcon, WalletIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listSalaryStructures, getStructureComponents } from '@/modules/salary/salaryService';

const typeTone = { earning: 'success', deduction: 'danger', employer_contribution: 'info' } as const;
const typeLabel = { earning: 'Earning', deduction: 'Deduction', employer_contribution: 'Employer Contribution' } as const;

export default function Salary() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const [activeId, setActiveId] = useState<string | null>(null);

  const structuresQuery = useQuery({ queryKey: ['salary-structures', companyId], queryFn: () => listSalaryStructures(companyId) });
  const structures = structuresQuery.data ?? [];
  const active = activeId ?? structures[0]?.id ?? null;

  const componentsQuery = useQuery({
    queryKey: ['salary-structure-components', active],
    queryFn: () => getStructureComponents(active!),
    enabled: Boolean(active),
  });
  const components = componentsQuery.data ?? [];
  const activeName = structures.find((s) => s.id === active)?.name;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Salary Structures</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">Define reusable pay components for salary assignment</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />}>New Structure</Button>
      </div>

      {structuresQuery.error && <ErrorState message={(structuresQuery.error as Error).message} />}

      {structuresQuery.isLoading ? (
        <LoadingRows />
      ) : structures.length === 0 ? (
        <EmptyState
          icon={<WalletIcon width={22} height={22} />}
          title="No salary structures yet"
          description="Create your first structure to define Basic, HRA, allowances and statutory deductions."
          action={<Button variant="primary" icon={<PlusIcon width={15} height={15} />}>New Structure</Button>}
        />
      ) : (
        <div className="grid grid-cols-[260px_1fr] gap-5">
          <Card className="h-fit">
            <CardHeader title="Structures" />
            <div className="flex flex-col py-2">
              {structures.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`px-5 py-2.5 text-left text-[13px] font-medium ${
                    active === s.id ? 'bg-accent-soft text-accent-strong' : 'text-text-muted hover:bg-bg'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title={activeName ?? ''} subtitle={`${components.length} component${components.length === 1 ? '' : 's'}`} />
            {componentsQuery.isLoading ? (
              <LoadingRows />
            ) : components.length === 0 ? (
              <div className="px-5 pb-6 pt-2">
                <EmptyState title="No components in this structure" description="Add earnings, deductions and employer contributions to build this structure out." />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.6fr 1fr' }} className="gap-3 border-b border-border px-5 py-2.5">
                  {['Component', 'Type', 'Value Type', 'Value'].map((h) => (
                    <div key={h} className={`text-[11px] font-bold uppercase tracking-wide text-text-faint ${h === 'Value' ? 'text-right' : ''}`}>{h}</div>
                  ))}
                </div>
                {components.map((c, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.6fr 1fr' }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                    <div className="font-medium text-text">{c.name}</div>
                    <div><Badge tone={typeTone[c.type]}>{typeLabel[c.type]}</Badge></div>
                    <div className="text-text-muted">{c.valueType === 'percentage' ? `${c.value}%` : 'Fixed'}</div>
                    <div className="text-right font-mono-num text-text">{c.valueType === 'amount' ? formatINR(c.value) : `${c.value}%`}</div>
                  </div>
                ))}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
