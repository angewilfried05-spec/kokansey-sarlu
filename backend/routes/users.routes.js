import bcrypt from 'bcryptjs';
import { validate, userCreateSchema, userUpdateSchema } from '../validators.js';

export default function registerUsersRoutes(app, { prisma, authenticate, checkAdmin, logAction }) {
  // User Management Routes (Admin Only)
  app.get('/api/users', authenticate, checkAdmin, async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, username: true, name: true, email: true, contact: true, role: true, createdAt: true }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', authenticate, checkAdmin, validate(userCreateSchema), async (req, res) => {
    try {
      const { username, password, name, email, contact, role } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: 'Cet identifiant est déjà utilisé' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, password: hashedPassword, name, email, contact, role }
      });
      await logAction(req.user.id, 'CREATE', 'USER', { username, role });
      res.json({ id: user.id, username: user.username, name: user.name, email: user.email, contact: user.contact, role: user.role });
    } catch (error) {
      console.error("User creation error:", error);
      res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
  });

  app.put('/api/users/:id', authenticate, checkAdmin, validate(userUpdateSchema), async (req, res) => {
    try {
      const { username, password, name, email, contact, role } = req.body;
      const data = { username, name, email, contact, role };

      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data
      });
      res.json({ id: user.id, username: user.username, name: user.name, email: user.email, contact: user.contact, role: user.role });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
      }
      const deletedUser = await prisma.user.delete({ where: { id: req.params.id } });
      await logAction(req.user.id, 'DELETE', 'USER', { deletedUsername: deletedUser.username });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Audit Log Route (Admin Only)
  app.get('/api/audit-logs', authenticate, checkAdmin, async (req, res) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: { username: true, name: true }
          }
        },
        take: 200
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });
}
