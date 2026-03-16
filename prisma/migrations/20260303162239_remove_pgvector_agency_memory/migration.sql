/*
  Warnings:

  - You are about to drop the `AgencyMemory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE IF EXISTS "AgencyMemory" DROP CONSTRAINT IF EXISTS "AgencyMemory_agencyId_fkey";

-- DropTable
DROP TABLE IF EXISTS "AgencyMemory";
