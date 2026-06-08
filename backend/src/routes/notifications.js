import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);
const w = fn => (req, res, next) => fn(req, res, next).catch(next);

router.get('/summary', w(async (req, res) => {
  const tid = req.user.tenant_id;

  const [[{ overdue_loans }]] = await db.query(
    `SELECT COUNT(*) AS overdue_loans FROM loans
     WHERE tenant_id=? AND status='active' AND expected_return < NOW()`,
    [tid]
  );

  const [[{ low_stock }]] = await db.query(
    `SELECT COUNT(*) AS low_stock FROM supplies
     WHERE tenant_id=? AND is_active=true AND current_stock <= min_stock`,
    [tid]
  );

  const [[{ overdue_maintenance }]] = await db.query(
    `SELECT COUNT(*) AS overdue_maintenance FROM maintenance_records
     WHERE tenant_id=? AND status IN ('pending','in_progress') AND scheduled_at < CURRENT_DATE`,
    [tid]
  );

  const [[{ expiring_contracts }]] = await db.query(
    `SELECT COUNT(*) AS expiring_contracts FROM contracts
     WHERE tenant_id=? AND status='active' AND end_date IS NOT NULL
       AND (end_date - CURRENT_DATE) BETWEEN 0 AND alert_days`,
    [tid]
  ).catch(() => [[{ expiring_contracts: 0 }]]);

  const [[{ breached_tickets }]] = await db.query(
    `SELECT COUNT(*) AS breached_tickets FROM tickets
     WHERE tenant_id=? AND status NOT IN ('resolved','closed','cancelled')
       AND resolution_due IS NOT NULL AND resolution_due < NOW()`,
    [tid]
  ).catch(() => [[{ breached_tickets: 0 }]]);

  const [[{ pending_requests }]] = await db.query(
    `SELECT COUNT(*) AS pending_requests FROM requests
     WHERE tenant_id=? AND status='pending'`,
    [tid]
  ).catch(() => [[{ pending_requests: 0 }]]);

  const items = [];
  if (breached_tickets > 0)
    items.push({ type: 'ticket', message: `${breached_tickets} ticket${breached_tickets > 1 ? 's' : ''} con SLA vencido`, count: breached_tickets, severity: 'high' });
  if (overdue_loans > 0)
    items.push({ type: 'loan', message: `${overdue_loans} préstamo${overdue_loans > 1 ? 's' : ''} vencido${overdue_loans > 1 ? 's' : ''}`, count: overdue_loans, severity: 'high' });
  if (low_stock > 0)
    items.push({ type: 'stock', message: `${low_stock} insumo${low_stock > 1 ? 's' : ''} con stock bajo`, count: low_stock, severity: 'medium' });
  if (overdue_maintenance > 0)
    items.push({ type: 'maintenance', message: `${overdue_maintenance} mantenimiento${overdue_maintenance > 1 ? 's' : ''} vencido${overdue_maintenance > 1 ? 's' : ''}`, count: overdue_maintenance, severity: 'medium' });
  if (expiring_contracts > 0)
    items.push({ type: 'contract', message: `${expiring_contracts} contrato${expiring_contracts > 1 ? 's' : ''} por vencer`, count: expiring_contracts, severity: 'medium' });
  if (pending_requests > 0)
    items.push({ type: 'request', message: `${pending_requests} solicitud${pending_requests > 1 ? 'es' : ''} pendiente${pending_requests > 1 ? 's' : ''}`, count: pending_requests, severity: 'low' });

  const total = Number(breached_tickets) + Number(overdue_loans) + Number(low_stock) + Number(overdue_maintenance) + Number(expiring_contracts) + Number(pending_requests);
  res.json({ total, breached_tickets, overdue_loans, low_stock, overdue_maintenance, expiring_contracts, pending_requests, items });
}));

export default router;
