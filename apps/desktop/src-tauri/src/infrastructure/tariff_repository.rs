use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

use crate::{db::migrations::apply_migrations, models::app_error::AppError};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTariffBookRequest {
    pub id: String,
    pub name: String,
    pub source_name: String,
    pub status: String,
    pub year: i32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffBookRecord {
    pub id: String,
    pub name: String,
    pub source_name: String,
    pub status: String,
    pub year: i32,
}

pub fn list_tariff_books(connection: &Connection) -> Result<Vec<TariffBookRecord>, AppError> {
    apply_migrations(connection).map_err(to_database_error)?;

    let mut statement = connection
        .prepare(
            "SELECT id, name, source_name, year, status
             FROM tariff_books
             ORDER BY year DESC, name ASC",
        )
        .map_err(to_database_error)?;

    statement
        .query_map([], map_tariff_book_row)
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)
}

pub fn create_tariff_book(
    connection: &Connection,
    request: CreateTariffBookRequest,
) -> Result<TariffBookRecord, AppError> {
    validate_tariff_book_request(&request)?;
    apply_migrations(connection).map_err(to_database_error)?;

    connection
        .execute(
            "INSERT INTO tariff_books (id, name, source_name, year, status)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                request.id,
                request.name,
                request.source_name,
                request.year,
                request.status
            ],
        )
        .map_err(to_database_error)?;

    Ok(TariffBookRecord {
        id: request.id,
        name: request.name,
        source_name: request.source_name,
        status: request.status,
        year: request.year,
    })
}

fn map_tariff_book_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TariffBookRecord> {
    Ok(TariffBookRecord {
        id: row.get(0)?,
        name: row.get(1)?,
        source_name: row.get(2)?,
        year: row.get(3)?,
        status: row.get(4)?,
    })
}

fn validate_tariff_book_request(request: &CreateTariffBookRequest) -> Result<(), AppError> {
    if request.id.trim().is_empty()
        || request.name.trim().is_empty()
        || request.source_name.trim().is_empty()
        || request.status.trim().is_empty()
    {
        return Err(AppError::Validation(
            "tariff book id, name, source and status are required".into(),
        ));
    }

    if request.year < 1900 || request.year > 2200 {
        return Err(AppError::Validation(
            "tariff book year is outside the supported range".into(),
        ));
    }

    Ok(())
}

fn to_database_error(error: rusqlite::Error) -> AppError {
    AppError::Database(error.to_string())
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use super::{CreateTariffBookRequest, create_tariff_book, list_tariff_books};

    #[test]
    fn creates_and_lists_tariff_books() {
        let connection = Connection::open_in_memory().expect("in-memory db");

        create_tariff_book(
            &connection,
            CreateTariffBookRequest {
                id: "tariff_lombardia_2025".into(),
                name: "Tariffario Lombardia 2025".into(),
                source_name: "Regione Lombardia".into(),
                status: "active".into(),
                year: 2025,
            },
        )
        .expect("tariff book created");

        let tariff_books = list_tariff_books(&connection).expect("tariff books listed");

        assert_eq!(tariff_books.len(), 1);
        assert_eq!(tariff_books[0].id, "tariff_lombardia_2025");
    }

    #[test]
    fn rejects_invalid_tariff_book_year() {
        let connection = Connection::open_in_memory().expect("in-memory db");

        let result = create_tariff_book(
            &connection,
            CreateTariffBookRequest {
                id: "tariff_invalid".into(),
                name: "Invalid".into(),
                source_name: "Test".into(),
                status: "active".into(),
                year: 1800,
            },
        );

        assert!(result.is_err());
    }
}
