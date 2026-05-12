use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};

use crate::{
    db::migrations::apply_migrations,
    infrastructure::{cents_to_money, money_to_cents, to_database_error, Money},
    models::app_error::AppError,
};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffPriorityRecord {
    pub priority: i32,
    pub reason: String,
    pub tariff_book_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateContractRequest {
    pub application_contract_code: String,
    pub contractual_amount: f64,
    pub framework_agreement_code: String,
    pub id: String,
    pub tender_discount_percent: f64,
    pub tariff_priorities: Vec<TariffPriorityRecord>,
    pub title: String,
    #[serde(default)]
    pub os_excluded_amount: Option<f64>,
}

pub type UpdateContractRequest = CreateContractRequest;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContractRecord {
    pub application_contract_code: String,
    pub contractual_amount: Money,
    pub framework_agreement_code: String,
    pub id: String,
    pub tender_discount_percent: f64,
    pub tariff_priorities: Vec<TariffPriorityRecord>,
    pub title: String,
    pub os_excluded_amount: Option<f64>,
}

pub fn list_contracts(connection: &Connection) -> Result<Vec<ContractRecord>, AppError> {
    apply_migrations(connection).map_err(to_database_error)?;

    let mut statement = connection
        .prepare(
            "SELECT id, title, application_contract_code, framework_agreement_code, contractual_amount_cents
             , tender_discount_percent, os_excluded_amount_cents
             FROM contracts
             ORDER BY updated_at DESC, title ASC",
        )
        .map_err(to_database_error)?;

    let contracts = statement
        .query_map([], map_contract_row)
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)?;

    contracts
        .into_iter()
        .map(|mut contract| {
            contract.tariff_priorities = list_priorities(connection, &contract.id)?;
            Ok(contract)
        })
        .collect()
}

pub fn get_contract(
    connection: &Connection,
    contract_id: &str,
) -> Result<Option<ContractRecord>, AppError> {
    apply_migrations(connection).map_err(to_database_error)?;

    let mut contract = connection
        .query_row(
            "SELECT id, title, application_contract_code, framework_agreement_code, contractual_amount_cents
             , tender_discount_percent, os_excluded_amount_cents
             FROM contracts
             WHERE id = ?1",
            [contract_id],
            map_contract_row,
        )
        .optional()
        .map_err(to_database_error)?;

    if let Some(contract) = &mut contract {
        contract.tariff_priorities = list_priorities(connection, &contract.id)?;
    }

    Ok(contract)
}

pub fn create_contract(
    connection: &mut Connection,
    request: CreateContractRequest,
) -> Result<ContractRecord, AppError> {
    validate_contract_request(&request)?;
    apply_migrations(connection).map_err(to_database_error)?;

    let transaction = connection.transaction().map_err(to_database_error)?;
    let amount_cents = money_to_cents(request.contractual_amount);

    let os_cents = request
        .os_excluded_amount
        .map(money_to_cents)
        .unwrap_or(0);

    transaction
        .execute(
            "INSERT INTO contracts (
                id,
                title,
                application_contract_code,
                framework_agreement_code,
                contractual_amount_cents,
                tender_discount_percent,
                os_excluded_amount_cents
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                request.id,
                request.title,
                request.application_contract_code,
                request.framework_agreement_code,
                amount_cents,
                request.tender_discount_percent,
                os_cents
            ],
        )
        .map_err(to_database_error)?;

    for priority in &request.tariff_priorities {
        transaction
            .execute(
                "INSERT INTO tariff_priorities (contract_id, tariff_book_id, priority, reason)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    request.id,
                    priority.tariff_book_id,
                    priority.priority,
                    priority.reason
                ],
            )
            .map_err(to_database_error)?;
    }

    transaction.commit().map_err(to_database_error)?;

    get_contract(connection, &request.id)?
        .ok_or_else(|| AppError::Database("created contract could not be reloaded".into()))
}

