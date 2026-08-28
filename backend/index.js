import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import registerClientOperationsRoutes from './routes/clientOperations.routes.js';
import registerSearchRoutes from './routes/search.routes.js';
import registerSalesRoutes from './routes/sales.routes.js';
import registerHarvestsRoutes from './routes/harvests.routes.js';
import registerCampagnesRoutes from './routes/campagnes.routes.js';
import registerCooperativesRoutes from './routes/cooperatives.routes.js';
import registerExportsRoutes from './routes/exports.routes.js';
import registerInvoicesRoutes from './routes/invoices.routes.js';
import registerTasksRoutes from './routes/tasks.routes.js';
import registerNotificationsRoutes from './routes/notifications.routes.js';
import registerSpeculationsRoutes from './routes/speculations.routes.js';
import registerExpensesRoutes from './routes/expenses.routes.js';
import registerEmployeesRoutes from './routes/employees.routes.js';
import registerTrucksRoutes from './routes/trucks.routes.js';
import registerStocksRoutes from './routes/stocks.routes.js';
import registerUsersRoutes from './routes/users.routes.js';
import registerReportsRoutes from './routes/reports.routes.js';
import registerWhatsAppRoutes from './routes/whatsapp.routes.js';
import notificationService from './services/notifications.js';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET non défini dans les variables d\'environnement');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3001').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json({ limit: '10mb' }));

// Auth Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Accès non autorisé' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
};

const checkAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès refusé: Réservé aux administrateurs' });
  }
  next();
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: `Accès refusé: Votre rôle (${req.user.role}) ne permet pas cette action.` });
    }
    next();
  };
};

// Simple in-memory rate limiter
const rateLimit = ({ windowMs, max }) => {
  const requests = new Map();
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = requests.get(key) || { count: 0, resetTime: now + windowMs };
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    record.count++;
    if (record.count > max) {
      return res.status(429).json({ message: 'Trop de requêtes, veuillez réessayer plus tard.' });
    }
    requests.set(key, record);
    next();
  };
};

// Shared helpers
const getDateFilter = (startDate, endDate) => {
  if (!startDate && !endDate) return undefined;
  const filter = {};
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    filter.gte = start;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return filter;
};

const logAction = async (userId, action, entity, details) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
      }
    });
  } catch (error) {
    console.error('Audit Log Error:', error);
  }
};

// Auth Routes
app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ message: 'Identifiants invalides' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Identifiants invalides' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ success: true, token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, name: true, role: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Rate limiting for WhatsApp PDF sending
app.use('/api/invoices/:id/send-pdf', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));

// Register modular routes
const deps = { prisma, authenticate, authorize, checkAdmin, logAction, getDateFilter, notificationService };
registerSpeculationsRoutes(app, deps);
registerExpensesRoutes(app, deps);
registerEmployeesRoutes(app, deps);
registerTrucksRoutes(app, deps);
registerStocksRoutes(app, deps);
registerUsersRoutes(app, deps);
registerReportsRoutes(app, deps);
registerWhatsAppRoutes(app, deps);
registerSalesRoutes(app, deps);
registerHarvestsRoutes(app, deps);
registerCampagnesRoutes(app, deps);
registerTasksRoutes(app, deps);
registerCooperativesRoutes(app, deps);
registerExportsRoutes(app, deps);
registerInvoicesRoutes(app, deps);
registerClientOperationsRoutes(app, deps);
registerNotificationsRoutes(app, deps);
registerSearchRoutes(app, deps);

// Health & runtime config endpoints (desktop / PWA)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`window.KOKANSEY_RUNTIME = { API_BASE: '/api', VERSION: '1.0.0' };`);
});

// Serve frontend build in production / desktop mode
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (process.env.NODE_ENV === 'production' || process.env.SERVE_FRONTEND === 'true') {
  app.use(express.static(frontendDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
