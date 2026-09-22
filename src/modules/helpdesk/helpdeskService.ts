import { supabase } from '@/shared/lib/supabaseClient';
import { listEmployeesLite } from '@/modules/employee/employeeService';

export interface TicketRow {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
}

export async function listTickets(companyId: string): Promise<TicketRow[]> {
  const employees = await listEmployeesLite(companyId);
  const nameById = new Map(employees.map((e) => [e.id, e.name]));

  const { data, error } = await supabase
    .from('tickets')
    .select('id, employee_id, category, subject, priority, status, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employeeName: nameById.get(r.employee_id as string) ?? 'Unknown',
    category: r.category as string,
    subject: r.subject as string,
    priority: r.priority as TicketRow['priority'],
    status: r.status as TicketRow['status'],
    createdAt: r.created_at as string,
  }));
}

export async function listMyTickets(employeeId: string): Promise<TicketRow[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('id, employee_id, category, subject, priority, status, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employeeName: '',
    category: r.category as string,
    subject: r.subject as string,
    priority: r.priority as TicketRow['priority'],
    status: r.status as TicketRow['status'],
    createdAt: r.created_at as string,
  }));
}

export async function createTicket(companyId: string, employeeId: string, category: string, subject: string, priority: 'low' | 'medium' | 'high'): Promise<void> {
  const { error } = await supabase.from('tickets').insert({ company_id: companyId, employee_id: employeeId, category, subject, priority });
  if (error) throw error;
}

export async function updateTicketStatus(ticketId: string, status: TicketRow['status']): Promise<void> {
  const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId);
  if (error) throw error;
}

export interface TicketCommentRow {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export async function listTicketComments(ticketId: string): Promise<TicketCommentRow[]> {
  const { data, error } = await supabase
    .from('ticket_comments')
    .select('id, author_id, body, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id as string, authorId: r.author_id as string, body: r.body as string, createdAt: r.created_at as string }));
}

export async function addTicketComment(ticketId: string, authorId: string, body: string): Promise<void> {
  const { error } = await supabase.from('ticket_comments').insert({ ticket_id: ticketId, author_id: authorId, body });
  if (error) throw error;
}
