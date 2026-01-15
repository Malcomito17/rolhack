/*
  Warnings:

  - You are about to drop the column `themeId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `themeOverrides` on the `projects` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "visual_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "layout" TEXT NOT NULL DEFAULT 'TECH',
    "theme" TEXT NOT NULL DEFAULT '{}',
    "components" TEXT NOT NULL DEFAULT '{}',
    "effects" TEXT NOT NULL DEFAULT '{}',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visualTemplateId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "projects_visualTemplateId_fkey" FOREIGN KEY ("visualTemplateId") REFERENCES "visual_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("createdAt", "deletedAt", "description", "enabled", "id", "name", "updatedAt") SELECT "createdAt", "deletedAt", "description", "enabled", "id", "name", "updatedAt" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE INDEX "projects_visualTemplateId_idx" ON "projects"("visualTemplateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "visual_templates_name_key" ON "visual_templates"("name");
