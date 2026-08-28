/*
  Warnings:

  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OperationClient` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Client";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OperationClient";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "campagnes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "date_debut" DATETIME NOT NULL,
    "date_fin" DATETIME NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "type_client" TEXT NOT NULL DEFAULT 'particulier',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "operations_client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "type_operation" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "mode_paiement" TEXT,
    "date_operation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cree_par" TEXT,
    "sale_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operations_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "operations_client_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Harvest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "speculationId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "quality" TEXT,
    "observation" TEXT,
    "campagne_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Harvest_campagne_id_fkey" FOREIGN KEY ("campagne_id") REFERENCES "campagnes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Harvest_speculationId_fkey" FOREIGN KEY ("speculationId") REFERENCES "Speculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Harvest" ("createdAt", "date", "id", "observation", "quality", "quantity", "speculationId", "unit") SELECT "createdAt", "date", "id", "observation", "quality", "quantity", "speculationId", "unit" FROM "Harvest";
DROP TABLE "Harvest";
ALTER TABLE "new_Harvest" RENAME TO "Harvest";
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "speculationId" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "client" TEXT,
    "client_id" TEXT,
    "observation" TEXT,
    "campagne_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_campagne_id_fkey" FOREIGN KEY ("campagne_id") REFERENCES "campagnes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_speculationId_fkey" FOREIGN KEY ("speculationId") REFERENCES "Speculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("client", "createdAt", "date", "id", "observation", "product", "quantity", "speculationId", "totalPrice", "unit", "unitPrice") SELECT "client", "createdAt", "date", "id", "observation", "product", "quantity", "speculationId", "totalPrice", "unit", "unitPrice" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "operations_client_sale_id_key" ON "operations_client"("sale_id");
