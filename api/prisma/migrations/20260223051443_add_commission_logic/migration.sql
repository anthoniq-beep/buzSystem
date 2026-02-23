-- CreateEnum
CREATE TYPE "ChannelCategory" AS ENUM ('COMPANY', 'PERSONAL');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('CHANCE', 'CALL', 'TOUCH', 'DEAL', 'DEPT');

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "category" "ChannelCategory" NOT NULL DEFAULT 'COMPANY';

-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "type" "CommissionType" NOT NULL DEFAULT 'DEAL';
