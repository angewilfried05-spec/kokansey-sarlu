import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  employeeSchema,
  truckSchema,
  saleSchema,
  expenseSchema,
  harvestSchema,
  stockSchema,
  userCreateSchema,
  userUpdateSchema,
  clientSchema,
  operationClientSchema,
} from '../validators.js';

const validEmployee = {
  firstName: 'Amadou',
  lastName: 'Kouassi',
  hireDate: '2020-01-01',
  salary: 250000,
  contact: '0123456789',
  position: 'Technicien',
  residence: 'Abidjan',
  cniNumber: 'CI123456',
  matricule: 'EMP001',
  contractType: 'CDI',
};

const validTruck = {
  internalCode: 'TRK01',
  registration: 'AB-123-CD',
  category: 'Benne',
  subCategory: 'Agricole',
  brand: 'Mercedes',
  model: 'Actros',
  year: 2020,
  assignment: 'Logistique',
  energyType: 'Diesel',
  mileage: 50000,
  serviceDate: '2023-01-01',
  status: 'En service',
};

const validSale = {
  speculationId: 'clqabc123',
  product: 'Hévéa',
  quantity: 10,
  unit: 'kg',
  unitPrice: 5000,
  date: '2024-01-01',
};

const validExpense = {
  type: 'Achat',
  category: 'Intrants',
  amount: 125000,
  date: '2024-01-01',
};

const validHarvest = {
  speculationId: 'clqabc123',
  quantity: 100,
  unit: 'kg',
  date: '2024-01-01',
};

const validStock = {
  name: 'Engrais NPK',
  category: 'Intrant',
  quantity: 50,
  unit: 'sac',
  minThreshold: 10,
};

const validUser = {
  username: 'manager',
  password: 'Password123',
  name: 'Gérant',
  role: 'GERANT',
};

const validClient = {
  nom: 'SOCOOP',
  telephone: '0123456789',
  typeClient: 'cooperative',
  actif: true,
};

const validOperation = {
  typeOperation: 'vente',
  montant: 500000,
  dateOperation: '2024-01-01',
};

describe('Validators', () => {
  it('accepts a valid employee', () => {
    employeeSchema.parse(validEmployee);
  });

  it('rejects employee with short first name', () => {
    assert.throws(() => employeeSchema.parse({ ...validEmployee, firstName: 'A' }));
  });

  it('rejects employee with negative salary', () => {
    assert.throws(() => employeeSchema.parse({ ...validEmployee, salary: -1000 }));
  });

  it('accepts a valid truck', () => {
    truckSchema.parse(validTruck);
  });

  it('rejects truck with year out of range', () => {
    assert.throws(() => truckSchema.parse({ ...validTruck, year: 1800 }));
  });

  it('accepts a valid sale', () => {
    saleSchema.parse(validSale);
  });

  it('rejects sale with negative price', () => {
    assert.throws(() => saleSchema.parse({ ...validSale, unitPrice: -1 }));
  });

  it('accepts a valid expense', () => {
    expenseSchema.parse(validExpense);
  });

  it('accepts a valid harvest', () => {
    harvestSchema.parse(validHarvest);
  });

  it('accepts a valid stock item', () => {
    stockSchema.parse(validStock);
  });

  it('rejects stock with negative threshold', () => {
    assert.throws(() => stockSchema.parse({ ...validStock, minThreshold: -5 }));
  });

  it('accepts a valid new user', () => {
    userCreateSchema.parse(validUser);
  });

  it('rejects user with short password', () => {
    assert.throws(() => userCreateSchema.parse({ ...validUser, password: '123' }));
  });

  it('rejects user with invalid role', () => {
    assert.throws(() => userCreateSchema.parse({ ...validUser, role: 'SUPERUSER' }));
  });

  it('accepts a user update without password', () => {
    const { password, ...rest } = validUser;
    userUpdateSchema.parse(rest);
  });

  it('accepts a valid client', () => {
    clientSchema.parse(validClient);
  });

  it('rejects client with invalid email', () => {
    assert.throws(() => clientSchema.parse({ ...validClient, email: 'not-an-email' }));
  });

  it('accepts a valid client operation', () => {
    operationClientSchema.parse(validOperation);
  });

  it('rejects operation with unknown type', () => {
    assert.throws(() => operationClientSchema.parse({ ...validOperation, typeOperation: 'remboursement' }));
  });
});
