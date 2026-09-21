import { useState } from 'react';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { PlusIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { salaryStructures, activeSalaryStructureComponents } from '@/shared/lib/mockData';

const typeTone = { earning: 'success', deduction: 'danger', employer_contribution: 'info' } as const;
const typeLabel = { earning: 'Earning', deduction: 'Deduction', employer_contribution: 'Employer Contribution' } as const;

export default function Salary() {
  const [active, setActive] = useState('Standard – Grade B');
  const annualCtc = activeSalaryStructureComponents
    .filter((c) => c.type !== 'deduction')
    .reduce((s, c) => s + c.monthly, 0) * 12;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Salary Structures</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">Define reusable pay components for salary assignment</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />}>New Structure</Button>
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-5">
        <Card className="h-fit">
          <CardHeader title="Structures" />
          <div className="flex flex-col py-2">
            {salaryStructures.map((s) => (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={`px-5 py-2.5 text-left text-[13px] font-medium ${
                  active === s ? 'bg-accent-soft text-accent-strong' : 'text-text-muted hover:bg-bg'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={active} subtitle="8 components · Last updated Aug 12, 2026" />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.6fr 1fr' }} className="gap-3 border-b border-border px-5 py-2.5">
            {['Component', 'Type', 'Calculation', 'Monthly'].map((h) => (
              <div key={h} className={`text-[11px] font-bold uppercase tracking-wide text-text-faint ${h === 'Monthly' ? 'text-right' : ''}`}>{h}</div>
            ))}
          </div>
          {activeSalaryStructureComponents.map((c) => (
            <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.6fr 1fr' }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
              <div className="font-medium text-text">{c.name}</div>
              <div><Badge tone={typeTone[c.type]}>{typeLabel[c.type]}</Badge></div>
              <div className="text-text-muted">{c.calculation}</div>
              <div className="text-right font-mono-num text-text">{formatINR(c.monthly)}</div>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[13px] font-semibold text-text">Annual CTC</span>
            <span className="font-mono-num text-[16px] font-bold text-text">{formatINR(annualCtc)}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
