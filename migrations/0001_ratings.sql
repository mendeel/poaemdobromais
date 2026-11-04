-- One row per (restaurant, anonymous voter). Voting again replaces the row.
CREATE TABLE ratings (
  cupom_id    TEXT    NOT NULL,
  voter_id    TEXT    NOT NULL,
  ip_hash     TEXT    NOT NULL,
  atendimento INTEGER NOT NULL CHECK (atendimento BETWEEN 1 AND 5),
  comida      INTEGER NOT NULL CHECK (comida BETWEEN 1 AND 5),
  ambiente    INTEGER NOT NULL CHECK (ambiente BETWEEN 1 AND 5),
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (cupom_id, voter_id)
);

CREATE INDEX ratings_ip_recent ON ratings (ip_hash, updated_at);
