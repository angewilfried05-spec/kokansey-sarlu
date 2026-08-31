import { z } from 'zod';

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
    });
  }
};

const employeeSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  hireDate: z.string(),
  salary: z.coerce.number().positive(),
  contact: z.string().min(8),
  position: z.string(),
  residence: z.string(),
  cniNumber: z.string().min(5),
  matricule: z.string().optional().nullable(),
  typeSpeculation: z.string().optional().nullable(),
  speculation: z.string().optional().nullable(),
  service: z.string().optional().nullable(),
  contractType: z.enum(['CDD', 'CDI', 'STAGIAIRE', 'INTERIM', 'TEMPS_PARTIEL']).optional().nullable(),
  contractStart: z.string().optional().nullable(),
  contractEnd: z.string().optional().nullable()
});

const truckSchema = z.object({
  internalCode: z.string().min(3),
  registration: z.string().min(3),
  category: z.string(),
  subCategory: z.string(),
  brand: z.string(),
  model: z.string(),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  assignment: z.string(),
  energyType: z.string(),
  mileage: z.coerce.number().nonnegative(),
  consumption: z.coerce.number().positive().optional().nullable(),
  serviceDate: z.string(),
  nextMaintenance: z.string().optional().nullable(),
  status: z.string(),
  driverId: z.string().optional().nullable(),
  conveyorId: z.string().optional().nullable()
});

const saleSchema = z.object({
  speculationId: z.string(),
  product: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unit: z.string(),
  unitPrice: z.coerce.number().positive(),
  date: z.string(),
  client: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  observation: z.string().optional().nullable(),
  campagneId: z.string().optional().nullable()
});

const expenseSchema = z.object({
  speculationId: z.string().optional().nullable(),
  type: z.string(),
  category: z.string(),
  amount: z.coerce.number().positive(),
  date: z.string(),
  supplier: z.string().optional().nullable(),
  observation: z.string().optional().nullable()
});

const harvestSchema = z.object({
  speculationId: z.string(),
  quantity: z.coerce.number().positive(),
  unit: z.string(),
  date: z.string(),
  quality: z.string().optional().nullable(),
  observation: z.string().optional().nullable(),
  campagneId: z.string().optional().nullable()
});

const stockSchema = z.object({
  name: z.string().min(2),
  category: z.string(),
  quantity: z.coerce.number().nonnegative(),
  unit: z.string(),
  minThreshold: z.coerce.number().nonnegative(),
  speculationId: z.string().optional().nullable()
});

const clientSchema = z.object({
  nom: z.string().min(2),
  telephone: z.string().optional(),
  email: z.string().email().optional(),
  adresse: z.string().optional(),
  typeClient: z.enum(['particulier', 'entreprise', 'cooperative']).default('particulier'),
  actif: z.boolean().default(true)
});

const operationClientSchema = z.object({
  typeOperation: z.enum(['vente', 'paiement', 'avance', 'depense']),
  montant: z.coerce.number().positive(),
  description: z.string().optional(),
  reference: z.string().optional(),
  modePaiement: z.enum(['espece', 'cheque', 'virement', 'mobile_money']).optional(),
  dateOperation: z.string()
});

const userRoles = ['ADMIN', 'GERANT', 'COMMERCIAL', 'RH', 'STOCK_MANAGER'];

const userCreateSchema = z.object({
  username: z.string().min(3, 'Identifiant trop court'),
  password: z.string().min(6, 'Mot de passe trop court'),
  name: z.string().min(2, 'Nom trop court'),
  email: z.union([z.string().email('Email invalide'), z.literal('')]).optional().nullable(),
  contact: z.union([z.string().min(8, 'Contact invalide'), z.literal('')]).optional().nullable(),
  role: z.enum(userRoles).default('GERANT')
});

const userUpdateSchema = z.object({
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional().nullable(),
  name: z.string().min(2).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  contact: z.union([z.string().min(8), z.literal('')]).optional().nullable(),
  role: z.enum(userRoles).optional()
});

const invoiceTemplateSchema = z.object({
  companyName: z.string().min(1).optional(),
  companySubtitle: z.string().optional(),
  companyAddress: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyEmail: z.union([z.string().email(), z.literal('')]).optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  footerText: z.string().optional().nullable(),
  legalMention: z.string().optional().nullable(),
  disclaimer: z.string().optional().nullable(),
  defaultNotes: z.string().optional().nullable(),
  showSignatureZones: z.boolean().optional(),
  showQrCode: z.boolean().optional(),
  taxLabel: z.string().optional().nullable(),
  taxRate: z.coerce.number().min(0).max(1).optional().nullable()
});

const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
  dueDate: z.string().optional().nullable(),
  assignedToId: z.string(),
  truckId: z.string().optional().nullable()
});

export {
  validate,
  employeeSchema,
  truckSchema,
  saleSchema,
  expenseSchema,
  harvestSchema,
  stockSchema,
  clientSchema,
  operationClientSchema,
  userCreateSchema,
  userUpdateSchema,
  invoiceTemplateSchema,
  taskSchema
};
