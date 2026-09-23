import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { StatTile } from '@/shared/ui/StatTile';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Avatar } from '@/shared/ui/Avatar';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { ClockIcon, PlusIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import {
  listCorrections,
  decideCorrection,
  listShifts,
  createShift,
  listShiftAssignments,
  assignShift,
} from '@/modules/attendance/attendanceService';
import { listEmployeesLite } from '@/modules/employee/employeeService';

const cols = '1.8fr 1fr 1fr 1fr 2fr 1fr 1.2fr';
const tabs = ['Corrections', 'Shifts'] as const;

function NewShiftModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [graceMinutes, setGraceMinutes] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => createShift(companyId, name.trim(), startTime, endTime, graceMinutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create shift.'),
  });
  return (
    <Modal title="New Shift" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input placeholder="Shift name (e.g. General)" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <div className="flex gap-3">
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
        <Input type="number" min={0} max={120} placeholder="Grace minutes" value={graceMinutes} onChange={(e) => setGraceMinutes(Number(e.target.value))} />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AssignShiftModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const employeesQuery = useQuery({ queryKey: ['employees-lite', companyId], queryFn: () => listEmployeesLite(companyId) });
  const shiftsQuery = useQuery({ queryKey: ['shifts', companyId], queryFn: () => listShifts(companyId) });
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => assignShift(employeeId, shiftId, effectiveFrom),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not assign shift.'),
  });
  return (
    <Modal title="Assign Shift" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
          <option value="">Select employee…</option>
          {(employeesQuery.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
        </Select>
        <Select value={shiftId} onChange={(e) => setShiftId(e.target.value)} required>
          <option value="">Select shift…</option>
          {(shiftsQuery.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
        </Select>
        <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!employeeId || !shiftId || mutation.isPending}>{mutation.isPending ? 'Assigning…' : 'Assign'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ShiftsTab({ companyId }: { companyId: string }) {
  const [showNewShift, setShowNewShift] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const shiftsQuery = useQuery({ queryKey: ['shifts', companyId], queryFn: () => listShifts(companyId) });
  const assignmentsQuery = useQuery({ queryKey: ['shift-assignments', companyId], queryFn: () => listShiftAssignments(companyId) });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Shifts" subtitle="Start/end time and grace period" />
          <div className="px-5 pb-4">
            <Button size="sm" variant="secondary" icon={<PlusIcon width={14} height={14} />} onClick={() => setShowNewShift(true)}>New Shift</Button>
          </div>
          {shiftsQuery.isLoading ? (
            <LoadingRows />
          ) : (shiftsQuery.data ?? []).length === 0 ? (
            <div className="px-5 pb-6"><EmptyState icon={<ClockIcon width={20} height={20} />} title="No shifts yet" description="Create a shift to enable late/overtime tracking." /></div>
          ) : (
            (shiftsQuery.data ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-border-soft px-5 py-3 text-[13px] last:border-b-0">
                <span className="font-medium text-text">{s.name}</span>
                <span className="font-mono-num text-text-muted">{s.startTime}–{s.endTime} · {s.graceMinutes}m grace</span>
              </div>
            ))
          )}
        </Card>

        <Card>
          <CardHeader title="Assignments" subtitle="Which employee is on which shift" />
          <div className="px-5 pb-4">
            <Button size="sm" variant="secondary" icon={<PlusIcon width={14} height={14} />} onClick={() => setShowAssign(true)}>Assign Shift</Button>
          </div>
          {assignmentsQuery.isLoading ? (
            <LoadingRows />
          ) : (assignmentsQuery.data ?? []).length === 0 ? (
            <div className="px-5 pb-6"><EmptyState icon={<ClockIcon width={20} height={20} />} title="No assignments yet" description="Assign employees to a shift." /></div>
          ) : (
            (assignmentsQuery.data ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-border-soft px-5 py-3 text-[13px] last:border-b-0">
                <span className="font-medium text-text">{a.employeeName}</span>
                <span className="text-text-muted">{a.shiftName}</span>
                <span className="text-[11px] text-text-faint">from {a.effectiveFrom}{a.effectiveTo ? ` to ${a.effectiveTo}` : ''}</span>
              </div>
            ))
          )}
        </Card>
      </div>

      {showNewShift && <NewShiftModal companyId={companyId} onClose={() => setShowNewShift(false)} />}
      {showAssign && <AssignShiftModal companyId={companyId} onClose={() => setShowAssign(false)} />}
    </div>
  );
}

export default function Attendance() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number]>('Corrections');
  const { data, isLoading, error } = useQuery({ queryKey: ['attendance-corrections', companyId], queryFn: () => listCorrections(companyId) });

  const decisionMutation = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) => decideCorrection(id, decision, companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-corrections', companyId] }),
  });

  const corrections = data ?? [];
  const pending = corrections.filter((c) => c.status === 'pending');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Attendance</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Correction requests, shifts and roster</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Correction Requests" value={String(corrections.length)} />
        <StatTile label="Pending" value={String(pending.length)} />
      </div>

      {error && <ErrorState message={(error as Error).message} />}

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Shifts' && <ShiftsTab companyId={companyId} />}

      {tab === 'Corrections' && (
      <Card>
        <CardHeader title="Correction Requests" subtitle={`${pending.length} pending approval`} />
        {isLoading ? (
          <LoadingRows />
        ) : corrections.length === 0 ? (
          <div className="px-5 pb-6">
            <EmptyState icon={<ClockIcon width={20} height={20} />} title="No correction requests" description="Employee attendance correction requests will appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 900 }} className="gap-3 border-b border-border px-5 py-2.5">
              {['Employee', 'Date', 'Requested In', 'Requested Out', 'Reason', 'Status', ''].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wide text-text-faint">{h}</div>
              ))}
            </div>
            {corrections.map((c) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: cols, minWidth: 900 }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <Avatar name={c.employeeName} size={28} />
                  <span className="truncate font-medium text-text">{c.employeeName}</span>
                </div>
                <div className="font-mono-num text-text-muted">{c.date}</div>
                <div className="font-mono-num text-text-muted">{c.requestedIn ?? '—'}</div>
                <div className="font-mono-num text-text-muted">{c.requestedOut ?? '—'}</div>
                <div className="truncate text-text-muted">{c.reason}</div>
                <div>
                  <Badge tone={c.status === 'pending' ? 'warning' : c.status === 'approved' ? 'success' : 'danger'}>{c.status}</Badge>
                </div>
                <div className="flex justify-end gap-1.5">
                  {c.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={decisionMutation.isPending}
                        onClick={() => decisionMutation.mutate({ id: c.id, decision: 'rejected' })}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={decisionMutation.isPending}
                        onClick={() => decisionMutation.mutate({ id: c.id, decision: 'approved' })}
                      >
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      )}
    </div>
  );
}
