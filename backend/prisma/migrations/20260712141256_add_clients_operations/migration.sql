-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'GERANT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "contact" TEXT,
    "email" TEXT
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "hireDate" DATETIME NOT NULL,
    "salary" REAL NOT NULL,
    "contact" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "residence" TEXT NOT NULL,
    "cniNumber" TEXT NOT NULL,
    "matricule" TEXT,
    "photoUrl" TEXT,
    "spouseName" TEXT,
    "spouseContact" TEXT,
    "typeSpeculation" TEXT,
    "speculation" TEXT,
    "service" TEXT,
    "contractType" TEXT,
    "contractStart" DATETIME,
    "contractEnd" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "reason" TEXT,
    "employeeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Absence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalaryHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "baseSalary" REAL,
    "bonuses" REAL DEFAULT 0,
    "cnpsEmployee" REAL DEFAULT 0,
    "cnpsEmployer" REAL DEFAULT 0,
    "taxIS" REAL DEFAULT 0,
    "taxCN" REAL DEFAULT 0,
    "taxIGR" REAL DEFAULT 0,
    "employeeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalaryHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Speculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EN_COURS',
    "areaSize" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Harvest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "speculationId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "quality" TEXT,
    "observation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Harvest_speculationId_fkey" FOREIGN KEY ("speculationId") REFERENCES "Speculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "speculationId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "client" TEXT,
    "observation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_speculationId_fkey" FOREIGN KEY ("speculationId") REFERENCES "Speculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "speculationId" TEXT,
    "amount" REAL NOT NULL,
    "observation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier" TEXT,
    CONSTRAINT "Expense_speculationId_fkey" FOREIGN KEY ("speculationId") REFERENCES "Speculation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "internalCode" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "assignment" TEXT NOT NULL,
    "energyType" TEXT NOT NULL,
    "mileage" REAL NOT NULL DEFAULT 0,
    "consumption" REAL,
    "serviceDate" DATETIME NOT NULL,
    "nextMaintenance" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Disponible',
    "driverId" TEXT,
    "conveyorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Truck_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Truck_conveyorId_fkey" FOREIGN KEY ("conveyorId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TruckExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "truckId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "observation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TruckExpense_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "truckId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "observation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trip_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "minThreshold" REAL NOT NULL DEFAULT 0,
    "speculationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Stock_speculationId_fkey" FOREIGN KEY ("speculationId") REFERENCES "Speculation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stockId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "reason" TEXT,
    "speculationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_speculationId_fkey" FOREIGN KEY ("speculationId") REFERENCES "Speculation" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "lastMessage" TEXT,
    "lastMessageAt" DATETIME,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fromMe" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "whatsappId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "typeClient" TEXT NOT NULL DEFAULT 'particulier',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OperationClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "typeOperation" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "modePaiement" TEXT,
    "dateOperation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creePar" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OperationClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cniNumber_key" ON "Employee"("cniNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_matricule_key" ON "Employee"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "Speculation_name_key" ON "Speculation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_internalCode_key" ON "Truck"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_registration_key" ON "Truck"("registration");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_name_key" ON "Stock"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_phoneNumber_key" ON "Conversation"("phoneNumber");
