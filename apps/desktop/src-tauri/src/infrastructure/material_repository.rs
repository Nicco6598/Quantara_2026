use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::models::app_error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialRecord {
    pub id: String,
    pub code: String,
    pub description: String,
    pub category: String,
    pub unit: String,
    pub quantity: f64,
    pub min_quantity: f64,
    pub notes: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMaterialRequest {
    pub id: String,
    pub code: String,
    pub description: String,
    pub category: String,
    pub unit: String,
    pub quantity: f64,
    pub min_quantity: f64,
    pub notes: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMaterialRequest {
    pub code: String,
    pub description: String,
    pub category: String,
    pub unit: String,
    pub min_quantity: f64,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterialTransactionRecord {
    pub id: String,
    pub material_id: String,
    pub quantity_change: f64,
    pub quantity_after: f64,
    pub transaction_type: String,
    pub reference_id: Option<String>,
    pub description: String,
    pub created_at: String,
}

pub fn list_materials(connection: &Connection) -> Result<Vec<MaterialRecord>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, code, description, category, unit, quantity, min_quantity, notes
             FROM materials ORDER BY category, code",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let records = statement
        .query_map([], |row| {
            Ok(MaterialRecord {
                id: row.get(0)?,
                code: row.get(1)?,
                description: row.get(2)?,
                category: row.get(3)?,
                unit: row.get(4)?,
                quantity: row.get(5)?,
                min_quantity: row.get(6)?,
                notes: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(records)
}

pub fn create_material(
    connection: &mut Connection,
    request: CreateMaterialRequest,
) -> Result<MaterialRecord, AppError> {
    let tx = connection
        .transaction()
        .map_err(|e| AppError::Database(e.to_string()))?;

    tx.execute(
        "INSERT INTO materials (id, code, description, category, unit, quantity, min_quantity, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            request.id,
            request.code,
            request.description,
            request.category,
            request.unit,
            request.quantity,
            request.min_quantity,
            request.notes,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    if request.quantity > 0.0 {
        let tx_id = format!("tx_init_{}", request.id);
        tx.execute(
            "INSERT INTO material_transactions (id, material_id, quantity_change, quantity_after, transaction_type, description)
             VALUES (?1, ?2, ?3, ?4, 'incoming', 'Carico iniziale')",
            rusqlite::params![tx_id, request.id, request.quantity, request.quantity],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    }

    tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

    Ok(MaterialRecord {
        id: request.id,
        code: request.code,
        description: request.description,
        category: request.category,
        unit: request.unit,
        quantity: request.quantity,
        min_quantity: request.min_quantity,
        notes: request.notes,
    })
}

pub fn update_material(
    connection: &mut Connection,
    material_id: &str,
    request: UpdateMaterialRequest,
) -> Result<MaterialRecord, AppError> {
    let tx = connection
        .transaction()
        .map_err(|e| AppError::Database(e.to_string()))?;

    tx.execute(
        "UPDATE materials SET code = ?1, description = ?2, category = ?3, unit = ?4,
         min_quantity = ?5, notes = ?6, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?7",
        rusqlite::params![
            request.code,
            request.description,
            request.category,
            request.unit,
            request.min_quantity,
            request.notes,
            material_id,
        ],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

    get_material(connection, material_id)?.ok_or(AppError::Database(
        "Materiale non trovato dopo aggiornamento".to_string(),
    ))
}

pub fn get_material(
    connection: &Connection,
    material_id: &str,
) -> Result<Option<MaterialRecord>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, code, description, category, unit, quantity, min_quantity, notes
             FROM materials WHERE id = ?1",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let record = statement
        .query_row(rusqlite::params![material_id], |row| {
            Ok(MaterialRecord {
                id: row.get(0)?,
                code: row.get(1)?,
                description: row.get(2)?,
                category: row.get(3)?,
                unit: row.get(4)?,
                quantity: row.get(5)?,
                min_quantity: row.get(6)?,
                notes: row.get(7)?,
            })
        })
        .optional()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(record)
}

pub fn delete_material(connection: &mut Connection, material_id: &str) -> Result<(), AppError> {
    let tx = connection
        .transaction()
        .map_err(|e| AppError::Database(e.to_string()))?;

    tx.execute(
        "DELETE FROM material_transactions WHERE material_id = ?1",
        rusqlite::params![material_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    tx.execute(
        "DELETE FROM materials WHERE id = ?1",
        rusqlite::params![material_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

    Ok(())
}

pub fn adjust_material_stock(
    connection: &mut Connection,
    material_id: &str,
    new_quantity: f64,
    description: &str,
) -> Result<MaterialRecord, AppError> {
    let material = get_material(connection, material_id)?
        .ok_or(AppError::Database("Materiale non trovato".to_string()))?;

    let quantity_change = new_quantity - material.quantity;

    let tx = connection
        .transaction()
        .map_err(|e| AppError::Database(e.to_string()))?;

    tx.execute(
        "UPDATE materials SET quantity = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![new_quantity, material_id],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    use std::time::{SystemTime, UNIX_EPOCH};
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let tx_id = format!("adj_{}_{}", material_id, ts);
    tx.execute(
        "INSERT INTO material_transactions (id, material_id, quantity_change, quantity_after, transaction_type, description)
         VALUES (?1, ?2, ?3, ?4, 'adjustment', ?5)",
        rusqlite::params![tx_id, material_id, quantity_change, new_quantity, description],
    )
    .map_err(|e| AppError::Database(e.to_string()))?;

    tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

    get_material(connection, material_id)?.ok_or(AppError::Database(
        "Materiale non trovato dopo rettifica".to_string(),
    ))
}

pub fn deduct_materials(
    connection: &mut Connection,
    deductions: &[(String, f64, String)], // (material_id, quantity, reference_id)
) -> Result<Vec<MaterialRecord>, AppError> {
    let tx = connection
        .transaction()
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut updated = Vec::new();

    use std::time::{SystemTime, UNIX_EPOCH};
    let base_ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let mut counter: u64 = 0;

    for (material_id, quantity, reference_id) in deductions {
        let material = get_material(&tx, material_id)?.ok_or(AppError::Database(format!(
            "Materiale non trovato: {}",
            material_id
        )))?;

        let new_quantity = (material.quantity - quantity).max(0.0);
        let change = new_quantity - material.quantity;

        tx.execute(
            "UPDATE materials SET quantity = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![new_quantity, material_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        let tx_id = format!("sal_{}_{}_{}", material_id, base_ts, counter);
        counter += 1;
        tx.execute(
            "INSERT INTO material_transactions (id, material_id, quantity_change, quantity_after, transaction_type, reference_id, description)
             VALUES (?1, ?2, ?3, ?4, 'sal_deduction', ?5, 'Impegno da SAL')",
            rusqlite::params![tx_id, material_id, change, new_quantity, reference_id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        updated.push(get_material(&tx, material_id)?.ok_or(AppError::Database(
            "Materiale non trovato dopo deduzione".to_string(),
        ))?);
    }

    tx.commit().map_err(|e| AppError::Database(e.to_string()))?;

    Ok(updated)
}

pub fn list_material_transactions(
    connection: &Connection,
    material_id: &str,
) -> Result<Vec<MaterialTransactionRecord>, AppError> {
    let mut statement = connection
        .prepare(
            "SELECT id, material_id, quantity_change, quantity_after, transaction_type, reference_id, description, created_at
             FROM material_transactions WHERE material_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    let records = statement
        .query_map(rusqlite::params![material_id], |row| {
            Ok(MaterialTransactionRecord {
                id: row.get(0)?,
                material_id: row.get(1)?,
                quantity_change: row.get(2)?,
                quantity_after: row.get(3)?,
                transaction_type: row.get(4)?,
                reference_id: row.get(5)?,
                description: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(records)
}
