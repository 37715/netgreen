-- CreateTable
CREATE TABLE "DayCrew" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "crewId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DayCrew_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DayCrew_date_idx" ON "DayCrew"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DayCrew_date_crewId_key" ON "DayCrew"("date", "crewId");
