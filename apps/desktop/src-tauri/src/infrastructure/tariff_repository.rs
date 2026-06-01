use std::{
    collections::HashMap,
    fs::File,
    io::{BufRead, BufReader, BufWriter, Read, Write},
    path::{Path, PathBuf},
    process::{Child, ChildStdin, ChildStdout, Command, Stdio},
    sync::{Mutex, OnceLock},
    time::SystemTime,
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

use rusqlite::{Connection, OptionalExtension, params};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tauri::{AppHandle, Manager};

use crate::{
    infrastructure::{cents_to_money, money_to_cents, to_database_error},
    models::app_error::AppError,
};

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
    #[serde(default)]
    pub voices: Vec<TariffVoiceRecord>,
    pub year: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffWarning {
    pub id: String,
    #[serde(default)]
    #[serde(alias = "scope")]
    pub scope: String,
    #[serde(default)]
    #[serde(alias = "ref_code")]
    pub ref_code: String,
    pub title: String,
    pub body: String,
    #[serde(default)]
    #[serde(rename = "type")]
    pub warning_type: String,
    #[serde(default)]
    pub confidence: Option<f64>,
    #[serde(default)]
    pub issues: Vec<String>,
    #[serde(default)]
    pub maggiorazione_refs: Vec<String>,
    #[serde(default)]
    pub applies_to_refs: Vec<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffSourceRef {
    #[serde(default)]
    pub file: String,
    #[serde(default)]
    pub page: Option<i32>,
    #[serde(default)]
    pub line: Option<i32>,
    #[serde(default)]
    pub normalized: bool,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffApplicabilityRules {
    #[serde(default)]
    #[serde(alias = "mentions_maggiorazione")]
    pub mentions_maggiorazione: bool,
    #[serde(default)]
    #[serde(alias = "quota_manodopera_only")]
    pub quota_manodopera_only: bool,
    #[serde(default)]
    pub conditions: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffVoiceRecord {
    pub category: String,
    pub description: String,
    pub id: String,
    pub labor_percentage: Option<f64>,
    pub official_code: String,
    pub tariff_book_id: String,
    pub unit_of_measure: String,
    pub unit_price: f64,
    #[serde(default)]
    pub categoria_desc: String,
    #[serde(default)]
    pub gruppo_desc: String,
    #[serde(default)]
    pub voce: String,
    #[serde(default)]
    pub voce_desc: String,
    #[serde(default)]
    pub warnings: Vec<TariffWarning>,
    #[serde(default)]
    pub is_maggiorazione: bool,
    #[serde(default)]
    pub source: Option<TariffSourceRef>,
    #[serde(default)]
    pub confidence: Option<f64>,
    #[serde(default)]
    pub issues: Vec<String>,
    #[serde(default)]
    pub review_flags: Vec<String>,
    #[serde(default)]
    pub warning_ids: Vec<String>,
    #[serde(default)]
    pub linked_maggiorazioni: Vec<String>,
    #[serde(default)]
    pub applicability_rules: Option<TariffApplicabilityRules>,
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
    pub pages_total: i32,
    pub pages_parsed: i32,
    pub warnings: Vec<TariffWarning>,
    pub maggiorazione_rules: JsonValue,
    pub validation_report: JsonValue,
}

#[derive(Debug, Clone, Deserialize)]
struct RfiTariffRecord {
    codice: String,
    tariffa: String,
    categoria: String,
    gruppo: String,
    voce: String,
    voce_desc: String,
    sottovoce: String,
    descrizione: String,
    unita_codice: String,
    unita_label: String,
    tipo_valore: String,
    #[serde(alias = "valore")]
    valore_euro: Option<f64>,
    perc_manodopera: Option<f64>,
    #[serde(default)]
    categoria_desc: String,
    #[serde(default)]
    gruppo_desc: String,
    #[serde(default)]
    warnings: Vec<TariffWarning>,
    #[serde(default)]
    warning_ids: Vec<String>,
    #[serde(default)]
    source: Option<TariffSourceRef>,
    #[serde(default)]
    confidence: Option<f64>,
    #[serde(default)]
    issues: Vec<String>,
    #[serde(default)]
    review_flags: Vec<String>,
    #[serde(default)]
    linked_maggiorazioni: Vec<String>,
    #[serde(default)]
    applicability_rules: Option<TariffApplicabilityRules>,
}

#[derive(Debug, Clone, Deserialize)]
struct ParserOutput {
    records: Vec<RfiTariffRecord>,
    #[serde(default)]
    maggiorazioni: Vec<RfiTariffRecord>,
    #[serde(default)]
    warnings: Vec<TariffWarning>,
    #[serde(default)]
    maggiorazione_rules: JsonValue,
    #[serde(default)]
    validation_report: JsonValue,
    #[serde(default)]
    pages_total: i32,
}

#[derive(Debug, Clone, Default)]
struct ParsedRfiImport {
    records: Vec<RfiTariffRecord>,
    warnings: Vec<TariffWarning>,
    maggiorazione_rules: JsonValue,
    validation_report: JsonValue,
    pages_total: i32,
}

pub fn list_tariff_books(connection: &Connection) -> Result<Vec<TariffBookRecord>, AppError> {
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

    let transaction = connection.transaction().map_err(to_database_error)?;

    transaction
        .execute(
            "INSERT INTO tariff_books (id, name, source_name, year, status)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               source_name = excluded.source_name,
               year = excluded.year,
               status = excluded.status",
            params![
                request.id,
                request.name,
                request.source_name,
                request.year,
                request.status
            ],
        )
        .map_err(to_database_error)?;

    transaction
        .execute(
            "DELETE FROM tariff_voices WHERE tariff_book_id = ?1",
            [&request.id],
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
    connection: &mut Connection,
    tariff_book_id: &str,
    request: UpdateTariffBookRequest,
) -> Result<TariffBookRecord, AppError> {
    validate_tariff_book_update_request(&request)?;

    let transaction = connection.transaction().map_err(to_database_error)?;

    let updated = transaction
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

    if !request.voices.is_empty() {
        transaction
            .execute(
                "DELETE FROM tariff_voices WHERE tariff_book_id = ?1",
                [tariff_book_id],
            )
            .map_err(to_database_error)?;

        for voice in &request.voices {
            insert_tariff_voice(&transaction, tariff_book_id, voice)?;
        }
    }

    transaction.commit().map_err(to_database_error)?;

    get_tariff_book(connection, tariff_book_id)?
        .ok_or_else(|| AppError::Database("updated tariff book could not be reloaded".into()))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmTariffImportItem {
    pub existing_book_id: Option<String>,
    pub id: String,
    pub name: String,
    pub source_name: String,
    pub status: String,
    pub voices: Vec<TariffVoiceRecord>,
    pub year: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmTariffImportBatchRequest {
    pub items: Vec<ConfirmTariffImportItem>,
    #[serde(default)]
    pub duplicate_book_ids_to_delete: Vec<String>,
}

pub fn confirm_tariff_import_batch(
    connection: &mut Connection,
    request: ConfirmTariffImportBatchRequest,
) -> Result<Vec<TariffBookRecord>, AppError> {
    let mut saved_books = Vec::with_capacity(request.items.len());

    for item in request.items {
        if item.voices.is_empty() {
            continue;
        }

        let book = if let Some(existing_book_id) = item.existing_book_id.as_deref() {
            update_tariff_book(
                connection,
                existing_book_id,
                UpdateTariffBookRequest {
                    name: item.name,
                    source_name: item.source_name,
                    status: item.status,
                    voices: item.voices,
                    year: item.year,
                },
            )?
        } else {
            create_tariff_book(
                connection,
                CreateTariffBookRequest {
                    id: item.id,
                    name: item.name,
                    source_name: item.source_name,
                    status: item.status,
                    voices: item.voices,
                    year: item.year,
                },
            )?
        };

        saved_books.push(book);
    }

    for duplicate_id in request.duplicate_book_ids_to_delete {
        if saved_books.iter().any(|book| book.id == duplicate_id) {
            continue;
        }
        let _ = delete_tariff_book(connection, &duplicate_id);
    }

    Ok(saved_books)
}

pub fn delete_tariff_book(
    connection: &mut Connection,
    tariff_book_id: &str,
) -> Result<(), AppError> {
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
    let mut statement = connection
        .prepare(
            "SELECT id, tariff_book_id, official_code, description, category, unit_of_measure, unit_price_cents, labor_percentage, linked_maggiorazioni, applicability_rules
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffVoiceSearchResult {
    pub id: String,
    pub tariff_book_id: String,
    pub official_code: String,
    pub description: String,
    pub category: String,
    pub unit_of_measure: String,
    pub unit_price_cents: i64,
    pub labor_percentage: Option<f64>,
    pub search_rank: f64,
}

pub fn search_tariff_voices(
    conn: &Connection,
    tariff_book_ids: &[String],
    query: &str,
    limit: i64,
) -> Result<Vec<TariffVoiceSearchResult>, AppError> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let fts_query = query
        .split_whitespace()
        .filter(|t| !t.is_empty())
        .map(|term| format!("\"{}\"*", term.replace('\"', "")))
        .collect::<Vec<_>>()
        .join(" AND ");

    if fts_query.is_empty() {
        return Ok(Vec::new());
    }

    let num_books = tariff_book_ids.len();
    let limit_param = 2 + num_books;

    let mut sql = String::from(
        "SELECT v.id, v.tariff_book_id, v.official_code, v.description, \
                v.category, v.unit_of_measure, v.unit_price_cents, \
                v.labor_percentage, \
                rank
         FROM tariff_voices_fts f
         JOIN tariff_voices v ON v.rowid = f.rowid
         WHERE tariff_voices_fts MATCH ?1",
    );

    if !tariff_book_ids.is_empty() {
        sql.push_str(" AND v.tariff_book_id IN (");
        for i in 0..num_books {
            if i > 0 {
                sql.push_str(", ");
            }
            sql.push_str(&format!("?{}", i + 2));
        }
        sql.push(')');
    }

    sql.push_str(&format!(" ORDER BY rank LIMIT ?{limit_param}"));

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    params.push(Box::new(fts_query));
    for id in tariff_book_ids {
        params.push(Box::new(id.clone()));
    }
    params.push(Box::new(limit));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(to_database_error)?;
    let rows = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(TariffVoiceSearchResult {
                id: row.get(0)?,
                tariff_book_id: row.get(1)?,
                official_code: row.get(2)?,
                description: row.get(3)?,
                category: row.get(4)?,
                unit_of_measure: row.get(5)?,
                unit_price_cents: row.get(6)?,
                labor_percentage: row.get(7)?,
                search_rank: row.get(8)?,
            })
        })
        .map_err(to_database_error)?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row.map_err(to_database_error)?);
    }
    Ok(results)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TariffVoiceCountRecord {
    pub tariff_book_id: String,
    pub count: i64,
}

pub fn list_tariff_voice_counts(
    connection: &Connection,
) -> Result<Vec<TariffVoiceCountRecord>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT tariff_book_id, COUNT(*) as voice_count
             FROM tariff_voices
             GROUP BY tariff_book_id",
        )
        .map_err(to_database_error)?;

    statement
        .query_map([], |row| {
            Ok(TariffVoiceCountRecord {
                tariff_book_id: row.get(0)?,
                count: row.get(1)?,
            })
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)
}

pub fn import_tariff_pdf_preview(
    path: &Path,
    app: Option<&AppHandle>,
) -> Result<TariffPdfImportPreview, AppError> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if extension != "pdf" && extension != "json" {
        return Err(AppError::Validation(
            "only PDF or parser JSON tariff files can be imported".into(),
        ));
    }

    let metadata =
        std::fs::metadata(path).map_err(|error| AppError::Database(error.to_string()))?;
    if metadata.len() > 80 * 1024 * 1024 {
        return Err(AppError::Validation(
            "tariff file is too large to import locally".into(),
        ));
    }

    let fallback_name = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Tariffario importato")
        .replace(['_', '-'], " ");

    let parsed = if extension == "json" {
        parse_rfi_json_file(path)?
    } else {
        parse_rfi_pdf_with_python(path, app)?
    };

    let source_text = parsed
        .records
        .iter()
        .take(200)
        .map(|record| {
            format!(
                "{} {} {} {}",
                record.codice, record.voce_desc, record.descrizione, record.tariffa
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let year = infer_year(&fallback_name).unwrap_or(2025);
    let source_name = infer_source_name(&source_text);
    let records = merge_duplicate_rfi_records(parsed.records);
    let voices = records
        .iter()
        .filter_map(|record| rfi_record_to_tariff_voice(record, "tariff_import_preview"))
        .collect();

    Ok(TariffPdfImportPreview {
        name: fallback_name,
        source_name,
        voices,
        year,
        pages_total: parsed.pages_total,
        pages_parsed: parsed.pages_total,
        warnings: parsed.warnings,
        maggiorazione_rules: parsed.maggiorazione_rules,
        validation_report: parsed.validation_report,
    })
}

fn import_single_tariff_pdf(
    path: &std::path::Path,
    resource_dir: Option<&std::path::Path>,
) -> Result<TariffPdfImportPreview, String> {
    let extension = path
        .extension()
        .and_then(|v| v.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    if extension != "pdf" && extension != "json" {
        return Err("only PDF or parser JSON tariff files can be imported".into());
    }

    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    if metadata.len() > 80 * 1024 * 1024 {
        return Err("tariff file is too large to import locally".into());
    }

    let fallback_name = path
        .file_stem()
        .and_then(|v| v.to_str())
        .unwrap_or("Tariffario importato")
        .replace(['_', '-'], " ");

    let parsed = if extension == "json" {
        parse_rfi_json_file(path).map_err(|e| e.to_string())?
    } else {
        parse_rfi_pdf_with_python_direct(path, resource_dir)?
    };

    let source_text = parsed
        .records
        .iter()
        .take(200)
        .map(|r| {
            format!(
                "{} {} {} {}",
                r.codice, r.voce_desc, r.descrizione, r.tariffa
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let year = infer_year(&fallback_name).unwrap_or(2025);
    let source_name = infer_source_name(&source_text);
    let records = merge_duplicate_rfi_records(parsed.records);
    let voices = records
        .iter()
        .filter_map(|r| rfi_record_to_tariff_voice(r, "tariff_import_preview"))
        .collect();

    Ok(TariffPdfImportPreview {
        name: fallback_name,
        source_name,
        voices,
        year,
        pages_total: parsed.pages_total,
        pages_parsed: parsed.pages_total,
        warnings: parsed.warnings,
        maggiorazione_rules: parsed.maggiorazione_rules,
        validation_report: parsed.validation_report,
    })
}

fn parse_rfi_pdf_with_python_direct(
    path: &std::path::Path,
    resource_dir: Option<&std::path::Path>,
) -> Result<ParsedRfiImport, String> {
    let mut header = [0_u8; 5];
    std::fs::File::open(path)
        .and_then(|mut f| f.read_exact(&mut header))
        .map_err(|e| e.to_string())?;
    if header != *b"%PDF-" {
        return Err("selected file is not a valid PDF".into());
    }

    // Try persistent parser first
    if let Some(rd) = resource_dir
        && let Ok(result) = parse_via_persistent_parser(path, rd)
    {
        return Ok(result);
    }

    // Fallback to one-shot subprocess
    let output = run_bundled_rfi_parser_direct(path, resource_dir)?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "RFI PDF parser failed. Verify that the bundled parser includes a supported PDF engine. {stderr}"
        ));
    }

    let json_str = parser_output_to_utf8(output.stdout).map_err(|e| e.to_string())?;
    let json_str = remove_json_surrogate_escapes(&json_str);

    if let Ok(result) = serde_json::from_str::<ParserOutput>(&json_str) {
        let mut all_records = result.records;
        all_records.extend(result.maggiorazioni);
        resolve_rfi_warnings(&mut all_records, &result.warnings);
        return Ok(ParsedRfiImport {
            records: all_records,
            warnings: result.warnings,
            maggiorazione_rules: result.maggiorazione_rules,
            validation_report: result.validation_report,
            pages_total: result.pages_total,
        });
    }
    let records = serde_json::from_str::<Vec<RfiTariffRecord>>(&json_str)
        .map_err(|e| format!("RFI parser returned invalid JSON: {e}"))?;
    Ok(ParsedRfiImport {
        records,
        ..ParsedRfiImport::default()
    })
}

fn run_bundled_rfi_parser_direct(
    path: &std::path::Path,
    resource_dir: Option<&std::path::Path>,
) -> Result<std::process::Output, String> {
    let Some(resource_dir) = resource_dir else {
        return Err("resource directory unavailable".into());
    };

    for parser_exe in parser_executable_candidates(resource_dir) {
        if parser_exe.is_file() {
            return run_parser_command(Command::new(parser_exe).arg(path));
        }
    }

    let parser_script = resource_dir.join("parser").join("rfi_tariffa_parser.py");
    let python_exe = resource_dir.join("python").join(if cfg!(windows) {
        "python.exe"
    } else {
        "bin/python3"
    });
    if python_exe.is_file() && parser_script.is_file() {
        return run_parser_command(Command::new(python_exe).arg(&parser_script).arg(path));
    }

    Err(format!(
        "Bundled parser not found under {}",
        resource_dir.display()
    ))
}

pub fn import_tariff_pdf_preview_batch(
    paths: &[String],
    app: &AppHandle,
    max_concurrent: Option<usize>,
) -> Result<Vec<TariffPdfImportPreview>, Vec<(String, String)>> {
    let max = max_concurrent
        .unwrap_or_else(|| {
            std::thread::available_parallelism()
                .map(|n| n.get())
                .unwrap_or(4)
        })
        .max(1);

    let resource_dir = app.path().resource_dir().ok();
    let mut results: Vec<Option<Result<TariffPdfImportPreview, (String, String)>>> =
        vec![None; paths.len()];

    for chunk_start in (0..paths.len()).step_by(max) {
        let chunk_end = (chunk_start + max).min(paths.len());
        let mut handles = Vec::with_capacity(chunk_end - chunk_start);

        for i in chunk_start..chunk_end {
            let path_buf = std::path::PathBuf::from(&paths[i]);
            let rd = resource_dir.clone();

            handles.push(std::thread::spawn(move || {
                let result = import_single_tariff_pdf(&path_buf, rd.as_deref());
                (i, result)
            }));
        }

        for handle in handles {
            match handle.join() {
                Ok((idx, Ok(preview))) => results[idx] = Some(Ok(preview)),
                Ok((idx, Err(msg))) => results[idx] = Some(Err((paths[idx].clone(), msg))),
                Err(_) => {}
            }
        }
    }

    let mut successes = Vec::with_capacity(paths.len());
    let mut errors: Vec<(String, String)> = Vec::new();
    for result in results.into_iter().flatten() {
        match result {
            Ok(preview) => successes.push(preview),
            Err((path, msg)) => errors.push((path, msg)),
        }
    }

    if successes.is_empty() && !errors.is_empty() {
        return Err(errors);
    }

    Ok(successes)
}

fn parse_rfi_json_file(path: &Path) -> Result<ParsedRfiImport, AppError> {
    let bytes = std::fs::read(path).map_err(|error| AppError::Database(error.to_string()))?;
    let parser_json = String::from_utf8_lossy(&bytes);
    let parser_json = remove_json_surrogate_escapes(&parser_json);

    if let Ok(output) = serde_json::from_str::<ParserOutput>(&parser_json) {
        let mut all_records = output.records;
        all_records.extend(output.maggiorazioni);
        resolve_rfi_warnings(&mut all_records, &output.warnings);
        return Ok(ParsedRfiImport {
            records: all_records,
            warnings: output.warnings,
            maggiorazione_rules: output.maggiorazione_rules,
            validation_report: output.validation_report,
            pages_total: output.pages_total,
        });
    }
    serde_json::from_str::<Vec<RfiTariffRecord>>(&parser_json)
        .map(|records| ParsedRfiImport {
            records,
            ..ParsedRfiImport::default()
        })
        .map_err(|error| {
            AppError::Validation(format!(
                "parser JSON is not a valid RFI tariff export: {error}"
            ))
        })
}

fn merge_duplicate_rfi_records(records: Vec<RfiTariffRecord>) -> Vec<RfiTariffRecord> {
    let mut merged: Vec<RfiTariffRecord> = Vec::with_capacity(records.len());
    let mut index: HashMap<String, usize> = HashMap::with_capacity(records.len());

    for record in records {
        let code = record.codice.trim();
        if code.is_empty() {
            merged.push(record);
            continue;
        }

        let lookup = code.to_ascii_lowercase();
        if let Some(&pos) = index.get(&lookup) {
            merge_rfi_record_description(&mut merged[pos], &record);
            continue;
        }

        index.insert(lookup, merged.len());
        merged.push(record);
    }

    merged
}

fn merge_rfi_record_description(target: &mut RfiTariffRecord, duplicate: &RfiTariffRecord) {
    let duplicate_description = clean_import_description(&duplicate.descrizione);
    if duplicate_description.is_empty() {
        return;
    }

    let current_description = clean_import_description(&target.descrizione);
    if current_description
        .to_ascii_lowercase()
        .contains(&duplicate_description.to_ascii_lowercase())
    {
        return;
    }

    target.descrizione = if current_description.is_empty() {
        duplicate_description
    } else {
        format!("{current_description}\n{duplicate_description}")
    };
}

fn resolve_rfi_warnings(records: &mut Vec<RfiTariffRecord>, top_warnings: &[TariffWarning]) {
    if top_warnings.is_empty() {
        return;
    }
    let map: HashMap<String, &TariffWarning> =
        top_warnings.iter().map(|w| (w.id.clone(), w)).collect();
    for rec in records.iter_mut() {
        if rec.warnings.is_empty() && !rec.warning_ids.is_empty() {
            rec.warnings = rec
                .warning_ids
                .iter()
                .filter_map(|id| map.get(id).cloned().cloned())
                .collect();
        }
    }
}

fn clean_import_description(value: &str) -> String {
    let cleaned = clean_text(value);
    let upper = cleaned.to_ascii_uppercase();
    let markers = [
        " TARIFFA ",
        " CATEGORIA ",
        " GRUPPO ",
        " AVVERTENZE",
        " AVVERTENZA",
    ];

    markers
        .iter()
        .filter_map(|marker| upper.find(marker))
        .min()
        .map(|index| cleaned[..index].trim().to_string())
        .unwrap_or(cleaned)
}

fn parse_rfi_pdf_with_python(
    path: &Path,
    app: Option<&AppHandle>,
) -> Result<ParsedRfiImport, AppError> {
    let mut header = [0_u8; 5];
    File::open(path)
        .and_then(|mut file| file.read_exact(&mut header))
        .map_err(|error| AppError::Database(error.to_string()))?;
    if header != *b"%PDF-" {
        return Err(AppError::Validation(
            "selected file is not a valid PDF".into(),
        ));
    }

    // Try persistent parser first (keeps Python alive between calls — faster on macOS)
    if let Some(app) = app
        && let Ok(resource_dir) = app.path().resource_dir()
        && let Ok(result) = parse_via_persistent_parser(path, &resource_dir)
    {
        return Ok(result);
    }

    // Fallback to one-shot subprocess
    let output = run_bundled_rfi_parser(path, app).map_err(|error| {
        AppError::Validation(format!("Parser PDF non incluso in questa build. {error}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::Validation(format!(
            "RFI PDF parser failed. Verify that the bundled parser includes a supported PDF engine. {stderr}"
        )));
    }

    let parser_json = parser_output_to_utf8(output.stdout)?;
    let parser_json = remove_json_surrogate_escapes(&parser_json);

    if let Ok(result) = serde_json::from_str::<ParserOutput>(&parser_json) {
        let mut all_records = result.records;
        all_records.extend(result.maggiorazioni);
        resolve_rfi_warnings(&mut all_records, &result.warnings);
        return Ok(ParsedRfiImport {
            records: all_records,
            warnings: result.warnings,
            maggiorazione_rules: result.maggiorazione_rules,
            validation_report: result.validation_report,
            pages_total: result.pages_total,
        });
    }
    let records = serde_json::from_str::<Vec<RfiTariffRecord>>(&parser_json).map_err(|error| {
        AppError::Validation(format!("RFI parser returned invalid JSON: {error}"))
    })?;
    Ok(ParsedRfiImport {
        records,
        ..ParsedRfiImport::default()
    })
}

fn parser_output_to_utf8(output: Vec<u8>) -> Result<String, AppError> {
    String::from_utf8(output)
        .or_else(|error| decode_windows_1252(error.into_bytes()))
        .map_err(|error| AppError::Validation(format!("Output parser non UTF-8 valido: {error}")))
}

fn decode_windows_1252(bytes: Vec<u8>) -> Result<String, std::str::Utf8Error> {
    let mut output = String::with_capacity(bytes.len());

    for byte in bytes {
        match byte {
            0x00..=0x7f => output.push(byte as char),
            0x80 => output.push('€'),
            0x82 => output.push('‚'),
            0x83 => output.push('ƒ'),
            0x84 => output.push('„'),
            0x85 => output.push('…'),
            0x86 => output.push('†'),
            0x87 => output.push('‡'),
            0x88 => output.push('ˆ'),
            0x89 => output.push('‰'),
            0x8a => output.push('Š'),
            0x8b => output.push('‹'),
            0x8c => output.push('Œ'),
            0x8e => output.push('Ž'),
            0x91 => output.push('‘'),
            0x92 => output.push('’'),
            0x93 => output.push('“'),
            0x94 => output.push('”'),
            0x95 => output.push('•'),
            0x96 => output.push('–'),
            0x97 => output.push('—'),
            0x98 => output.push('˜'),
            0x99 => output.push('™'),
            0x9a => output.push('š'),
            0x9b => output.push('›'),
            0x9c => output.push('œ'),
            0x9e => output.push('ž'),
            0x9f => output.push('Ÿ'),
            0x81 | 0x8d | 0x8f | 0x90 | 0x9d => {
                return Err(std::str::from_utf8(&[byte]).unwrap_err());
            }
            _ => output.push(char::from_u32(byte as u32).unwrap_or_default()),
        }
    }

    Ok(output)
}

fn remove_json_surrogate_escapes(value: &str) -> String {
    let mut cleaned = String::with_capacity(value.len());
    let mut chars = value.chars().peekable();

    while let Some(current) = chars.next() {
        if current == '\\' && matches!(chars.peek(), Some('u')) {
            let mut escape = String::from("\\");
            escape.push(chars.next().unwrap_or_default());

            for _ in 0..4 {
                if let Some(hex) = chars.peek().copied() {
                    if hex.is_ascii_hexdigit() {
                        escape.push(chars.next().unwrap_or_default());
                    } else {
                        break;
                    }
                }
            }

            if is_json_surrogate_escape(&escape) {
                continue;
            }

            cleaned.push_str(&escape);
            continue;
        }

        cleaned.push(current);
    }

    cleaned
}

fn is_json_surrogate_escape(value: &str) -> bool {
    if value.len() != 6 || !value.starts_with("\\u") {
        return false;
    }

    u32::from_str_radix(&value[2..], 16)
        .map(|code| (0xD800..=0xDFFF).contains(&code))
        .unwrap_or(false)
}

/// Persistent RFI parser process client.
/// Keeps a Python/PyInstaller subprocess alive across multiple PDF parses,
/// avoiding subprocess startup overhead on macOS.
struct RfiParserClient {
    stdin: BufWriter<ChildStdin>,
    stdout: BufReader<ChildStdout>,
    child: Child,
}

impl RfiParserClient {
    fn start(resource_dir: &Path) -> Result<Self, String> {
        let candidates = parser_executable_candidates(resource_dir);

        for exe in &candidates {
            if exe.is_file() {
                return Self::build_command(&mut Command::new(exe));
            }
        }

        let python_exe = resource_dir.join("python").join(if cfg!(windows) {
            "python.exe"
        } else {
            "bin/python3"
        });
        let script = resource_dir.join("parser").join("rfi_tariffa_parser.py");
        if python_exe.is_file() && script.is_file() {
            return Self::build_command(Command::new(python_exe).arg(&script));
        }

        Err("Bundled parser not found".into())
    }

    fn build_command(command: &mut Command) -> Result<Self, String> {
        command.arg("--serve");
        #[cfg(windows)]
        command.creation_flags(0x08000000);

        let mut child = command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        let stdin = BufWriter::new(child.stdin.take().ok_or("stdin not available")?);
        let stdout = BufReader::new(child.stdout.take().ok_or("stdout not available")?);

        Ok(Self {
            stdin,
            stdout,
            child,
        })
    }

    fn parse(&mut self, path: &Path) -> Result<ParserOutput, String> {
        writeln!(self.stdin, "{}", path.display()).map_err(|e| e.to_string())?;
        self.stdin.flush().map_err(|e| e.to_string())?;

        let mut line = String::new();
        self.stdout
            .read_line(&mut line)
            .map_err(|e| e.to_string())?;
        let trimmed = line.trim();

        if trimmed.is_empty() {
            return Err("Parser process ended unexpectedly".into());
        }

        serde_json::from_str::<ParserOutput>(trimmed)
            .map_err(|e| format!("Invalid JSON from parser: {e}"))
    }
}

impl Drop for RfiParserClient {
    fn drop(&mut self) {
        let _ = self.stdin.flush();
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

/// Global persistent parser state.
/// `OnceLock<Mutex<Option<RfiParserClient>>>` allows lazy init and process restart on crash.
fn rfi_parser_state() -> &'static Mutex<Option<RfiParserClient>> {
    static STATE: OnceLock<Mutex<Option<RfiParserClient>>> = OnceLock::new();
    STATE.get_or_init(|| Mutex::new(None))
}

/// Explicitly terminate the parser subprocess on app shutdown.
pub fn shutdown_rfi_parser() {
    let state = rfi_parser_state();
    if let Ok(mut guard) = state.lock() {
        *guard = None;
    }
}

fn parse_via_persistent_parser(
    path: &Path,
    resource_dir: &Path,
) -> Result<ParsedRfiImport, String> {
    let state = rfi_parser_state();
    let mut guard = state.lock().map_err(|e| e.to_string())?;

    restart_persistent_parser_if_binary_changed(resource_dir, &mut guard)?;

    if guard.is_none() {
        *guard = Some(RfiParserClient::start(resource_dir)?);
    }

    let client = guard.as_mut().unwrap();
    let result = client.parse(path);

    match result {
        Ok(output) => {
            let mut all_records = output.records;
            all_records.extend(output.maggiorazioni);
            resolve_rfi_warnings(&mut all_records, &output.warnings);
            Ok(ParsedRfiImport {
                records: all_records,
                warnings: output.warnings,
                maggiorazione_rules: output.maggiorazione_rules,
                validation_report: output.validation_report,
                pages_total: output.pages_total,
            })
        }
        Err(e) => {
            // Process died — drop it so next call restarts
            drop(guard.take());
            Err(e)
        }
    }
}

fn run_bundled_rfi_parser(
    path: &Path,
    app: Option<&AppHandle>,
) -> Result<std::process::Output, String> {
    let Some(app) = app else {
        return Err("app handle unavailable".into());
    };
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?;

    for parser_executable in parser_executable_candidates(&resource_dir) {
        if parser_executable.is_file() {
            return run_parser_command(Command::new(parser_executable).arg(path));
        }
    }

    let parser_script = resource_dir.join("parser").join("rfi_tariffa_parser.py");
    let python_exe = resource_dir.join("python").join(if cfg!(windows) {
        "python.exe"
    } else {
        "bin/python3"
    });
    if python_exe.is_file() && parser_script.is_file() {
        return run_parser_command(Command::new(python_exe).arg(parser_script).arg(path));
    }

    Err(format!(
        "Bundled parser not found under {}",
        resource_dir.display()
    ))
}

fn run_parser_command(command: &mut Command) -> Result<std::process::Output, String> {
    #[cfg(windows)]
    command.creation_flags(0x08000000);

    command.output().map_err(|error| error.to_string())
}

fn parser_executable_candidates(resource_dir: &Path) -> Vec<PathBuf> {
    let executable_name = if cfg!(windows) {
        "rfi_tariffa_parser.exe"
    } else {
        "rfi_tariffa_parser"
    };

    let mut candidates = Vec::new();

    // In dev prefer the source-tree binary rebuilt via `npm run parser:bundle`.
    #[cfg(debug_assertions)]
    {
        candidates.push(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("resources")
                .join("parser")
                .join(executable_name),
        );
    }

    candidates.push(resource_dir.join("parser").join(executable_name));
    candidates.push(
        resource_dir
            .join("resources")
            .join("parser")
            .join(executable_name),
    );

    candidates
}

fn parser_binary_mtime(resource_dir: &Path) -> Option<SystemTime> {
    parser_executable_candidates(resource_dir)
        .into_iter()
        .find(|path| path.is_file())
        .and_then(|path| std::fs::metadata(path).ok()?.modified().ok())
}

fn restart_persistent_parser_if_binary_changed(
    resource_dir: &Path,
    guard: &mut Option<RfiParserClient>,
) -> Result<(), String> {
    let Some(mtime) = parser_binary_mtime(resource_dir) else {
        return Ok(());
    };

    static LAST_BINARY_MTIME: OnceLock<Mutex<Option<SystemTime>>> = OnceLock::new();
    let slot = LAST_BINARY_MTIME.get_or_init(|| Mutex::new(None));
    let mut last = slot.lock().map_err(|error| error.to_string())?;

    if let Some(previous) = *last {
        if previous != mtime {
            drop(guard.take());
        }
    }

    *last = Some(mtime);
    Ok(())
}

fn rfi_record_to_tariff_voice(
    record: &RfiTariffRecord,
    tariff_book_id: &str,
) -> Option<TariffVoiceRecord> {
    let unit_price = record.valore_euro?;
    if !unit_price.is_finite() || record.codice.trim().is_empty() {
        return None;
    }

    let voice_label = clean_text(&record.voce_desc);
    let mut category = format!(
        "{}.{}.{} - VOCE {}.{}",
        record.tariffa.trim(),
        record.categoria.trim(),
        record.gruppo.trim(),
        record.voce.trim(),
        record.sottovoce.trim()
    );
    if !voice_label.is_empty() {
        category.push_str(" - ");
        category.push_str(&voice_label);
    }
    if !record.tipo_valore.trim().is_empty() {
        category.push_str(" | ");
        category.push_str(record.tipo_valore.trim());
    }
    let unit = if record.unita_codice.trim().is_empty() {
        record.unita_label.trim()
    } else {
        record.unita_codice.trim()
    };

    let mut description = clean_import_description(&record.descrizione);
    if description.is_empty() {
        let unit_code = record.unita_codice.trim();
        let unit_label = record.unita_label.trim();
        let fallback = if !unit_label.is_empty() {
            unit_label
        } else {
            unit_code
        };
        if fallback.chars().any(|ch| ch.is_ascii_digit()) && fallback.len() >= 2 {
            description = clean_import_description(fallback);
        }
    }

    Some(TariffVoiceRecord {
        category,
        description,
        id: format!(
            "voice_{}_{}",
            tariff_book_id,
            sanitize_identifier(&record.codice)
        ),
        labor_percentage: record.perc_manodopera.filter(|value| value.is_finite()),
        official_code: record.codice.trim().to_string(),
        tariff_book_id: tariff_book_id.to_string(),
        unit_of_measure: unit.to_string(),
        unit_price,
        categoria_desc: record.categoria_desc.clone(),
        gruppo_desc: record.gruppo_desc.clone(),
        voce: record.voce.clone(),
        voce_desc: record.voce_desc.clone(),
        warnings: record.warnings.clone(),
        is_maggiorazione: record.categoria == "MG",
        source: record.source.clone(),
        confidence: record.confidence,
        issues: record.issues.clone(),
        review_flags: record.review_flags.clone(),
        warning_ids: record.warning_ids.clone(),
        linked_maggiorazioni: record.linked_maggiorazioni.clone(),
        applicability_rules: record.applicability_rules.clone(),
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
    let linked_maggiorazioni_json = if voice.linked_maggiorazioni.is_empty() {
        None
    } else {
        Some(
            serde_json::to_string(&voice.linked_maggiorazioni)
                .map_err(|error| AppError::Validation(error.to_string()))?,
        )
    };
    let applicability_rules_json = voice
        .applicability_rules
        .as_ref()
        .map(serde_json::to_string)
        .transpose()
        .map_err(|error| AppError::Validation(error.to_string()))?;

    connection
        .execute(
            "INSERT OR REPLACE INTO tariff_voices (
                id,
                tariff_book_id,
                official_code,
                description,
                category,
                unit_of_measure,
                labor_percentage,
                unit_price_cents,
                linked_maggiorazioni,
                applicability_rules
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                voice.id,
                tariff_book_id,
                voice.official_code,
                voice.description,
                voice.category,
                voice.unit_of_measure,
                voice.labor_percentage,
                money_to_cents(voice.unit_price),
                linked_maggiorazioni_json,
                applicability_rules_json
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
    let linked_maggiorazioni_json: Option<String> = row.get(8)?;
    let applicability_rules_json: Option<String> = row.get(9)?;

    Ok(TariffVoiceRecord {
        id: row.get(0)?,
        tariff_book_id: row.get(1)?,
        official_code: row.get(2)?,
        description: row.get(3)?,
        category: row.get(4)?,
        unit_of_measure: row.get(5)?,
        unit_price: cents_to_money(amount_cents),
        labor_percentage: row.get(7)?,
        categoria_desc: String::new(),
        gruppo_desc: String::new(),
        voce: String::new(),
        voce_desc: String::new(),
        warnings: Vec::new(),
        is_maggiorazione: false,
        source: None,
        confidence: None,
        issues: Vec::new(),
        review_flags: Vec::new(),
        warning_ids: Vec::new(),
        linked_maggiorazioni: linked_maggiorazioni_json
            .and_then(|value| serde_json::from_str(&value).ok())
            .unwrap_or_default(),
        applicability_rules: applicability_rules_json
            .and_then(|value| serde_json::from_str(&value).ok()),
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

fn infer_year(value: &str) -> Option<i32> {
    value
        .split(|character: char| !character.is_ascii_digit())
        .filter_map(|part| part.parse::<i32>().ok())
        .find(|year| (1900..=2200).contains(year))
}

fn infer_source_name(value: &str) -> String {
    let lower_value = value.to_lowercase();

    if lower_value.contains("ac.") || lower_value.contains("acc") || lower_value.contains("rfi") {
        return "RFI".into();
    }

    if lower_value.contains("lombardia") {
        return "Regione Lombardia".into();
    }

    if lower_value.contains("piemonte") {
        return "Regione Piemonte".into();
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

fn clean_text(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use rusqlite::Connection;

    use crate::db::migrations::apply_migrations;

    use super::{
        CreateTariffBookRequest, TariffVoiceRecord, UpdateTariffBookRequest, create_tariff_book,
        import_tariff_pdf_preview, list_tariff_books, list_tariff_voices, parser_output_to_utf8,
        remove_json_surrogate_escapes, update_tariff_book,
    };

    #[test]
    fn creates_and_lists_tariff_books() {
        let mut connection = Connection::open_in_memory().expect("in-memory db");
        apply_migrations(&connection).expect("schema applied");

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
                    labor_percentage: Some(12.5),
                    official_code: "03.C01.C10.035".into(),
                    tariff_book_id: "tariff_lombardia_2025".into(),
                    unit_of_measure: "m".into(),
                    unit_price: 1250.0,
                    categoria_desc: String::new(),
                    gruppo_desc: String::new(),
                    voce: String::new(),
                    voce_desc: String::new(),
                    warnings: Vec::new(),
                    is_maggiorazione: false,
                    source: None,
                    confidence: None,
                    issues: Vec::new(),
                    review_flags: Vec::new(),
                    warning_ids: Vec::new(),
                    linked_maggiorazioni: Vec::new(),
                    applicability_rules: None,
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
        assert_eq!(voices[0].labor_percentage, Some(12.5));
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
    fn reimport_replaces_existing_tariff_voices() {
        let mut connection = Connection::open_in_memory().expect("in-memory db");
        apply_migrations(&connection).expect("schema applied");
        let mut request = CreateTariffBookRequest {
            id: "tariff_rfi_2025".into(),
            name: "RFI 2025".into(),
            source_name: "RFI".into(),
            status: "active".into(),
            voices: vec![TariffVoiceRecord {
                category: "AC.PC.B - VOCE 3101.A - Unit� di Backup".into(),
                description: "Fornitura Unit� di Backup".into(),
                id: "voice_tariff_rfi_2025_ac_pc_b_3101_a".into(),
                labor_percentage: Some(100.0),
                official_code: "AC.PC.B.3101.A".into(),
                tariff_book_id: "tariff_rfi_2025".into(),
                unit_of_measure: "CAD".into(),
                unit_price: 100.0,
                categoria_desc: String::new(),
                gruppo_desc: String::new(),
                voce: String::new(),
                voce_desc: String::new(),
                warnings: Vec::new(),
                is_maggiorazione: false,
                source: None,
                confidence: None,
                issues: Vec::new(),
                review_flags: Vec::new(),
                warning_ids: Vec::new(),
                linked_maggiorazioni: Vec::new(),
                applicability_rules: None,
            }],
            year: 2025,
        };

        create_tariff_book(&mut connection, request.clone()).expect("initial import");
        request.voices = vec![TariffVoiceRecord {
            category: "AC.PC.B - VOCE 3101.A - Unità di Backup".into(),
            description: "Fornitura Unità di Backup".into(),
            id: "voice_tariff_rfi_2025_ac_pc_b_3101_a".into(),
            labor_percentage: Some(100.0),
            official_code: "AC.PC.B.3101.A".into(),
            tariff_book_id: "tariff_rfi_2025".into(),
            unit_of_measure: "CAD".into(),
            unit_price: 120.0,
            categoria_desc: String::new(),
            gruppo_desc: String::new(),
            voce: String::new(),
            voce_desc: String::new(),
            warnings: Vec::new(),
            is_maggiorazione: false,
            source: None,
            confidence: None,
            issues: Vec::new(),
            review_flags: Vec::new(),
            warning_ids: Vec::new(),
            linked_maggiorazioni: Vec::new(),
            applicability_rules: None,
        }];

        create_tariff_book(&mut connection, request).expect("reimport replaces voices");

        let voices = list_tariff_voices(&connection, "tariff_rfi_2025").expect("voices listed");
        assert_eq!(voices.len(), 1);
        assert_eq!(voices[0].description, "Fornitura Unità di Backup");
        assert_eq!(voices[0].unit_price, 120.0);
        assert!(!voices[0].description.contains('\u{fffd}'));
        assert!(!voices[0].category.contains('\u{fffd}'));
    }

    #[test]
    fn update_tariff_book_replaces_existing_tariff_voices() {
        let mut connection = Connection::open_in_memory().expect("in-memory db");
        apply_migrations(&connection).expect("schema applied");
        let book_id = "tariff_rfi_2026";

        create_tariff_book(
            &mut connection,
            CreateTariffBookRequest {
                id: book_id.into(),
                name: "RFI 2026".into(),
                source_name: "RFI".into(),
                status: "active".into(),
                voices: vec![TariffVoiceRecord {
                    category: "AC.PC.B - VOCE 3101.A".into(),
                    description: "Descrizione iniziale".into(),
                    id: "voice_initial".into(),
                    labor_percentage: Some(100.0),
                    official_code: "AC.PC.B.3101.A".into(),
                    tariff_book_id: book_id.into(),
                    unit_of_measure: "CAD".into(),
                    unit_price: 100.0,
                    categoria_desc: String::new(),
                    gruppo_desc: String::new(),
                    voce: String::new(),
                    voce_desc: String::new(),
                    warnings: Vec::new(),
                    is_maggiorazione: false,
                    source: None,
                    confidence: None,
                    issues: Vec::new(),
                    review_flags: Vec::new(),
                    warning_ids: Vec::new(),
                    linked_maggiorazioni: Vec::new(),
                    applicability_rules: None,
                }],
                year: 2026,
            },
        )
        .expect("initial tariff book created");

        update_tariff_book(
            &mut connection,
            book_id,
            UpdateTariffBookRequest {
                name: "RFI 2026 modificato".into(),
                source_name: "RFI aggiornato".into(),
                status: "validated".into(),
                voices: vec![TariffVoiceRecord {
                    category: "AC.PC.B - VOCE 3101.A".into(),
                    description: "Descrizione modificata".into(),
                    id: "voice_updated".into(),
                    labor_percentage: Some(55.0),
                    official_code: "AC.PC.B.3101.B".into(),
                    tariff_book_id: book_id.into(),
                    unit_of_measure: "M".into(),
                    unit_price: 245.75,
                    categoria_desc: String::new(),
                    gruppo_desc: String::new(),
                    voce: String::new(),
                    voce_desc: String::new(),
                    warnings: Vec::new(),
                    is_maggiorazione: false,
                    source: None,
                    confidence: None,
                    issues: Vec::new(),
                    review_flags: Vec::new(),
                    warning_ids: Vec::new(),
                    linked_maggiorazioni: Vec::new(),
                    applicability_rules: None,
                }],
                year: 2026,
            },
        )
        .expect("tariff book updated with edited voices");

        let books = list_tariff_books(&connection).expect("tariff books listed");
        assert_eq!(books[0].name, "RFI 2026 modificato");
        assert_eq!(books[0].source_name, "RFI aggiornato");
        assert_eq!(books[0].status, "validated");

        let voices = list_tariff_voices(&connection, book_id).expect("voices listed");
        assert_eq!(voices.len(), 1);
        assert_eq!(voices[0].id, "voice_updated");
        assert_eq!(voices[0].description, "Descrizione modificata");
        assert_eq!(voices[0].official_code, "AC.PC.B.3101.B");
        assert_eq!(voices[0].unit_of_measure, "M");
        assert_eq!(voices[0].unit_price, 245.75);
        assert_eq!(voices[0].labor_percentage, Some(55.0));
    }

    #[test]
    fn imports_rfi_parser_json_export() {
        let path = std::env::temp_dir().join("quantara_rfi_tariff_test_2025.json");
        std::fs::write(
            &path,
            r#"[{
                "codice":"AC.IR.A.2001.A",
                "tariffa":"AC",
                "categoria":"IR",
                "gruppo":"A",
                "voce":"2001",
                "voce_desc":"Fornitura ISA Report ACC/ACCM/PPACC/PPACEI per Safety Assessment di Applicazione Generica e 1^ Applicazione Specifica.",
                "sottovoce":"A",
                "descrizione":"Fornitura ISA REPORT per Applicazione Generica e ISA REPORT per 1^ Applicazione Specifica per ACC/ACCM/PPACC/PPACEI di SIZE 1",
                "unita_codice":"CAD",
                "unita_label":"Cadauna",
                "tipo_valore":"EURO",
                "valore_euro":20337.48,
                "perc_manodopera":100.0
            }]"#,
        )
        .expect("write test json");

        let preview = import_tariff_pdf_preview(&path, None).expect("rfi parser json preview");

        assert_eq!(preview.source_name, "RFI");
        assert_eq!(preview.year, 2025);
        assert_eq!(preview.voices.len(), 1);
        assert_eq!(preview.voices[0].official_code, "AC.IR.A.2001.A");
        assert_eq!(preview.voices[0].unit_of_measure, "CAD");
        assert_eq!(preview.voices[0].unit_price, 20337.48);
        assert_eq!(preview.voices[0].labor_percentage, Some(100.0));
        assert!(preview.voices[0].category.contains("VOCE 2001"));
        assert!(!preview.voices[0].category.contains("Manodopera"));
    }

    #[test]
    fn imports_rfi_parser_object_json_export() {
        let path = std::env::temp_dir().join("quantara_rfi_tariff_test_obj.json");
        std::fs::write(
            &path,
            r#"{"records":[{
                "codice":"AC.IR.A.2001.A",
                "tariffa":"AC",
                "categoria":"IR",
                "gruppo":"A",
                "voce":"2001",
                "voce_desc":"Fornitura ISA Report",
                "sottovoce":"A",
                "descrizione":"Fornitura ISA REPORT per SIZE 1",
                "unita_codice":"CAD",
                "unita_label":"Cadauna",
                "tipo_valore":"EURO",
                "valore_euro":20337.48,
                "perc_manodopera":100.0
            }],"pages_total":48}"#,
        )
        .expect("write test json");

        let preview = import_tariff_pdf_preview(&path, None).expect("rfi parser object json");

        assert_eq!(preview.voices.len(), 1);
        assert_eq!(preview.voices[0].official_code, "AC.IR.A.2001.A");
        assert_eq!(preview.voices[0].unit_price, 20337.48);
        assert_eq!(preview.pages_total, 48);
    }

    #[test]
    fn removes_invalid_json_surrogate_escapes_from_parser_output() {
        let broken = r#"[{"descrizione":"Seduta operativa \udce0 con testo valido"}]"#;
        let cleaned = remove_json_surrogate_escapes(broken);

        assert_eq!(
            cleaned,
            r#"[{"descrizione":"Seduta operativa  con testo valido"}]"#
        );
        assert!(serde_json::from_str::<serde_json::Value>(&cleaned).is_ok());
    }

    #[test]
    fn rejects_invalid_utf8_parser_output() {
        let result = parser_output_to_utf8(vec![0x81]);

        assert!(result.is_err());
        assert!(format!("{}", result.unwrap_err()).contains("Output parser non UTF-8 valido"));
    }

    #[test]
    fn decodes_windows_1252_parser_output() {
        let output = parser_output_to_utf8(br#"[{"descrizione":"Unit"#.iter().copied().chain([0xe0]).chain(br#" di Backup"}]"#.iter().copied()).collect())
            .expect("windows-1252 parser output decoded");

        assert_eq!(output, r#"[{"descrizione":"Unità di Backup"}]"#);
    }
}
