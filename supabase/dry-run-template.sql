-- ============================================================
-- DR-T: Migration Dry Run Template
-- Use this template in the Supabase SQL Editor to validate
-- migrations before applying them permanently.
-- ============================================================

BEGIN;

-- PASTE YOUR MIGRATION SCRIPT BELOW
-- ------------------------------------------------------------

-- Example:
-- CREATE TABLE test_table (id uuid primary key);

-- ------------------------------------------------------------
-- END OF MIGRATION SCRIPT

-- The following command ensures that all changes are reverted.
-- If the script above has errors, the transaction will fail.
-- If it succeeds, the rollback will still happen, but you'll
-- know the syntax and constraints are valid.

ROLLBACK;

-- Look for "Success" or "Queued" in the output.
-- If you see "ROLLBACK", the structural integrity is verified.
