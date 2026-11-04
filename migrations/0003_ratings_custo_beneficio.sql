-- Votes from before this category stay NULL, which AVG() skips.
ALTER TABLE ratings ADD COLUMN custo_beneficio INTEGER CHECK (custo_beneficio BETWEEN 1 AND 5);
