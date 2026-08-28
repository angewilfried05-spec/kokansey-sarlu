import { validate, employeeSchema } from '../validators.js';

export default function registerEmployeesRoutes(app, { prisma, authenticate, authorize, checkAdmin, logAction, getDateFilter }) {
  app.get('/api/employees', authenticate, authorize(['GERANT', 'RH']), async (req, res) => {
    try {
      const employees = await prisma.employee.findMany({
        include: {
          _count: {
            select: { absences: true, salaries: true }
          },
          salaries: true,
          absences: true
        }
      });
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  });

  app.get('/api/employees/salaries', authenticate, authorize(['GERANT', 'RH']), async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const salaries = await prisma.salaryHistory.findMany({
        where: { date: getDateFilter(startDate, endDate) },
        include: {
          employee: {
            select: { firstName: true, lastName: true, position: true, matricule: true }
          }
        },
        orderBy: { date: 'desc' }
      });
      res.json(salaries);
    } catch (error) {
      console.error("Fetch Salaries Error:", error);
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  app.get('/api/employees/absences', authenticate, authorize(['GERANT', 'RH']), async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
      const absences = await prisma.absence.findMany({
        where: { date: getDateFilter(startDate, endDate) },
        include: { employee: true },
        orderBy: { date: 'desc' }
      });
      res.json(absences);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  app.post('/api/employees/absences', authenticate, authorize(['GERANT', 'RH']), async (req, res) => {
    try {
      const { employeeId, date, reason } = req.body;
      const absence = await prisma.absence.create({
        data: {
          employeeId,
          date: new Date(date),
          reason
        },
        include: { employee: true }
      });
      await logAction(req.user.id, 'CREATE', 'ABSENCE', { employee: `${absence.employee.firstName} ${absence.employee.lastName}`, date });
      res.json(absence);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record absence' });
    }
  });

  app.delete('/api/employees/absences/:id', authenticate, authorize(['GERANT', 'RH']), async (req, res) => {
    try {
      const absence = await prisma.absence.findUnique({
        where: { id: req.params.id },
        include: { employee: true }
      });
      await prisma.absence.delete({ where: { id: req.params.id } });
      await logAction(req.user.id, 'DELETE', 'ABSENCE', { employee: `${absence.employee.firstName} ${absence.employee.lastName}`, date: absence.date });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete absence' });
    }
  });

  app.post('/api/employees/salaries', authenticate, authorize(['GERANT', 'RH']), async (req, res) => {
    try {
      const { employeeId, date, amount, baseSalary, bonuses } = req.body;

      // Calculs sociaux (Standard Côte d'Ivoire / Zone OHADA)
      const base = parseFloat(baseSalary || amount);
      const bonus = parseFloat(bonuses || 0);
      const gross = base + bonus;

      const cnpsEmployee = gross * 0.063; // 6.3% Part Salariale
      const cnpsEmployer = gross * 0.1545; // ~15.45% Part Patronale
      const taxIS = (gross * 0.8) * 0.015; // 1.5% sur 80% du brut (simplifié)

      const netToPay = gross - cnpsEmployee - taxIS;

      const salary = await prisma.salaryHistory.create({
        data: {
          employeeId,
          date: new Date(date),
          amount: netToPay,
          baseSalary: base,
          bonuses: bonus,
          cnpsEmployee,
          cnpsEmployer,
          taxIS
        },
        include: { employee: true }
      });

      await logAction(req.user.id, 'CREATE', 'SALARY', { employee: `${salary.employee.firstName} ${salary.employee.lastName}`, amount: netToPay });
      res.json(salary);
    } catch (error) {
      console.error("Salary Recording Error:", error);
      res.status(500).json({ error: 'Failed to record salary' });
    }
  });

  app.post('/api/employees', authenticate, authorize(['GERANT', 'RH']), validate(employeeSchema), async (req, res) => {
    try {
      const { hireDate, salary, contractStart, contractEnd, ...rest } = req.body;
      const employee = await prisma.employee.create({
        data: {
          ...rest,
          hireDate: new Date(hireDate),
          salary: parseFloat(salary),
          contractStart: contractStart ? new Date(contractStart) : null,
          contractEnd: contractEnd ? new Date(contractEnd) : null,
        }
      });
      await logAction(req.user.id, 'CREATE', 'EMPLOYEE', { name: `${employee.firstName} ${employee.lastName}` });
      res.json(employee);
    } catch (error) {
      console.error("Create Employee Error:", error);
      res.status(500).json({ error: 'Failed to create employee' });
    }
  });

  app.put('/api/employees/:id', authenticate, authorize(['GERANT', 'RH']), validate(employeeSchema), async (req, res) => {
    try {
      const { hireDate, salary, contractStart, contractEnd, ...rest } = req.body;
      const employee = await prisma.employee.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          hireDate: hireDate ? new Date(hireDate) : undefined,
          salary: salary ? parseFloat(salary) : undefined,
          contractStart: contractStart ? new Date(contractStart) : null,
          contractEnd: contractEnd ? new Date(contractEnd) : null,
        }
      });
      await logAction(req.user.id, 'UPDATE', 'EMPLOYEE', { id: employee.id, name: `${employee.firstName} ${employee.lastName}` });
      res.json(employee);
    } catch (error) {
      console.error("Update Employee Error:", error);
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });

  app.delete('/api/employees/:id', authenticate, checkAdmin, async (req, res) => {
    try {
      const employee = await prisma.employee.delete({ where: { id: req.params.id } });
      await logAction(req.user.id, 'DELETE', 'EMPLOYEE', { id: employee.id, name: `${employee.firstName} ${employee.lastName}` });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  });

  // Additional Employee Routes (Payroll & Absences)
  app.get('/api/employees/:id', authenticate, async (req, res) => {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: req.params.id },
        include: { salaries: true, absences: true }
      });
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch employee' });
    }
  });

  app.post('/api/employees/:id/pay', authenticate, async (req, res) => {
    try {
      const { amount, date } = req.body;
      const salary = await prisma.salaryHistory.create({
        data: {
          amount: parseFloat(amount),
          date: new Date(date),
          employeeId: req.params.id
        }
      });
      res.json(salary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to record payment' });
    }
  });
}
