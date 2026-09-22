import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { getMyExitCase, approveExit, rejectExit, markCleared, settleExit } from '@/modules/exit/exitService';
import type { EmployeeDetailRecord } from '@/modules/employee/employeeService';

const statusTone = { pending: 'warning', approved: 'info', cleared: 'info', settled: 'success', rejected: 'danger' } as const;

export function ExitCard({ employee }: { employee: EmployeeDetailRecord }) {
  const queryClient = useQueryClient();
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const { data: exitCase } = useQuery({ queryKey: ['exit-case', employee.id], queryFn: () => getMyExitCase(employee.id) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['exit-case', employee.id] });
    queryClient.invalidateQueries({ queryKey: ['employee', employee.id] });
  };

  const approveMutation = useMutation({
    mutationFn: () => approveExit(exitCase!.id, lastWorkingDay),
    onSuccess: invalidate,
  });
  const rejectMutation = useMutation({ mutationFn: () => rejectExit(exitCase!.id), onSuccess: invalidate });
  const clearMutation = useMutation({ mutationFn: () => markCleared(exitCase!.id), onSuccess: invalidate });
  const settleMutation = useMutation({
    mutationFn: () => settleExit(exitCase!.id, employee.id, exitCase!.lastWorkingDay!, employee.hasPortalAccess),
    onSuccess: invalidate,
  });

  if (!exitCase || exitCase.status === 'rejected') return null;

  return (
    <Card>
      <CardHeader title="Exit" action={<Badge tone={statusTone[exitCase.status]}>{exitCase.status}</Badge>} />
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="text-[12.5px] text-text-muted">
          Resignation submitted {exitCase.resignationDate}
          {exitCase.reason && <div className="mt-1 text-text-faint">"{exitCase.reason}"</div>}
        </div>

        {exitCase.status === 'pending' && (
          <div className="flex flex-col gap-2">
            <Input type="date" placeholder="Last working day" value={lastWorkingDay} onChange={(e) => setLastWorkingDay(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>Reject</Button>
              <Button size="sm" variant="primary" disabled={!lastWorkingDay || approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                Approve
              </Button>
            </div>
          </div>
        )}

        {exitCase.status === 'approved' && (
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-text-muted">Last working day: {exitCase.lastWorkingDay}</span>
            <Button size="sm" variant="primary" disabled={clearMutation.isPending} onClick={() => clearMutation.mutate()}>
              Mark Clearance Complete
            </Button>
          </div>
        )}

        {exitCase.status === 'cleared' && (
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-text-muted">Cleared — ready for final settlement</span>
            <Button size="sm" variant="primary" disabled={settleMutation.isPending} onClick={() => settleMutation.mutate()}>
              {settleMutation.isPending ? 'Settling…' : 'Settle & Exit'}
            </Button>
          </div>
        )}

        {exitCase.status === 'settled' && <p className="text-[12.5px] text-success">Exit settled. Employee marked exited.</p>}
      </div>
    </Card>
  );
}
