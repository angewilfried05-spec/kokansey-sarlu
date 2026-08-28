import { validate, taskSchema } from '../validators.js';

export default function registerTasksRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction, notificationService }) {
  // Get all tasks
  app.get('/api/tasks', authenticate, async (req, res) => {
    try {
      const tasks = await prisma.task.findMany({
        include: { assignedTo: true, truck: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(tasks);
    } catch (error) {
      console.error('Erreur récupération tâches:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get task by ID
  app.get('/api/tasks/:id', authenticate, async (req, res) => {
    try {
      const task = await prisma.task.findUnique({
        where: { id: req.params.id },
        include: { assignedTo: true, truck: true }
      });
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      console.error('Erreur récupération tâche:', error);
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task and notify assigned employee
  app.post('/api/tasks', authenticate, authorize(['GERANT', 'RH']), validate(taskSchema), async (req, res) => {
    try {
      const { title, description, status, priority, dueDate, assignedToId, truckId } = req.body;
      const task = await prisma.task.create({
        data: {
          title,
          description,
          status,
          priority,
          dueDate: dueDate ? new Date(dueDate) : null,
          assignedToId,
          truckId,
          createdById: req.user?.id || null
        },
        include: { assignedTo: true, truck: true }
      });

      if (task.assignedTo && task.assignedTo.contact) {
        notificationService.sendTaskAssigned(task, task.assignedTo, task.assignedTo.contact).catch(err =>
          console.error('[WhatsApp] Échec notification tâche:', err)
        );
      }

      if (logAction) {
        await logAction(req.user.id, 'CREATE', 'TASK', { id: task.id, title, assignedTo: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'N/A' });
      }

      res.json(task);
    } catch (error) {
      console.error('Erreur création tâche:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Update task and notify if assignee changed
  app.put('/api/tasks/:id', authenticate, authorize(['GERANT', 'RH']), async (req, res) => {
    try {
      const existingTask = await prisma.task.findUnique({
        where: { id: req.params.id },
        include: { assignedTo: true, truck: true }
      });

      if (!existingTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const { dueDate, ...rest } = req.body;
      const data = {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : (dueDate === '' ? null : existingTask.dueDate)
      };

      const task = await prisma.task.update({
        where: { id: req.params.id },
        data,
        include: { assignedTo: true, truck: true }
      });

      // Notify if the task was newly assigned or the assignee changed
      if (task.assignedTo && task.assignedTo.contact && existingTask.assignedToId !== task.assignedToId) {
        notificationService.sendTaskAssigned(task, task.assignedTo, task.assignedTo.contact).catch(err =>
          console.error('[WhatsApp] Échec notification tâche:', err)
        );
      }

      // Notify when the task becomes completed or cancelled
      if (task.assignedTo && task.assignedTo.contact && existingTask.status !== task.status &&
          (task.status === 'COMPLETED' || task.status === 'CANCELLED')) {
        notificationService.sendTaskStatusUpdate(task, task.assignedTo, task.assignedTo.contact).catch(err =>
          console.error('[WhatsApp] Échec notification statut tâche:', err)
        );
      }

      if (logAction) {
        await logAction(req.user.id, 'UPDATE', 'TASK', { id: task.id, title: task.title });
      }

      res.json(task);
    } catch (error) {
      console.error('Erreur modification tâche:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Delete task
  app.delete('/api/tasks/:id', authenticate, authorize(['GERANT']), async (req, res) => {
    try {
      const task = await prisma.task.delete({
        where: { id: req.params.id },
        include: { assignedTo: true, truck: true }
      });

      if (logAction) {
        await logAction(req.user.id, 'DELETE', 'TASK', { id: task.id, title: task.title });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression tâche:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });
}
