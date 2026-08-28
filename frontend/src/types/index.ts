export interface CountSummary {
  sales: number;
  expenses: number;
  harvests: number;
}

export interface Campagne {
  id: string;
  nom: string;
  description?: string;
  dateDebut: string;
  dateFin: string;
  actif?: boolean;
}

export interface Client {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
}

export interface SpeculationRef {
  id: string;
  name: string;
}

export interface Harvest {
  id: string;
  date: string;
  quantity: number;
  unit: string;
  quality?: string;
  observation?: string;
  campagneId?: string;
  speculationId: string;
  speculation: SpeculationRef;
  campagne?: Campagne;
}

export interface Sale {
  id: string;
  date: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  client?: string;
  clientId?: string;
  clientCompte?: { nom: string } | null;
  observation?: string;
  campagneId?: string;
  speculationId: string;
  speculation: SpeculationRef;
  campagne?: Campagne;
}

export interface Expense {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  observation?: string;
  supplier?: string;
  speculationId?: string;
  speculation?: SpeculationRef | null;
}

export interface Speculation {
  id: string;
  name: string;
  category: string;
  status: string;
  areaSize: number | null;
  _count: CountSummary;
  harvests: Harvest[];
  sales: Sale[];
  expenses: Expense[];
}

export interface DataTable<T = unknown> {
  search: string;
  setSearch: (value: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  requestSort: (key: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  paginatedData: T[];
  sortedData: T[];
  totalPages: number;
  totalItems: number;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  hireDate: string;
  salary: number;
  contact: string;
  position: string;
  residence: string;
  cniNumber: string;
  matricule?: string | null;
  photoUrl?: string | null;
  spouseName?: string | null;
  spouseContact?: string | null;
  typeSpeculation?: string | null;
  speculation?: string | null;
  service?: string | null;
  contractType?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
}

export interface Truck {
  id: string;
  internalCode: string;
  registration: string;
  category: string;
  subCategory: string;
  brand: string;
  model: string;
  year: number;
  assignment: string;
  energyType: string;
  mileage: number;
  consumption?: number | null;
  serviceDate: string;
  nextMaintenance?: string | null;
  status: string;
  driverId?: string | null;
  conveyorId?: string | null;
}

export interface Stock {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  speculationId?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  assignedToId: string;
  truckId?: string | null;
  createdById?: string | null;
}

export type View = 'cultures' | 'harvests' | 'sales' | 'expenses' | 'analytics';
