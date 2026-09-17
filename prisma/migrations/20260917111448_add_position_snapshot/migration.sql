/*
  Warnings:

  - You are about to drop the column `provisional` on the `FantasyTeamGameweekPoints` table. All the data in the column will be lost.
  - Added the required column `positionAtTime` to the `PlayerMatchStat` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FantasyTeamGameweekPoints" DROP COLUMN "provisional";

-- AlterTable
ALTER TABLE "PlayerMatchStat" ADD COLUMN     "positionAtTime" "Position" NOT NULL;
