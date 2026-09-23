import { callNetlifyFunction } from '@/shared/lib/netlifyFunctions';

export async function sendWelcomeEmail(to: string, companyName: string): Promise<void> {
  await callNetlifyFunction('send-notification', {
    to,
    subject: `Welcome to Payroll OS — ${companyName} is ready`,
    html: `<p>Your organization <strong>${companyName}</strong> now has its own isolated workspace on Payroll OS.</p>
           <p>Next steps: add branches and departments, then start inviting your team.</p>`,
  });
}

/** Recipient and authorization are resolved server-side — see notify-payslip-ready.ts. */
export async function sendPayslipReadyEmail(payslipId: string): Promise<void> {
  await callNetlifyFunction('notify-payslip-ready', { payslipId });
}

/** Recipient and authorization are resolved server-side — see notify-leave-decision.ts. */
export async function sendLeaveDecisionEmail(leaveRequestId: string, decision: 'approved' | 'rejected'): Promise<void> {
  await callNetlifyFunction('notify-leave-decision', { leaveRequestId, decision });
}
