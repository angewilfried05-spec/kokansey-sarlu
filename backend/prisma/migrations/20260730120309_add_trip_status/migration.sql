/*
  Warnings:

  - You are about to drop the `Conversation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "Conversation_phoneNumber_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Conversation";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Message";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "cooperatives" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "president" TEXT,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date_emission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_echeance" DATETIME,
    "montant_total" REAL NOT NULL,
    "montant_paye" REAL NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "mentions_legales" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "sale_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" REAL NOT NULL,
    "total_price" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoice_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_name" TEXT NOT NULL DEFAULT 'KOKANSEY SARLU',
    "company_subtitle" TEXT NOT NULL DEFAULT 'Gestion Agricole & Commerciale',
    "company_address" TEXT,
    "company_phone" TEXT,
    "company_email" TEXT,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#1a4d2e',
    "secondary_color" TEXT,
    "footer_text" TEXT,
    "legal_mention" TEXT,
    "disclaimer" TEXT,
    "default_notes" TEXT,
    "show_signature_zones" BOOLEAN NOT NULL DEFAULT true,
    "show_qr_code" BOOLEAN NOT NULL DEFAULT false,
    "tax_label" TEXT,
    "tax_rate" REAL,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "due_date" DATETIME,
    "assigned_to_id" TEXT NOT NULL,
    "truck_id" TEXT,
    "trip_id" TEXT,
    "created_by_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tasks_truck_id_fkey" FOREIGN KEY ("truck_id") REFERENCES "Truck" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "invoice_id" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_campagne_id_fkey" FOREIGN KEY ("campagne_id") REFERENCES "campagnes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_speculationId_fkey" FOREIGN KEY ("speculationId") REFERENCES "Speculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sale" ("campagne_id", "client", "client_id", "createdAt", "date", "id", "observation", "product", "quantity", "speculationId", "totalPrice", "unit", "unitPrice") SELECT "campagne_id", "client", "client_id", "createdAt", "date", "id", "observation", "product", "quantity", "speculationId", "totalPrice", "unit", "unitPrice" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
CREATE TABLE "new_Trip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "truckId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "observation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'EN_COURS',
    "completed_at" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trip_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Trip" ("cargo", "createdAt", "date", "destination", "id", "observation", "truckId") SELECT "cargo", "createdAt", "date", "destination", "id", "observation", "truckId" FROM "Trip";
DROP TABLE "Trip";
ALTER TABLE "new_Trip" RENAME TO "Trip";
CREATE TABLE "new_clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "type_client" TEXT NOT NULL DEFAULT 'particulier',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cooperative_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "clients_cooperative_id_fkey" FOREIGN KEY ("cooperative_id") REFERENCES "cooperatives" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_clients" ("actif", "adresse", "created_at", "email", "id", "nom", "telephone", "type_client", "updated_at") SELECT "actif", "adresse", "created_at", "email", "id", "nom", "telephone", "type_client", "updated_at" FROM "clients";
DROP TABLE "clients";
ALTER TABLE "new_clients" RENAME TO "clients";
CREATE TABLE "new_operations_client" (
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
    "invoice_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operations_client_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "operations_client_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "operations_client_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_operations_client" ("client_id", "created_at", "cree_par", "date_operation", "description", "id", "mode_paiement", "montant", "reference", "sale_id", "type_operation", "updated_at") SELECT "client_id", "created_at", "cree_par", "date_operation", "description", "id", "mode_paiement", "montant", "reference", "sale_id", "type_operation", "updated_at" FROM "operations_client";
DROP TABLE "operations_client";
ALTER TABLE "new_operations_client" RENAME TO "operations_client";
CREATE UNIQUE INDEX "operations_client_sale_id_key" ON "operations_client"("sale_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_numero_key" ON "invoices"("numero");
