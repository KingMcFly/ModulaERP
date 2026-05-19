import { Router } from 'express';
import db from '../../db.js';
import { requireSuperAdmin } from '../../middleware/auth.js';

const router = Router();
router.use(requireSuperAdmin);

router.get('/', async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM modules ORDER BY sort_order');
  res.json(rows);
});

router.put('/:id', async (req, res) => {
  const { name, description, icon, color, is_active, sort_order } = req.body;
  await db.query(
    'UPDATE modules SET name=?, description=?, icon=?, color=?, is_active=?, sort_order=? WHERE id=?',
    [name, description, icon, color, is_active, sort_order, req.params.id]
  );
  res.json({ message: 'Módulo actualizado' });
});

export default router;