pub fn update_contract(
    connection: &mut Connection,
    contract_id: &str,
    request: UpdateContractRequest,
) -> Result<ContractRecord, AppError> {
    validate_contract_request(&request)?;
    apply_migrations(connection).map_err(to_database_error)?;

    let transaction = connection.transaction().map_err(to_database_error)?;
    let amount_cents = money_to_cents(request.contractual_amount);

    let os_cents = request
        .os_excluded_amount
        .map(money_to_cents)
        .unwrap_or(0);

    let updated = transaction
        .execute(
            "UPDATE contracts
             SET title = ?1,
                 application_contract_code = ?2,
                 framework_agreement_code = ?3,
                 contractual_amount_cents = ?4,
                 tender_discount_percent = ?5,
                 os_excluded_amount_cents = ?6,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?7",
            params![
                request.title,
                request.application_contract_code,
                request.framework_agreement_code,
                amount_cents,
                request.tender_discount_percent,
                os_cents,
                contract_id
            ],
        )
        .map_err(to_database_error)?;

    if updated == 0 {
        return Err(AppError::Database("contract not found".into()));
    }

    transaction
        .execute(
            "DELETE FROM tariff_priorities WHERE contract_id = ?1",
            [contract_id],
        )
        .map_err(to_database_error)?;

    for priority in &request.tariff_priorities {
        transaction
            .execute(
                "INSERT INTO tariff_priorities (contract_id, tariff_book_id, priority, reason)
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    contract_id,
                    priority.tariff_book_id,
                    priority.priority,
                    priority.reason
                ],
            )
            .map_err(to_database_error)?;
    }

    transaction.commit().map_err(to_database_error)?;

    get_contract(connection, contract_id)?
        .ok_or_else(|| AppError::Database("updated contract could not be reloaded".into()))
}

pub fn delete_contract(connection: &mut Connection, contract_id: &str) -> Result<(), AppError> {
    apply_migrations(connection).map_err(to_database_error)?;

    let transaction = connection.transaction().map_err(to_database_error)?;
    transaction
        .execute(
            "DELETE FROM tariff_priorities WHERE contract_id = ?1",
            [contract_id],
        )
        .map_err(to_database_error)?;
    transaction
        .execute(
            "DELETE FROM sal_documents WHERE contract_id = ?1",
            [contract_id],
        )
        .map_err(to_database_error)?;
    transaction
        .execute("DELETE FROM contracts WHERE id = ?1", [contract_id])
        .map_err(to_database_error)?;
    transaction.commit().map_err(to_database_error)?;

    Ok(())
}

fn list_priorities(
    connection: &Connection,
    contract_id: &str,
) -> Result<Vec<TariffPriorityRecord>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT tariff_book_id, priority, reason
             FROM tariff_priorities
             WHERE contract_id = ?1
             ORDER BY priority ASC, tariff_book_id ASC",
        )
        .map_err(to_database_error)?;

    statement
        .query_map([contract_id], |row| {
            Ok(TariffPriorityRecord {
                priority: row.get(1)?,
                reason: row.get(2)?,
                tariff_book_id: row.get(0)?,
            })
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)
}

fn map_contract_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ContractRecord> {
    let amount_cents: i64 = row.get(4)?;
    let tender_discount_percent: f64 = row.get(5)?;
    let os_cents: Option<i64> = row.get(6).ok();

    Ok(ContractRecord {
        application_contract_code: row.get(2)?,
        contractual_amount: Money {
            amount: cents_to_money(amount_cents),
            currency: "EUR",
        },
        framework_agreement_code: row.get(3)?,
        id: row.get(0)?,
        tender_discount_percent,
        tariff_priorities: Vec::new(),
        title: row.get(1)?,
        os_excluded_amount: os_cents.map(cents_to_money),
    })
}

