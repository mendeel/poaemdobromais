-- Wait time: 1 = faster than expected, 2 = as expected, 3 = slower.
-- Votes from before this question stay NULL.
ALTER TABLE ratings ADD COLUMN espera INTEGER CHECK (espera BETWEEN 1 AND 3);
