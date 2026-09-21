import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Avatar } from '@/shared/ui/Avatar';
import { employees } from '@/shared/lib/mockData';

const tabs = ['Profile', 'Employment', 'Salary', 'Documents', 'Attendance', 'Leave', 'History'];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft py-2.5 last:border-b-0">
      <span className="text-[12.5px] text-text-faint">{label}</span>
      <span className="text-[13px] font-medium text-text">{value}</span>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams();
  const employee = employees.find((e) => e.id === id) ?? employees[0];
  const [tab, setTab] = useState('Profile');

  return (
    <div className="flex flex-col gap-5">
      <div className="text-[12.5px] text-text-faint">
        <Link to="/admin/employees" className="text-accent">Employees</Link> / {employee.name}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={employee.name} size={56} />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] font-bold text-text">{employee.name}</h1>
              <Badge tone="success">Active</Badge>
            </div>
            <p className="mt-0.5 text-[13px] text-text-faint">
              {employee.code} · {employee.designation} · {employee.department}
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" size="sm">Edit</Button>
          <Button variant="danger" size="sm">Deactivate</Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3.5 pb-2.5 text-[13px] font-semibold ${
              tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint hover:text-text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Personal Information" />
          <div className="px-5 py-3">
            <InfoRow label="Date of Birth" value={employee.dob} />
            <InfoRow label="Gender" value={employee.gender} />
            <InfoRow label="Personal Email" value={employee.email} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Address" value={employee.address} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Bank Details" />
          <div className="px-5 py-3">
            <InfoRow label="Account Number" value={employee.bankAccountMasked} />
            <InfoRow label="IFSC Code" value={employee.ifsc} />
            <InfoRow label="Bank Name" value={employee.bankName} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Statutory Information" />
          <div className="px-5 py-3">
            <InfoRow label="PAN" value={employee.panMasked} />
            <InfoRow label="UAN" value={employee.uan} />
            <InfoRow label="PF Number" value={employee.pfNumber} />
            <InfoRow label="ESI Number" value={employee.esiNumber} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Emergency Contact" />
          <div className="px-5 py-3">
            <InfoRow label="Contact" value={employee.emergencyContact} />
            <InfoRow label="Branch" value={employee.branch} />
            <InfoRow label="Date of Joining" value={employee.doj} />
            <InfoRow label="Reporting Manager" value="Ananya Rao" />
          </div>
        </Card>
      </div>
    </div>
  );
}
