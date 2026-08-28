-- Vue : solde courant par client
-- Solde = (ventes + dépenses) - (paiements + avances)
-- Positif = le client doit de l'argent | Négatif = crédit client

CREATE OR REPLACE VIEW vue_soldes_clients AS
SELECT
  c.id,
  c.nom,
  c.telephone,
  c.email,
  c.adresse,
  c.type_client,
  c.actif,
  c.created_at,
  c.updated_at,
  COALESCE(SUM(
    CASE
      WHEN o.type_operation IN ('vente', 'depense') THEN o.montant
      WHEN o.type_operation IN ('paiement', 'avance') THEN -o.montant
      ELSE 0
    END
  ), 0) AS solde,
  COUNT(o.id) AS nombre_operations
FROM clients c
LEFT JOIN operations_client o ON o.client_id = c.id
GROUP BY c.id, c.nom, c.telephone, c.email, c.adresse, c.type_client, c.actif, c.created_at, c.updated_at;

-- Fonction trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();

DROP TRIGGER IF EXISTS operations_client_updated_at ON operations_client;
CREATE TRIGGER operations_client_updated_at
  BEFORE UPDATE ON operations_client
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
