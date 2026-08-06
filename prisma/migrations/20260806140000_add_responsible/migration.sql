-- CreateTable
CREATE TABLE "responsibles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "responsibles_email_key" ON "responsibles"("email");

-- AlterTable
ALTER TABLE "sheets" ADD COLUMN "responsible_id" UUID;

-- CreateIndex
CREATE INDEX "sheets_responsible_id_idx" ON "sheets"("responsible_id");

-- AddForeignKey
ALTER TABLE "sheets" ADD CONSTRAINT "sheets_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "responsibles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
