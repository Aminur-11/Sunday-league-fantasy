-- Repurpose "goals conceded" scoring from a per-N penalty into a bonus for
-- conceding fewer than N goals. Column values are preserved (renamed, not
-- reset) since the admin can re-tune them in Admin > Game Rules afterward.
ALTER TABLE "PositionScoringRule" RENAME COLUMN "concededPenalty" TO "concededBonusPoints";
ALTER TABLE "PositionScoringRule" RENAME COLUMN "concededThreshold" TO "concededBonusThreshold";
ALTER TABLE "PositionScoringRule" ALTER COLUMN "concededBonusPoints" SET DEFAULT 5;
