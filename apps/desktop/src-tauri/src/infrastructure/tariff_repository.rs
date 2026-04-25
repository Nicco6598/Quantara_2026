use std::path::Path;

use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};

use crate::{db::migrations::apply_migrations, models::app_error::AppError};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTariffBookRequest {
    pub id: String,
    pub name: String,
    pub source_name: String,
    pub status: String,
    #[serde(default)]
    pub voices: Vec<TariffVoiceRecord>,
    pub year: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTariffBookRequest {
    pub name: String,
    pub source_name: String,
    pub status: String,
    pub year: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffVoiceRecord {
    pub category: String,
    pub description: String,
    pub id: String,
    pub official_code: String,
    pub tariff_book_id: String,
    pub unit_of_measure: String,
    pub unit_price: f64,
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffPdfImportPreview {
    pub name: String,
    pub source_name: String,
    pub voices: Vec<TariffVoiceRecord>,
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
    connection: &mut Connection,
    request: CreateTariffBookRequest,
) -> Result<TariffBookRecord, AppError> {
    validate_tariff_book_request(&request)?;
    apply_migrations(connection).map_err(to_database_error)?;

    let transaction = connection.transaction().map_err(to_database_error)?;

    transaction
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

    for voice in &request.voices {
        insert_tariff_voice(&transaction, &request.id, voice)?;
    }

    transaction.commit().map_err(to_database_error)?;

    Ok(TariffBookRecord {
        id: request.id,
        name: request.name,
        source_name: request.source_name,
        status: request.status,
        year: request.year,
    })
}

pub fn update_tariff_book(
    connection: &Connection,
    tariff_book_id: &str,
    request: UpdateTariffBookRequest,
) -> Result<TariffBookRecord, AppError> {
    validate_tariff_book_update_request(&request)?;
    apply_migrations(connection).map_err(to_database_error)?;

    let updated = connection
        .execute(
            "UPDATE tariff_books
             SET name = ?1, source_name = ?2, year = ?3, status = ?4
             WHERE id = ?5",
            params![
                request.name,
                request.source_name,
                request.year,
                request.status,
                tariff_book_id
            ],
        )
        .map_err(to_database_error)?;

    if updated == 0 {
        return Err(AppError::Database("tariff book not found".into()));
    }

    get_tariff_book(connection, tariff_book_id)?
        .ok_or_else(|| AppError::Database("updated tariff book could not be reloaded".into()))
}

pub fn delete_tariff_book(
    connection: &mut Connection,
    tariff_book_id: &str,
) -> Result<(), AppError> {
    apply_migrations(connection).map_err(to_database_error)?;

    let transaction = connection.transaction().map_err(to_database_error)?;
    transaction
        .execute(
            "DELETE FROM tariff_priorities WHERE tariff_book_id = ?1",
            [tariff_book_id],
        )
        .map_err(to_database_error)?;
    transaction
        .execute(
            "DELETE FROM tariff_voices WHERE tariff_book_id = ?1",
            [tariff_book_id],
        )
        .map_err(to_database_error)?;
    transaction
        .execute("DELETE FROM tariff_books WHERE id = ?1", [tariff_book_id])
        .map_err(to_database_error)?;
    transaction.commit().map_err(to_database_error)?;

    Ok(())
}

pub fn list_tariff_voices(
    connection: &Connection,
    tariff_book_id: &str,
) -> Result<Vec<TariffVoiceRecord>, AppError> {
    apply_migrations(connection).map_err(to_database_error)?;

    let mut statement = connection
        .prepare(
            "SELECT id, tariff_book_id, official_code, description, category, unit_of_measure, unit_price_cents
             FROM tariff_voices
             WHERE tariff_book_id = ?1
             ORDER BY official_code ASC",
        )
        .map_err(to_database_error)?;

    statement
        .query_map([tariff_book_id], map_tariff_voice_row)
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)
}

pub fn import_tariff_pdf_preview(path: &Path) -> Result<TariffPdfImportPreview, AppError> {
    let bytes = std::fs::read(path).map_err(|error| AppError::Database(error.to_string()))?;
    let fallback_name = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Tariffario importato")
        .replace(['_', '-'], " ");
    let extracted_text = extract_pdf_like_text(&bytes);
    let source_text = if extracted_text.trim().is_empty() {
        fallback_name.clone()
    } else {
        extracted_text
    };
    let year =
        infer_year(&source_text).unwrap_or_else(|| infer_year(&fallback_name).unwrap_or(2026));
    let source_name = infer_source_name(&source_text);
    let voices = parse_tariff_voices(&source_text, "tariff_import_preview");

    Ok(TariffPdfImportPreview {
        name: fallback_name,
        source_name,
        voices,
        year,
    })
}

fn get_tariff_book(
    connection: &Connection,
    tariff_book_id: &str,
) -> Result<Option<TariffBookRecord>, AppError> {
    connection
        .query_row(
            "SELECT id, name, source_name, year, status
             FROM tariff_books
             WHERE id = ?1",
            [tariff_book_id],
            map_tariff_book_row,
        )
        .optional()
        .map_err(to_database_error)
}

fn insert_tariff_voice(
    connection: &Connection,
    tariff_book_id: &str,
    voice: &TariffVoiceRecord,
) -> Result<(), AppError> {
    connection
        .execute(
            "INSERT OR REPLACE INTO tariff_voices (
                id,
                tariff_book_id,
                official_code,
                description,
                category,
                unit_of_measure,
                unit_price_cents
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                voice.id,
                tariff_book_id,
                voice.official_code,
                voice.description,
                voice.category,
                voice.unit_of_measure,
                money_to_cents(voice.unit_price)
            ],
        )
        .map_err(to_database_error)?;

    Ok(())
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

fn map_tariff_voice_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<TariffVoiceRecord> {
    let amount_cents: i64 = row.get(6)?;

    Ok(TariffVoiceRecord {
        id: row.get(0)?,
        tariff_book_id: row.get(1)?,
        official_code: row.get(2)?,
        description: row.get(3)?,
        category: row.get(4)?,
        unit_of_measure: row.get(5)?,
        unit_price: cents_to_money(amount_cents),
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

fn validate_tariff_book_update_request(request: &UpdateTariffBookRequest) -> Result<(), AppError> {
    if request.name.trim().is_empty()
        || request.source_name.trim().is_empty()
        || request.status.trim().is_empty()
    {
        return Err(AppError::Validation(
            "tariff book name, source and status are required".into(),
        ));
    }

    if request.year < 1900 || request.year > 2200 {
        return Err(AppError::Validation(
            "tariff book year is outside the supported range".into(),
        ));
    }

    Ok(())
}

fn extract_pdf_like_text(bytes: &[u8]) -> String {
    let raw = String::from_utf8_lossy(bytes);
    let mut values = Vec::new();
    let mut current = String::new();
    let mut in_literal = false;

    for character in raw.chars() {
        if in_literal {
            if character == ')' {
                if current.trim().len() > 2 {
                    values.push(current.trim().to_string());
                }
                current.clear();
                in_literal = false;
            } else if !character.is_control() || character == '\n' {
                current.push(character);
            }
            continue;
        }

        if character == '(' {
            in_literal = true;
        }
    }

    for line in raw.lines() {
        let printable: String = line
            .chars()
            .filter(|character| {
                character.is_ascii_graphic()
                    || character.is_ascii_whitespace()
                    || !character.is_ascii()
            })
            .collect();
        if printable.chars().any(|character| character.is_alphabetic()) && printable.len() > 8 {
            values.push(printable);
        }
    }

    values.join("\n")
}

fn parse_tariff_voices(text: &str, tariff_book_id: &str) -> Vec<TariffVoiceRecord> {
    text.lines()
        .filter_map(|line| parse_tariff_voice_line(line, tariff_book_id))
        .take(500)
        .collect()
}

fn parse_tariff_voice_line(line: &str, tariff_book_id: &str) -> Option<TariffVoiceRecord> {
    let compact_line = line.split_whitespace().collect::<Vec<_>>().join(" ");
    let parts = compact_line.split_whitespace().collect::<Vec<_>>();
    let code = parts
        .first()?
        .trim_matches(|character: char| !character.is_alphanumeric() && character != '.');

    if !is_supported_tariff_code(code) {
        return None;
    }

    let price_token = parts.iter().rev().find(|part| {
        part.chars().any(|character| character.is_ascii_digit()) && part.contains(',')
    })?;
    let price = parse_price(price_token)?;
    let price_index = parts
        .iter()
        .position(|part| part == price_token)
        .unwrap_or(parts.len().saturating_sub(1));
    let unit = parts
        .get(price_index.checked_sub(1)?)
        .copied()
        .filter(|part| !part.contains('€'))
        .or_else(|| {
            price_index
                .checked_sub(2)
                .and_then(|index| parts.get(index).copied())
        })
        .unwrap_or("cad");
    let description = compact_line
        .replace(code, "")
        .replace(price_token, "")
        .trim()
        .to_string();

    if description.len() < 8 {
        return None;
    }

    Some(TariffVoiceRecord {
        category: infer_voice_category(&description),
        description,
        id: format!("voice_{}_{}", tariff_book_id, sanitize_identifier(code)),
        official_code: code.to_string(),
        tariff_book_id: tariff_book_id.to_string(),
        unit_of_measure: unit.trim_matches('/').to_string(),
        unit_price: price,
    })
}

fn parse_price(value: &str) -> Option<f64> {
    let normalized = value
        .replace("€", "")
        .replace('.', "")
        .replace(',', ".")
        .trim()
        .to_string();

    normalized.parse::<f64>().ok()
}

fn is_supported_tariff_code(value: &str) -> bool {
    let has_structured_segments = value.contains('.') && value.len() >= 5;
    let is_rfi_code = value.len() == 6
        && value.starts_with("50")
        && value.chars().all(|char| char.is_ascii_digit());

    has_structured_segments || is_rfi_code
}

fn infer_voice_category(description: &str) -> String {
    let lower_description = description.to_lowercase();

    if lower_description.contains("sicurezza") || lower_description.contains("oneri") {
        return "safety-os".into();
    }

    if lower_description.contains("binario") || lower_description.contains("armamento") {
        return "armament".into();
    }

    if lower_description.contains("elettric") || lower_description.contains("contatto") {
        return "electrical".into();
    }

    "civil-works".into()
}

fn infer_year(value: &str) -> Option<i32> {
    value
        .split(|character: char| !character.is_ascii_digit())
        .filter_map(|part| part.parse::<i32>().ok())
        .find(|year| (1900..=2200).contains(year))
}

fn infer_source_name(value: &str) -> String {
    let lower_value = value.to_lowercase();

    if lower_value.contains("lombardia") {
        return "Regione Lombardia".into();
    }

    if lower_value.contains("piemonte") {
        return "Regione Piemonte".into();
    }

    if lower_value.contains("rfi") {
        return "RFI".into();
    }

    if lower_value.contains("anas") {
        return "ANAS".into();
    }

    "Ente da confermare".into()
}

fn sanitize_identifier(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character
            } else {
                '_'
            }
        })
        .collect()
}

fn money_to_cents(amount: f64) -> i64 {
    (amount * 100.0).round() as i64
}

fn cents_to_money(amount_cents: i64) -> f64 {
    amount_cents as f64 / 100.0
}

fn to_database_error(error: rusqlite::Error) -> AppError {
    AppError::Database(error.to_string())
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use super::{
        CreateTariffBookRequest, TariffVoiceRecord, create_tariff_book, list_tariff_books,
        list_tariff_voices, parse_tariff_voices,
    };

    #[test]
    fn creates_and_lists_tariff_books() {
        let mut connection = Connection::open_in_memory().expect("in-memory db");

        create_tariff_book(
            &mut connection,
            CreateTariffBookRequest {
                id: "tariff_lombardia_2025".into(),
                name: "Tariffario Lombardia 2025".into(),
                source_name: "Regione Lombardia".into(),
                status: "active".into(),
                voices: vec![TariffVoiceRecord {
                    category: "armament".into(),
                    description: "Fornitura e posa binario tipo 60E1".into(),
                    id: "voice_binario_60e1".into(),
                    official_code: "03.C01.C10.035".into(),
                    tariff_book_id: "tariff_lombardia_2025".into(),
                    unit_of_measure: "m".into(),
                    unit_price: 1250.0,
                }],
                year: 2025,
            },
        )
        .expect("tariff book created");

        let tariff_books = list_tariff_books(&connection).expect("tariff books listed");

        assert_eq!(tariff_books.len(), 1);
        assert_eq!(tariff_books[0].id, "tariff_lombardia_2025");

        let voices =
            list_tariff_voices(&connection, "tariff_lombardia_2025").expect("tariff voices listed");
        assert_eq!(voices.len(), 1);
        assert_eq!(voices[0].unit_price, 1250.0);
    }

    #[test]
    fn rejects_invalid_tariff_book_year() {
        let mut connection = Connection::open_in_memory().expect("in-memory db");

        let result = create_tariff_book(
            &mut connection,
            CreateTariffBookRequest {
                id: "tariff_invalid".into(),
                name: "Invalid".into(),
                source_name: "Test".into(),
                status: "active".into(),
                voices: Vec::new(),
                year: 1800,
            },
        );

        assert!(result.is_err());
    }

    #[test]
    fn parses_tariff_voices_from_text_lines() {
        let voices = parse_tariff_voices(
            "03.C01.C10.035 Fornitura e posa binario tipo 60E1 m € 1.250,00",
            "tariff_test",
        );

        assert_eq!(voices.len(), 1);
        assert_eq!(voices[0].official_code, "03.C01.C10.035");
        assert_eq!(voices[0].unit_of_measure, "m");
        assert_eq!(voices[0].unit_price, 1250.0);
    }

    #[test]
    fn parses_rfi_tariff_codes_from_text_lines() {
        let voices = parse_tariff_voices(
            "501234 Rimozione e posa apparecchiatura ferroviaria cad € 240,50",
            "tariff_rfi",
        );

        assert_eq!(voices.len(), 1);
        assert_eq!(voices[0].official_code, "501234");
        assert_eq!(voices[0].unit_of_measure, "cad");
        assert_eq!(voices[0].unit_price, 240.5);
    }
}
