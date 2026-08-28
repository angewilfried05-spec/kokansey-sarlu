import { validate, truckSchema } from '../validators.js';

export default function registerTrucksRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction, notificationService }) {
  app.get('/api/trucks', authenticate, authorize(['GERANT', 'LOGISTIQUE', 'RH']), async (req, res) => {
    try {
      const trucks = await prisma.truck.findMany({
        include: {
          driver: true,
          conveyor: true,
          _count: {
            select: { trips: true, expenses: true }
          }
        }
      });
      res.json(trucks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trucks' });
    }
  });

  app.post('/api/trucks', authenticate, authorize(['GERANT']), validate(truckSchema), async (req, res) => {
    try {
      const { year, mileage, consumption, serviceDate, nextMaintenance, ...rest } = req.body;
      const truck = await prisma.truck.create({
        data: {
          ...rest,
          year: parseInt(year),
          mileage: parseFloat(mileage || 0),
          consumption: consumption ? parseFloat(consumption) : null,
          serviceDate: new Date(serviceDate),
          nextMaintenance: nextMaintenance ? new Date(nextMaintenance) : null
        }
      });
      await logAction(req.user.id, 'CREATE', 'TRUCK', { internalCode: truck.internalCode });
      res.json(truck);
    } catch (error) {
      console.error("Create Truck Error:", error);
      res.status(500).json({ error: 'Failed to create truck' });
    }
  });

  app.put('/api/trucks/:id', authenticate, authorize(['GERANT']), validate(truckSchema), async (req, res) => {
    try {
      const { year, mileage, consumption, serviceDate, nextMaintenance, ...rest } = req.body;
      const truck = await prisma.truck.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          year: year ? parseInt(year) : undefined,
          mileage: mileage ? parseFloat(mileage) : undefined,
          consumption: consumption !== undefined ? (consumption ? parseFloat(consumption) : null) : undefined,
          serviceDate: serviceDate ? new Date(serviceDate) : undefined,
          nextMaintenance: nextMaintenance !== undefined ? (nextMaintenance ? new Date(nextMaintenance) : null) : undefined
        }
      });
      await logAction(req.user.id, 'UPDATE', 'TRUCK', { id: truck.id, internalCode: truck.internalCode });
      res.json(truck);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update truck' });
    }
  });

  app.delete('/api/trucks/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const truck = await prisma.truck.delete({ where: { id: req.params.id } });
      await logAction(req.user.id, 'DELETE', 'TRUCK', { id: truck.id, internalCode: truck.internalCode });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete truck' });
    }
  });

  app.get('/api/trucks/trips', authenticate, authorize(['GERANT', 'LOGISTIQUE']), async (req, res) => {
    try {
      const trips = await prisma.trip.findMany({
        include: { truck: true },
        orderBy: { date: 'desc' }
      });
      res.json(trips);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch trips' });
    }
  });

  app.post('/api/trucks/trips', authenticate, authorize(['GERANT', 'LOGISTIQUE']), async (req, res) => {
    try {
      const { truckId, date, destination, cargo, observation } = req.body;
      const trip = await prisma.trip.create({
        data: {
          truckId,
          date: new Date(date),
          destination,
          cargo,
          observation
        },
        include: { truck: { include: { driver: true, conveyor: true } } }
      });

      // Créer automatiquement une tâche pour le conducteur (ou le convoyeur)
      const tripAssignee = trip.truck.driver || trip.truck.conveyor;
      if (tripAssignee) {
        try {
          await prisma.task.create({
            data: {
              title: `Trajet vers ${destination}`,
              description: `Véhicule: ${trip.truck.registration} (${trip.truck.internalCode})\nCargaison: ${cargo || 'N/A'}${observation ? `\nObservation: ${observation}` : ''}`,
              status: 'PENDING',
              priority: 'NORMAL',
              dueDate: new Date(date),
              assignedToId: tripAssignee.id,
              truckId,
              tripId: trip.id,
              createdById: req.user?.id || null
            }
          });
        } catch (taskError) {
          console.error('[TASK] Échec création tâche automatique pour le trajet:', taskError);
        }
      }

      // Notifier le conducteur et le convoyeur assignés au camion
      const employees = [trip.truck.driver, trip.truck.conveyor].filter(Boolean);
      for (const employee of employees) {
        if (employee && employee.contact) {
          notificationService.sendTripAssigned(trip, employee, employee.contact).catch(err =>
            console.error('[WhatsApp] Échec notification mission:', err)
          );
        }
      }

      await logAction(req.user.id, 'CREATE', 'TRIP', { truck: trip.truck.internalCode, destination });
      res.json(trip);
    } catch (error) {
      console.error('Trip Error:', error);
      res.status(500).json({ error: 'Failed to record trip' });
    }
  });

  app.patch('/api/trucks/trips/:id/complete', authenticate, authorize(['GERANT', 'LOGISTIQUE']), async (req, res) => {
    try {
      const trip = await prisma.trip.update({
        where: { id: req.params.id },
        data: { status: 'TERMINE', completedAt: new Date() },
        include: { truck: true }
      });

      // Marquer les tâches liées à ce trajet comme terminées
      await prisma.task.updateMany({
        where: { tripId: trip.id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        data: { status: 'COMPLETED' }
      });

      await logAction(req.user.id, 'UPDATE', 'TRIP', { id: trip.id, truck: trip.truck.internalCode, action: 'TERMINE' });
      res.json(trip);
    } catch (error) {
      console.error('Trip Complete Error:', error);
      res.status(500).json({ error: 'Failed to complete trip' });
    }
  });

  app.get('/api/trucks/expenses', authenticate, authorize(['GERANT', 'LOGISTIQUE']), async (req, res) => {
    try {
      const expenses = await prisma.truckExpense.findMany({
        include: { truck: true },
        orderBy: { date: 'desc' }
      });
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch truck expenses' });
    }
  });

  app.post('/api/trucks/expenses', authenticate, authorize(['GERANT', 'LOGISTIQUE']), async (req, res) => {
    try {
      const { truckId, date, type, amount, observation } = req.body;
      const expense = await prisma.truckExpense.create({
        data: {
          truckId,
          date: new Date(date),
          type,
          amount: parseFloat(amount),
          observation
        },
        include: { truck: true }
      });
      await logAction(req.user.id, 'CREATE', 'TRUCK_EXPENSE', { truck: expense.truck.internalCode, amount });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record truck expense' });
    }
  });

  // Additional Truck Routes (Trips & Expenses)
  app.get('/api/trucks/:id/details', authenticate, async (req, res) => {
    try {
      const truck = await prisma.truck.findUnique({
        where: { id: req.params.id },
        include: {
          trips: { orderBy: { date: 'desc' } },
          expenses: { orderBy: { date: 'desc' } }
        }
      });
      res.json(truck);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch truck details' });
    }
  });

  app.post('/api/trucks/:id/trips', authenticate, async (req, res) => {
    try {
      const truckId = req.params.id;
      const trip = await prisma.trip.create({
        data: {
          ...req.body,
          date: new Date(req.body.date),
          truckId
        },
        include: { truck: { include: { driver: true, conveyor: true } } }
      });

      // Créer automatiquement une tâche pour le conducteur (ou le convoyeur)
      const tripAssignee = trip.truck.driver || trip.truck.conveyor;
      if (tripAssignee) {
        try {
          await prisma.task.create({
            data: {
              title: `Trajet vers ${trip.destination}`,
              description: `Véhicule: ${trip.truck.registration} (${trip.truck.internalCode})\nCargaison: ${trip.cargo || 'N/A'}${trip.observation ? `\nObservation: ${trip.observation}` : ''}`,
              status: 'PENDING',
              priority: 'NORMAL',
              dueDate: trip.date,
              assignedToId: tripAssignee.id,
              truckId,
              tripId: trip.id,
              createdById: req.user?.id || null
            }
          });
        } catch (taskError) {
          console.error('[TASK] Échec création tâche automatique pour le trajet:', taskError);
        }
      }

      // Notifier le conducteur et le convoyeur assignés au camion
      const employees = [trip.truck.driver, trip.truck.conveyor].filter(Boolean);
      for (const employee of employees) {
        if (employee && employee.contact) {
          notificationService.sendTripAssigned(trip, employee, employee.contact).catch(err =>
            console.error('[WhatsApp] Échec notification mission:', err)
          );
        }
      }

      res.json(trip);
    } catch (error) {
      console.error('Trip Error:', error);
      res.status(500).json({ error: 'Failed to create trip' });
    }
  });

  app.post('/api/trucks/:id/expenses', authenticate, async (req, res) => {
    try {
      const expense = await prisma.truckExpense.create({
        data: {
          ...req.body,
          date: new Date(req.body.date),
          amount: parseFloat(req.body.amount),
          truckId: req.params.id
        }
      });
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create truck expense' });
    }
  });
}
