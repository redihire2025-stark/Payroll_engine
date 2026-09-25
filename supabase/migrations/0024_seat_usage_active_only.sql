-- Seat usage previously required BOTH status = 'active' AND portal access
-- granted (auth_user_id set) — see 0005_org_branding_and_seats.sql. That's
-- a defensible licensing definition, but it produced a confusing number:
-- an admin sees N active employees and a smaller seat count with no
-- visible reason why, since "hasn't been granted a login yet" isn't shown
-- anywhere on the Employees list. Simplified to just active employees,
-- which still correctly excludes exited employees from using a seat.
create or replace view company_seat_usage as
select
  company_id,
  count(*) filter (where status = 'active') as seats_used
from employees
group by company_id;