fn validate_contract_request(request: &CreateContractRequest) -> Result<(), AppError> {
    if request.id.trim().is_empty()
        || request.title.trim().is_empty()
        || request.application_contract_code.trim().is_empty()
        || request.framework_agreement_code.trim().is_empty()
    {
        return Err(AppError::Validation(
            "ID contratto, titolo e codici sono obbligatori".into(),
        ));
    }

    if !request.contractual_amount.is_finite() || request.contractual_amount < 0.0 {
        return Err(AppError::Validation(
            "l'importo contrattuale deve essere un numero positivo".into(),
        ));
    }

    if !request.tender_discount_percent.is_finite()
        || request.tender_discount_percent < 0.0
        || request.tender_discount_percent > 100.0
    {
        return Err(AppError::Validation(
            "la percentuale di ribasso deve essere tra 0 e 100".into(),
        ));
    }

    for priority in &request.tariff_priorities {
        if priority.priority < 1
            || priority.tariff_book_id.trim().is_empty()
            || priority.reason.trim().is_empty()
        {
            return Err(AppError::Validation(
                "le priorita tariffarie richiedono priorita positiva, ID tariffario e motivo".into(),
            ));
        }
    }

    Ok(())
}



#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use crate::db::migrations::apply_migrations;

    use super::{
        CreateContractRequest, TariffPriorityRecord, create_contract, get_contract, list_contracts,
    };

    #[test]
    fn creates_and_loads_contract_with_tariff_priorities() {
        let mut connection = Connection::open_in_memory().expect("in-memory db");
        seed_tariff_books(&connection);
        let request = sample_contract();

        let created = create_contract(&mut connection, request).expect("contract created");

        assert_eq!(created.id, "contract_milano_verona");
        assert_eq!(created.contractual_amount.amount, 26_150_000.25);
        assert!((created.tender_discount_percent - 18.25).abs() < f64::EPSILON);
        assert_eq!(created.tariff_priorities.len(), 2);

        let contracts = list_contracts(&connection).expect("contracts listed");
        assert_eq!(contracts.len(), 1);

        let loaded = get_contract(&connection, "contract_milano_verona")
            .expect("contract loaded")
            .expect("contract present");
        assert_eq!(loaded.title, "Linea AV/AC Milano-Verona");
        assert_eq!(
            loaded.tariff_priorities[0].tariff_book_id,
            "tariff_lombardia_2025"
        );
    }

    fn seed_tariff_books(connection: &Connection) {
        apply_migrations(connection).expect("schema applied");
        connection
            .execute(
                "INSERT INTO tariff_books (id, name, source_name, year, status)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                [
                    "tariff_lombardia_2025",
                    "Tariffario Lombardia 2025",
                    "Regione Lombardia",
                    "2025",
                    "active",
                ],
            )
            .expect("primary tariff book seeded");
        connection
            .execute(
                "INSERT INTO tariff_books (id, name, source_name, year, status)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                [
                    "tariff_rfi_2024",
                    "Tariffario RFI 2024",
                    "RFI",
                    "2024",
                    "fallback",
                ],
            )
            .expect("fallback tariff book seeded");
    }

    #[test]
    fn creates_contract_without_tariff_priorities() {
        let mut connection = Connection::open_in_memory().expect("in-memory db");
        let mut request = sample_contract();
        request.tariff_priorities = Vec::new();

        let created = create_contract(&mut connection, request).expect("contract created");

        assert!(created.tariff_priorities.is_empty());
    }

    fn sample_contract() -> CreateContractRequest {
        CreateContractRequest {
            application_contract_code: "CA-MV-001".into(),
            contractual_amount: 26_150_000.25,
            framework_agreement_code: "AQ-RFI-2026".into(),
            id: "contract_milano_verona".into(),
            tender_discount_percent: 18.25,
            tariff_priorities: vec![
                TariffPriorityRecord {
                    priority: 1,
                    reason: "Tariffario contrattuale".into(),
                    tariff_book_id: "tariff_lombardia_2025".into(),
                },
                TariffPriorityRecord {
                    priority: 2,
                    reason: "Fallback nazionale".into(),
                    tariff_book_id: "tariff_rfi_2024".into(),
                },
            ],
            title: "Linea AV/AC Milano-Verona".into(),
            os_excluded_amount: None,
        }
    }
}
