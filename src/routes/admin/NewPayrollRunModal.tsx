import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/shared/ui/Modal';
import { Field, Input, Select } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { useSession } from '@/shared/lib/session';
import { createPayrollRun, executePayrollRun } from '@/modules/payroll/runPayroll';

function monthBounds(monthValue: string): { start: string; end: string } {
  const [year, month] = monthValue.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function NewPayrollRunModal({ onClose }: { onClose: () => void }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [runType, setRunType] = useState<'regular' | 'off_cycle' | 'fnf'>('regular');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ processed: number; skipped: number } | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { start, end } = monthBounds(month);
      const runId = await createPayrollRun({
        companyId: user!.companyId,
        periodStart: start,
        periodEnd: end,
        runType,
        createdBy: user!.id,
      });
      const result = await executePayrollRun(runId, user!.companyId, user!.id);
      return { runId, result };
    },
    onSuccess: ({ runId, result }) => {
      setSummary({ processed: result.processed, skipped: result.skipped.length });
      setTimeout(() => navigate(`/admin/payroll/${runId}`), 1200);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not run payroll.'),
  });

  return (
    <Modal title="New Payroll Run" onClose={onClose}>
      {summary ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-[14px] font-semibold text-text">Calculated for {summary.processed} employee{summary.processed === 1 ? '' : 's'}</p>
          {summary.skipped > 0 && <p className="text-[12.5px] text-warning">{summary.skipped} skipped — no salary structure assigned</p>}
          <p className="text-[12px] text-text-faint">Opening the run…</p>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            mutation.mutate();
          }}
        >
          <Field label="Pay period">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} required />
          </Field>
          <Field label="Run type">
            <Select value={runType} onChange={(e) => setRunType(e.target.value as typeof runType)}>
              <option value="regular">Regular</option>
              <option value="off_cycle">Off-cycle</option>
              <option value="fnf">Full & Final</option>
            </Select>
          </Field>
          <p className="text-[11.5px] text-text-faint">
            This calculates gross pay, EPF/ESI/Professional Tax/TDS and net pay for every employee with a salary structure
            assigned, using company-configured rule sets where set (sensible defaults otherwise).
          </p>
          {error && <p className="text-[12.5px] text-danger">{error}</p>}
          <div className="mt-1 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Calculating…' : 'Calculate Payroll'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
