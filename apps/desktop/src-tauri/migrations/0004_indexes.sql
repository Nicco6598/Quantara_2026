-- Indexes for frequently queried foreign key columns
CREATE INDEX IF NOT EXISTS idx_tariff_priorities_contract ON tariff_priorities(contract_id);
CREATE INDEX IF NOT EXISTS idx_tariff_priorities_book ON tariff_priorities(tariff_book_id);
CREATE INDEX IF NOT EXISTS idx_tariff_voices_book ON tariff_voices(tariff_book_id);
CREATE INDEX IF NOT EXISTS idx_sal_documents_contract ON sal_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_updated ON contracts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sal_documents_status ON sal_documents(status);
