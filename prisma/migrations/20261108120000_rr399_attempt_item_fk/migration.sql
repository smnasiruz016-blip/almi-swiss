-- RR-399 A1: attempts never saved. "SwissAttempt"."itemId" was a required foreign key to "SwissItem", a table this product never
-- fills (items are served from the JSON bundles), so every attempt insert failed. Drop only that key; "itemId" stays a required
-- text column with its index ("SwissAttempt_itemId_idx"). No data changes. IF EXISTS: safe if the key is already gone.
ALTER TABLE "SwissAttempt" DROP CONSTRAINT IF EXISTS "SwissAttempt_itemId_fkey";
