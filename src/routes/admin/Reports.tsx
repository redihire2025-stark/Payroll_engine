import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Input';
import { LoadingRows, EmptyState, ErrorState } from '@/shared/ui/EmptyState';
import { BarChartIcon, FileTextIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import { listPayrollRuns } from '@/modules/payroll/payrollService';
import {
  payrollSummaryReport,
  attendanceReport,
  leaveReport,
  statutoryReport,
  departmentPayrollCostReport,
  payrollVarianceReport,
  reimbursementReport,
  exportToCsv,
  type ReportResult,
} from '@/modules/reports/reportService';

type ReportKey = 'payroll_summary' | 'attendance' | 'leave' | 'statutory' | 'department_cost' | 'variance' | 'reimbursement';

const reportCatalog: { key: ReportKey; title: string; description: string; needs: 'run' | 'period' | 'year' | 'two_runs' | 'none' }[] = [
  { key: 'payroll_summary', title: 'Payroll Summary', description: 'Gross, deductions and net payable by pay period.', needs: 'run' },
  { key: 'attendance', title: 'Attendance Report', description: 'Present/absent days by employee for a date range.', needs: 'period' },
  { key: 'leave', title: 'Leave Report', description: 'Leave taken and balances by employee.', needs: 'year' },
  { key: 'statutory', title: 'Statutory Report', description: 'PF, ESI, Professional Tax and TDS by period.', needs: 'run' },
  { key: 'department_cost', title: 'Department Payroll Cost', description: 'Cost distribution across departments.', needs: 'run' },
  { key: 'variance', title: 'Payroll Variance', description: 'Change in gross and net payroll cost between two runs.', needs: 'two_runs' },
  { key: 'reimbursement', title: 'Reimbursement Report', description: 'Claims submitted by status.', needs: 'none' },
];

const money = new Set(['gross', 'deductions', 'net', 'amount', 'balance', 'used', 'periodA', 'periodB', 'change']);

function ReportTable({ result, filename }: { result: ReportResult; filename: string }) {
  if (result.rows.length === 0) {
    return <EmptyState title="No data for this report" description="Try a different period or run." />;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => exportToCsv(filename, result)}>Export CSV</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-border bg-bg">
              {result.columns.map((c) => (
                <th key={c.key} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-text-faint">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} className="border-b border-border-soft last:border-b-0">
                {result.columns.map((c) => (
                  <td key={c.key} className="px-4 py-2.5 text-text">
                    {money.has(c.key) && typeof row[c.key] === 'number' ? formatINR(Number(row[c.key])) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportRunner({ reportKey, onBack }: { reportKey: ReportKey; onBack: () => void }) {
  const { user } = useSession();
  const companyId = user!.companyId;
  const catalogEntry = reportCatalog.find((r) => r.key === reportKey)!;

  const runsQuery = useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: () => listPayrollRuns(companyId),
    enabled: catalogEntry.needs === 'run' || catalogEntry.needs === 'two_runs',
  });

  const [runId, setRunId] = useState('');
  const [runIdA, setRunIdA] = useState('');
  const [runIdB, setRunIdB] = useState('');
  const [periodStart, setPeriodStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().slice(0, 10));
  const [year, setYear] = useState(new Date().getFullYear());
  const [generate, setGenerate] = useState(false);

  const resultQuery = useQuery({
    queryKey: ['report', reportKey, companyId, runId, runIdA, runIdB, periodStart, periodEnd, year],
    queryFn: async (): Promise<ReportResult> => {
      switch (reportKey) {
        case 'payroll_summary': return payrollSummaryReport(runId);
        case 'attendance': return attendanceReport(companyId, periodStart, periodEnd);
        case 'leave': return leaveReport(companyId, year);
        case 'statutory': return statutoryReport(runId);
        case 'department_cost': return departmentPayrollCostReport(runId);
        case 'variance': return payrollVarianceReport(runIdA, runIdB);
        case 'reimbursement': return reimbursementReport(companyId);
      }
    },
    enabled: generate,
  });

  const canGenerate =
    catalogEntry.needs === 'none' ||
    (catalogEntry.needs === 'run' && Boolean(runId)) ||
    (catalogEntry.needs === 'two_runs' && Boolean(runIdA) && Boolean(runIdB)) ||
    catalogEntry.needs === 'period' ||
    catalogEntry.needs === 'year';

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="self-start text-[12.5px] font-semibold text-accent">← Back to Reports</button>
      <div>
        <h1 className="text-[20px] font-bold text-text">{catalogEntry.title}</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">{catalogEntry.description}</p>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        {(catalogEntry.needs === 'run') && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-muted">Payroll run</span>
            <Select value={runId} onChange={(e) => { setRunId(e.target.value); setGenerate(false); }}>
              <option value="">Select…</option>
              {(runsQuery.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.periodStart} – {r.periodEnd}</option>)}
            </Select>
          </label>
        )}
        {catalogEntry.needs === 'two_runs' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-text-muted">Earlier run</span>
              <Select value={runIdA} onChange={(e) => { setRunIdA(e.target.value); setGenerate(false); }}>
                <option value="">Select…</option>
                {(runsQuery.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.periodStart} – {r.periodEnd}</option>)}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-text-muted">Later run</span>
              <Select value={runIdB} onChange={(e) => { setRunIdB(e.target.value); setGenerate(false); }}>
                <option value="">Select…</option>
                {(runsQuery.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.periodStart} – {r.periodEnd}</option>)}
              </Select>
            </label>
          </>
        )}
        {catalogEntry.needs === 'period' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-text-muted">From</span>
              <input type="date" className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); setGenerate(false); }} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-text-muted">To</span>
              <input type="date" className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]" value={periodEnd} onChange={(e) => { setPeriodEnd(e.target.value); setGenerate(false); }} />
            </label>
          </>
        )}
        {catalogEntry.needs === 'year' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-muted">Year</span>
            <input type="number" className="w-28 rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]" value={year} onChange={(e) => { setYear(Number(e.target.value)); setGenerate(false); }} />
          </label>
        )}
        <Button variant="primary" disabled={!canGenerate} onClick={() => setGenerate(true)}>Generate</Button>
      </Card>

      {resultQuery.error && <ErrorState message={(resultQuery.error as Error).message} />}
      {generate && resultQuery.isLoading && <LoadingRows />}
      {resultQuery.data && <ReportTable result={resultQuery.data} filename={`${reportKey}.csv`} />}
    </div>
  );
}

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportKey | null>(null);

  if (activeReport) {
    return <ReportRunner reportKey={activeReport} onBack={() => setActiveReport(null)} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-bold text-text">Reports</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Generate and export reports across payroll and HR</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reportCatalog.map((r) => (
          <Card key={r.key} className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
              <BarChartIcon width={18} height={18} />
            </div>
            <h3 className="mt-3.5 text-[14px] font-semibold text-text">{r.title}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-text-faint">{r.description}</p>
            <button onClick={() => setActiveReport(r.key)} className="mt-3.5 text-[12.5px] font-semibold text-accent">Generate →</button>
          </Card>
        ))}
      </div>

      <Card>
        <div className="border-b border-border-soft px-5 py-4">
          <h3 className="text-[14px] font-semibold text-text">About These Reports</h3>
        </div>
        <div className="flex items-center gap-3 px-5 py-6 text-[12.5px] text-text-faint">
          <FileTextIcon width={18} height={18} />
          Reports run live against your current data — nothing is scheduled or cached. Use Export CSV on any report to save a copy.
        </div>
      </Card>
    </div>
  );
}
