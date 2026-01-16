-- Add key column and rename layout to renderer in visual_templates
-- SQLite requires recreating the table for these changes

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Create new table with updated schema
CREATE TABLE "new_visual_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "renderer" TEXT NOT NULL DEFAULT 'TECH',
    "theme" TEXT NOT NULL DEFAULT '{}',
    "components" TEXT NOT NULL DEFAULT '{}',
    "effects" TEXT NOT NULL DEFAULT '{}',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data from old table, using name as key (since name was unique before)
INSERT INTO "new_visual_templates" ("id", "key", "name", "description", "renderer", "theme", "components", "effects", "isSystem", "createdAt", "updatedAt")
SELECT "id", "name", "name", "description", "layout", "theme", "components", "effects", "isSystem", "createdAt", "updatedAt"
FROM "visual_templates";

-- Drop old table
DROP TABLE "visual_templates";

-- Rename new table
ALTER TABLE "new_visual_templates" RENAME TO "visual_templates";

-- Create unique index on key (replaces the old name unique index)
CREATE UNIQUE INDEX "visual_templates_key_key" ON "visual_templates"("key");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
