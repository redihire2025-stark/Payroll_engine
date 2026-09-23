import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { PlusIcon, WalletIcon } from '@/shared/ui/icons';
import { formatINR } from '@/shared/lib/format';
import { useSession } from '@/shared/lib/session';
import {
  listSalaryStructures,
  createSalaryStructure,
  getStructureComponents,
  addStructureComponent,
  listStructureAssignments,
  assignSalaryStructure,
} from '@/modules/salary/salaryService';
import { listEmployeesLite } from '@/modules/employee/employeeService';

const typeTone = { earning: 'success', deduction: 'danger', employer_contribution: 'info' } as const;
const typeLabel = { earning: 'Earning', deduction: 'Deduction', employer_contribution: 'Employer Contribution' } as const;

function NewStructureModal({ companyId, onClose }: { companyId: string; onClose: (newId?: string) => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => createSalaryStructure(companyId, name.trim()),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures', companyId] });
      onClose(id);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create structure.'),
  });
  return (
    <Modal title="New Salary Structure" onClose={() => onClose()}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input placeholder="e.g. Standard Structure" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onClose()}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddComponentForm({ companyId, structureId, earningComponents, nextSequence, onDone }: {
  companyId: string; structureId: string; earningComponents: { id: string; name: string }[]; nextSequence: number; onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'earning' | 'deduction'>('earning');
  const [valueType, setValueType] = useState<'amount' | 'percentage'>('amount');
  const [value, setValue] = useState('');
  const [percentageOf, setPercentageOf] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      addStructureComponent({
        companyId, structureId, name: name.trim(), code: code.trim(), type, valueType,
        value: Number(value), percentageOfComponentId: valueType === 'percentage' ? percentageOf : undefined, sequence: nextSequence,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structure-components', structureId] });
      onDone();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not add component.'),
  });

  return (
    <form className="flex flex-col gap-2 border-t border-border-soft p-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Name (e.g. HRA)" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input placeholder="Code (e.g. HRA)" value={code} onChange={(e) => setCode(e.target.value)} required maxLength={20} />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="earning">Earning</option>
          <option value="deduction">Deduction</option>
        </Select>
        <Select value={valueType} onChange={(e) => setValueType(e.target.value as typeof valueType)}>
          <option value="amount">Fixed amount / month</option>
          <option value="percentage">% of another component</option>
        </Select>
        <Input type="number" min={0} placeholder={valueType === 'amount' ? 'Amount' : '%'} value={value} onChange={(e) => setValue(e.target.value)} required />
      </div>
      {valueType === 'percentage' && (
        <Select value={percentageOf} onChange={(e) => setPercentageOf(e.target.value)} required>
          <option value="">% of which component…</option>
          {earningComponents.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      )}
      {error && <p className="text-[11.5px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" variant="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Add Component'}</Button>
      </div>
    </form>
  );
}

function AssignEmployeeForm({ companyId, structureId, onDone }: { companyId: string; structureId: string; onDone: () => void }) {
  const queryClient = useQueryClient();
  const employeesQuery = useQuery({ queryKey: ['employees-lite', companyId], queryFn: () => listEmployeesLite(companyId) });
  const [employeeId, setEmployeeId] = useState('');
  const [annualCtc, setAnnualCtc] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => assignSalaryStructure({ employeeId, salaryStructureId: structureId, annualCtc: Number(annualCtc), effectiveFrom }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-assignments', structureId] });
      onDone();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not assign structure.'),
  });

  return (
    <form className="flex flex-col gap-2 border-t border-border-soft p-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
      <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
        <option value="">Select employee…</option>
        {(employeesQuery.data ?? []).map((e) => (
          <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
        ))}
      </Select>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input type="number" min={0} placeholder="Annual CTC" value={annualCtc} onChange={(e) => setAnnualCtc(e.target.value)} required />
        <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
      </div>
      {error && <p className="text-[11.5px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" variant="primary" disabled={!employeeId || !annualCtc || mutation.isPending}>
          {mutation.isPending ? 'Assigning…' : 'Assign'}
        </Button>
      </div>
    </form>
  );
}

export default function Salary() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNewStructure, setShowNewStructure] = useState(false);
  const [addingComponent, setAddingComponent] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const structuresQuery = useQuery({ queryKey: ['salary-structures', companyId], queryFn: () => listSalaryStructures(companyId) });
  const structures = structuresQuery.data ?? [];
  const active = activeId ?? structures[0]?.id ?? null;

  const componentsQuery = useQuery({
    queryKey: ['salary-structure-components', active],
    queryFn: () => getStructureComponents(active!),
    enabled: Boolean(active),
  });
  const components = componentsQuery.data ?? [];
  const earningComponents = components.filter((c) => c.type === 'earning').map((c) => ({ id: c.salaryComponentId, name: c.name }));

  const assignmentsQuery = useQuery({
    queryKey: ['salary-assignments', active],
    queryFn: () => listStructureAssignments(active!),
    enabled: Boolean(active),
  });

  const activeName = structures.find((s) => s.id === active)?.name;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-text">Salary Structures</h1>
          <p className="mt-0.5 text-[13px] text-text-faint">Define reusable pay components and assign them to employees</p>
        </div>
        <Button variant="primary" icon={<PlusIcon width={15} height={15} />} onClick={() => setShowNewStructure(true)}>New Structure</Button>
      </div>

      {structuresQuery.error && <ErrorState message={(structuresQuery.error as Error).message} />}

      {structuresQuery.isLoading ? (
        <LoadingRows />
      ) : structures.length === 0 ? (
        <EmptyState
          icon={<WalletIcon width={22} height={22} />}
          title="No salary structures yet"
          description="Create your first structure to define Basic, HRA, allowances and deductions."
          action={<Button variant="primary" icon={<PlusIcon width={15} height={15} />} onClick={() => setShowNewStructure(true)}>New Structure</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
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

          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader
                title={activeName ?? ''}
                subtitle={`${components.length} component${components.length === 1 ? '' : 's'}`}
                action={!addingComponent && <Button size="sm" variant="secondary" onClick={() => setAddingComponent(true)}>+ Add Component</Button>}
              />
              {componentsQuery.isLoading ? (
                <LoadingRows />
              ) : components.length === 0 && !addingComponent ? (
                <div className="px-5 pb-6 pt-2">
                  <EmptyState title="No components in this structure" description="Add earnings and deductions to build this structure out." />
                </div>
              ) : (
                components.length > 0 && (
                  <div className="overflow-x-auto">
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.6fr 1fr', minWidth: 560 }} className="gap-3 border-b border-border px-5 py-2.5">
                      {['Component', 'Type', 'Value Type', 'Value'].map((h) => (
                        <div key={h} className={`text-[11px] font-bold uppercase tracking-wide text-text-faint ${h === 'Value' ? 'text-right' : ''}`}>{h}</div>
                      ))}
                    </div>
                    {components.map((c) => (
                      <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.6fr 1fr', minWidth: 560 }} className="items-center gap-3 border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
                        <div className="font-medium text-text">{c.name}</div>
                        <div><Badge tone={typeTone[c.type]}>{typeLabel[c.type]}</Badge></div>
                        <div className="text-text-muted">{c.valueType === 'percentage' ? `${c.value}%` : 'Fixed'}</div>
                        <div className="text-right font-mono-num text-text">{c.valueType === 'amount' ? formatINR(c.value) : `${c.value}%`}</div>
                      </div>
                    ))}
                  </div>
                )
              )}
              {addingComponent && active && (
                <AddComponentForm
                  companyId={companyId}
                  structureId={active}
                  earningComponents={earningComponents}
                  nextSequence={components.length}
                  onDone={() => setAddingComponent(false)}
                />
              )}
            </Card>

            <Card>
              <CardHeader
                title="Assigned Employees"
                subtitle={`${assignmentsQuery.data?.length ?? 0} assigned`}
                action={!assigning && <Button size="sm" variant="secondary" onClick={() => setAssigning(true)}>+ Assign</Button>}
              />
              {(assignmentsQuery.data ?? []).length > 0 && (
                <div className="flex flex-col">
                  {(assignmentsQuery.data ?? []).map((a) => (
                    <div key={a.id} className="flex items-center justify-between border-b border-border-soft px-5 py-3 text-[13px] last:border-b-0">
                      <span className="font-medium text-text">{a.employeeName}</span>
                      <span className="font-mono-num text-text-muted">{formatINR(a.annualCtc)}/yr · from {a.effectiveFrom}</span>
                    </div>
                  ))}
                </div>
              )}
              {assigning && active && <AssignEmployeeForm companyId={companyId} structureId={active} onDone={() => setAssigning(false)} />}
            </Card>
          </div>
        </div>
      )}

      {showNewStructure && (
        <NewStructureModal companyId={companyId} onClose={(newId) => { setShowNewStructure(false); if (newId) setActiveId(newId); }} />
      )}
    </div>
  );
}
