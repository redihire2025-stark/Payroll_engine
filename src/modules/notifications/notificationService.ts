import { callNetlifyFunction } from '@/shared/lib/netlifyFunctions';

async function send(to: string | string[], subject: string, html: string): Promise<void> {
  await callNetlifyFunction('send-notification', { to, subject, html });
}

export async function sendWelcomeEmail(to: string, companyName: string): Promise<void> {
  await send(
    to,
    `Welcome to Payroll OS — ${companyName} is ready`,
    `<p>Your organization <strong>${companyName}</strong> now has its own isolated workspace on Payroll OS.</p>
     <p>Next steps: add branches and departments, then start inviting your team.</p>`
  );
}

export async function sendPayslipReadyEmail(to: string, employeeName: string, period: string, payslipUrl: string): Promise<void> {
  await send(
    to,
    `Your payslip for ${period} is ready`,
    `<p>Hi ${employeeName},</p>
     <p>Your payslip for <strong>${period}</strong> has been generated and is ready to view.</p>
     <p><a href="${payslipUrl}">View your payslip</a></p>`
  );
}

export async function sendLeaveDecisionEmail(
  to: string,
  employeeName: string,
  decision: 'approved' | 'rejected',
  leaveType: string,
  dates: string
): Promise<void> {
  await send(
    to,
    `Your ${leaveType} request was ${decision}`,
    `<p>Hi ${employeeName},</p>
     <p>Your ${leaveType} request for <strong>${dates}</strong> has been <strong>${decision}</strong>.</p>`
  );
}
