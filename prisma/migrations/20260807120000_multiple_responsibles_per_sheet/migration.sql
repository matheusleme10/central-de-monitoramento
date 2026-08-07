-- CreateTable
CREATE TABLE "sheet_responsibles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sheet_id" UUID NOT NULL,
    "responsible_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sheet_responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sheet_responsibles_sheet_id_responsible_id_key" ON "sheet_responsibles"("sheet_id", "responsible_id");

-- CreateIndex
CREATE INDEX "sheet_responsibles_responsible_id_idx" ON "sheet_responsibles"("responsible_id");

-- AddForeignKey
ALTER TABLE "sheet_responsibles" ADD CONSTRAINT "sheet_responsibles_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_responsibles" ADD CONSTRAINT "sheet_responsibles_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "responsibles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MigrateData: preserva o único responsável já cadastrado por aba (se houver)
-- na nova tabela de junção, antes de remover a coluna antiga.
INSERT INTO "sheet_responsibles" ("sheet_id", "responsible_id")
SELECT "id", "responsible_id" FROM "sheets" WHERE "responsible_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "sheets" DROP CONSTRAINT IF EXISTS "sheets_responsible_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "sheets_responsible_id_idx";

-- AlterTable
ALTER TABLE "sheets" DROP COLUMN "responsible_id";
