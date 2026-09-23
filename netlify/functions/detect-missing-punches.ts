// Scheduled daily (see netlify.toml) — marks yesterday absent for any
// shift-assigned employee who never punched in, wasn't on an approved
// leave, and it wasn't a company holiday. Before this job existed, no
// automated attendance for a day meant an invisible gap in payroll's LOP
// calculation: runPayroll's countAbsentDays only counts attendance_records
// rows already marked 'absent', and nothing ever created one.
//
// Scoped to employees with a shift assignment (i.e. attendance is being
// rule-tracked for them at all, per 0002/Task 21) — an employee with no
// shift assignment isn't being attendance-tracked and is left alone.
//
// Limitation: there's no weekly-off/roster configuration in the schema
// yet, so Saturdays and Sundays are hardcoded as non-working days here
// rather than marking every weekend absent, which would be actively
// wrong. A real weekly-off policy feature would replace this.
//
// Runs as the service role (Netlify's scheduler invokes it directly, not
// a signed-in user) — background_jobs RLS doesn't apply to service-role
// writes, so no auth check is needed or possible here.

import type { Handler } from '@netlify/functions';
import { getSupabaseAdmin } from './_shared/supabaseAdmin';
import { json } from './_shared/http';
import { errorMessage } from './_shared/errors';

function yesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export const handler: Handler = async () => {
  const admin = getSupabaseAdmin();
  const targetDate = yesterday();
  const dayOfWeek = new Date(`${targetDate}T00:00:00Z`).getUTCDay(); // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return json({ ok: true, skipped: 'weekend' });
  }

  const { data: companies, error: companiesErr } = await admin.from('companies').select('id').eq('status', 'active');
  if (companiesErr) return json({ error: errorMessage(companiesErr) }, 500);

  const summary: { companyId: string; markedAbsent: number; error?: string }[] = [];

  for (const company of companies ?? []) {
    const companyId = company.id as string;
    const { data: jobRow } = await admin
      .from('background_jobs')
      .insert({ company_id: companyId, job_type: 'missing_punch_detection', payload: { date: targetDate } })
      .select('id')
      .single();
    const jobId = jobRow?.id as string | undefined;

    try {
      const { data: holiday } = await admin.from('holidays').select('id').eq('company_id', companyId).eq('date', targetDate).maybeSingle();
      if (holiday) {
        if (jobId) await admin.from('background_jobs').update({ status: 'succeeded', result: { skipped: 'holiday' }, finished_at: new Date().toISOString() }).eq('id', jobId);
        summary.push({ companyId, markedAbsent: 0 });
        continue;
      }

      const { data: assignments, error: assignErr } = await admin
        .from('shift_assignments')
        .select('employee_id, employees!inner(company_id, status)')
        .eq('employees.company_id', companyId)
        .eq('employees.status', 'active')
        .lte('effective_from', targetDate)
        .or(`effective_to.is.null,effective_to.gte.${targetDate}`);
      if (assignErr) throw assignErr;

      let markedAbsent = 0;
      for (const assignment of assignments ?? []) {
        const employeeId = assignment.employee_id as string;

        const { data: existing } = await admin
          .from('attendance_records')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('work_date', targetDate)
          .maybeSingle();
        if (existing) continue;

        const { data: onLeave } = await admin
          .from('leave_requests')
          .select('id')
          .eq('employee_id', employeeId)
          .eq('status', 'approved')
          .lte('start_date', targetDate)
          .gte('end_date', targetDate)
          .maybeSingle();
        if (onLeave) continue;

        const { error: insertErr } = await admin.from('attendance_records').insert({
          company_id: companyId,
          employee_id: employeeId,
          work_date: targetDate,
          status: 'absent',
        });
        if (insertErr) throw insertErr;
        markedAbsent += 1;
      }

      if (jobId) await admin.from('background_jobs').update({ status: 'succeeded', result: { markedAbsent }, finished_at: new Date().toISOString() }).eq('id', jobId);
      summary.push({ companyId, markedAbsent });
    } catch (err) {
      const message = errorMessage(err);
      if (jobId) await admin.from('background_jobs').update({ status: 'failed', error: message, finished_at: new Date().toISOString() }).eq('id', jobId);
      summary.push({ companyId, markedAbsent: 0, error: message });
    }
  }

  return json({ ok: true, date: targetDate, summary });
};
