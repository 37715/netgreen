-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScheduledJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "price" REAL NOT NULL DEFAULT 0,
    "pricingType" TEXT NOT NULL DEFAULT 'FIXED',
    "hourlyRate" REAL,
    "hours" REAL,
    "workers" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "completedAt" DATETIME,
    "customerId" INTEGER,
    "crewId" INTEGER,
    "projectId" INTEGER,
    "recurringSourceCustomerId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduledJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduledJob_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduledJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledJob" ("completedAt", "createdAt", "crewId", "customerId", "date", "id", "notes", "price", "projectId", "recurringSourceCustomerId", "sortOrder", "status", "title") SELECT "completedAt", "createdAt", "crewId", "customerId", "date", "id", "notes", "price", "projectId", "recurringSourceCustomerId", "sortOrder", "status", "title" FROM "ScheduledJob";
DROP TABLE "ScheduledJob";
ALTER TABLE "new_ScheduledJob" RENAME TO "ScheduledJob";
CREATE INDEX "ScheduledJob_date_idx" ON "ScheduledJob"("date");
CREATE INDEX "ScheduledJob_recurringSourceCustomerId_date_idx" ON "ScheduledJob"("recurringSourceCustomerId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
