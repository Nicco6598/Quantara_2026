use rusqlite::{Connection, params};
use serde_json::Value;

use crate::infrastructure::to_database_error;
use crate::models::app_error::AppError;

pub fn list_sal_documents_v2(
    conn: &Connection,
    project_id: Option<&str>,
) -> Result<Vec<Value>, AppError> {
    let sql = if project_id.is_some() {
        "SELECT source_snapshot FROM sal_documents_v2 WHERE project_id = ?1 ORDER BY date DESC"
    } else {
        "SELECT source_snapshot FROM sal_documents_v2 ORDER BY date DESC"
    };

    let mut stmt = conn.prepare(sql).map_err(to_database_error)?;

    let rows: Vec<Value> = if let Some(pid) = project_id {
        stmt.query_map(params![pid], |row| {
            let json_str: String = row.get(0)?;
            Ok(serde_json::from_str(&json_str).unwrap_or(Value::Null))
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)?
    } else {
        stmt.query_map([], |row| {
            let json_str: String = row.get(0)?;
            Ok(serde_json::from_str(&json_str).unwrap_or(Value::Null))
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)?
    };

    Ok(rows.into_iter().filter(|v| !v.is_null()).collect())
}

pub fn create_sal_document_v2(
    conn: &Connection,
    project_id: &str,
    data: &Value,
) -> Result<(), AppError> {
    let id = data["id"]
        .as_str()
        .ok_or_else(|| AppError::Validation("SalDocument missing id".into()))?;
    let title = data["title"].as_str().unwrap_or("");
    let status = data["status"].as_str().unwrap_or("draft");
    let date = data["date"].as_str().unwrap_or("");
    let description = data["description"].as_str().unwrap_or("");
    let closed_at = data["closedAt"].as_str();
    let notes = data["notes"].as_str().unwrap_or("");
    let total = data["total"].as_f64().unwrap_or(0.0);
    let total_cents = (total * 100.0).round() as i64;

    let lines_arr = data["lines"].as_array();
    let lines_count = lines_arr.map(|a| a.len() as i64).unwrap_or(0);
    let measurement_rows_count = lines_arr
        .map(|arr| {
            arr.iter()
                .map(|l| {
                    l["measurementRows"]
                        .as_array()
                        .map(|m| m.len())
                        .unwrap_or(0)
                })
                .sum::<usize>()
        })
        .unwrap_or(0) as i64;

    let voices = data["voices"].as_array();

    conn.execute(
        "INSERT OR REPLACE INTO sal_documents_v2 \
         (id, project_id, title, status, date, description, closed_at, notes, \
          total_cents, lines_count, measurement_rows_count, source_snapshot) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            id,
            project_id,
            title,
            status,
            date,
            description,
            closed_at,
            notes,
            total_cents,
            lines_count,
            measurement_rows_count,
            serde_json::to_string(data).unwrap_or_default()
        ],
    )?;

    if let Some(lines) = lines_arr {
        for (li, line) in lines.iter().enumerate() {
            let line_id_owned = format!("{}_line_{}", id, li);
            let line_id = line["id"].as_str().unwrap_or(&line_id_owned);
            let voice_id = line["voiceId"].as_str().unwrap_or("");
            let quantity = line["quantity"].as_f64().unwrap_or(0.0);
            let surcharge_kind = line["surcharge"]["kind"].as_str().unwrap_or("none");
            let surcharge_percent = line["surcharge"]["percent"].as_f64().unwrap_or(0.0);

            let voice =
                voices.and_then(|va| va.iter().find(|v| v["id"].as_str() == Some(voice_id)));

            let (code, vdesc, cat, unit, uprice, labor, pyear) = voice.map_or_else(
                || Default::default(),
                |v| {
                    (
                        v["code"].as_str().unwrap_or("").to_string(),
                        v["description"].as_str().unwrap_or("").to_string(),
                        v["category"].as_str().unwrap_or("").to_string(),
                        v["unit"].as_str().unwrap_or("").to_string(),
                        (v["unitPrice"].as_f64().unwrap_or(0.0) * 100.0).round() as i64,
                        v["laborPercentage"].as_f64().unwrap_or(0.0),
                        v["projectYear"].as_i64().unwrap_or(0),
                    )
                },
            );

            let gross_cents = (quantity * uprice as f64).round() as i64;
            let discount_cents = (gross_cents as f64 * surcharge_percent / 100.0).round() as i64;
            let total_cents_line = gross_cents - discount_cents;

            conn.execute(
                "INSERT OR REPLACE INTO sal_lines \
                 (id, sal_id, voice_id, voice_code, voice_description, voice_category, \
                  voice_unit, voice_unit_price_cents, voice_labor_percentage, voice_project_year, \
                  quantity, surcharge_kind, surcharge_percent, \
                  gross_amount_cents, discount_amount_cents, total_amount_cents, order_index) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, \
                         ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
                params![
                    line_id,
                    id,
                    voice_id,
                    code,
                    vdesc,
                    cat,
                    unit,
                    uprice,
                    labor,
                    pyear,
                    quantity,
                    surcharge_kind,
                    surcharge_percent,
                    gross_cents,
                    discount_cents,
                    total_cents_line,
                    li as i64
                ],
            )?;

            if let Some(rows) = line["measurementRows"].as_array() {
                for (ri, mr) in rows.iter().enumerate() {
                    let mr_id_owned = format!("mr_{}_{}", line_id, ri);
                    let mr_id = mr["id"].as_str().unwrap_or(&mr_id_owned);
                    let mr_date = mr["date"].as_str();
                    let station = mr["station"].as_str().unwrap_or("");
                    let section = mr["section"].as_str().unwrap_or("");
                    let mr_description = mr["description"].as_str().unwrap_or("");
                    let factor1 = mr["factor1"].as_f64().unwrap_or(0.0);
                    let factor2 = mr["factor2"].as_f64().unwrap_or(1.0);
                    let factor3 = mr["factor3"].as_f64().unwrap_or(1.0);
                    let partial_qty = mr["partialQuantity"].as_f64().unwrap_or(0.0);
                    let mr_unit = mr["unit"].as_str().unwrap_or("");
                    let mr_notes = mr["notes"].as_str().unwrap_or("");

                    conn.execute(
                        "INSERT OR REPLACE INTO sal_measurement_rows \
                         (id, sal_line_id, date, station, section, description, \
                          factor1, factor2, factor3, partial_quantity, unit, notes, order_index) \
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                        params![
                            mr_id,
                            line_id,
                            mr_date,
                            station,
                            section,
                            mr_description,
                            factor1,
                            factor2,
                            factor3,
                            partial_qty,
                            mr_unit,
                            mr_notes,
                            ri as i64
                        ],
                    )?;
                }
            }
        }
    }

    if let Some(materials) = data["materialUsage"].as_array() {
        for (mi, mat) in materials.iter().enumerate() {
            let mu_id_owned = format!("mu_{}_{}", id, mi);
            let mu_id = mat["id"].as_str().unwrap_or(&mu_id_owned);
            let mat_id = mat["materialId"].as_str().unwrap_or("");
            let mat_code = mat["code"].as_str().unwrap_or("");
            let mat_desc = mat["description"].as_str().unwrap_or("");
            let mat_unit = mat["unit"].as_str().unwrap_or("");
            let mat_qty = mat["quantity"].as_f64().unwrap_or(0.0);

            conn.execute(
                "INSERT OR REPLACE INTO sal_material_usage \
                 (id, sal_id, material_id, material_code, material_description, material_unit, quantity, order_index) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![mu_id, id, mat_id, mat_code, mat_desc, mat_unit, mat_qty, mi as i64],
            )?;
        }
    }

    Ok(())
}

pub fn save_version_snapshot(
    conn: &Connection,
    sal_id: &str,
    change_reason: &str,
    actor_id: Option<&str>,
) -> Result<(), AppError> {
    let snapshot: String = conn
        .query_row(
            "SELECT source_snapshot FROM sal_documents_v2 WHERE id = ?1",
            params![sal_id],
            |row| row.get(0),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                AppError::NotFound(format!("SAL {} not found", sal_id))
            }
            _ => to_database_error(e),
        })?;

    let version: i64 = conn
        .query_row(
            "SELECT version FROM sal_documents_v2 WHERE id = ?1",
            params![sal_id],
            |row| row.get(0),
        )
        .map_err(to_database_error)?;

    conn.execute(
        "INSERT INTO sal_document_versions (id, sal_id, version, change_reason, snapshot_json, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            format!("{}-v{}", sal_id, version),
            sal_id,
            version,
            change_reason,
            snapshot,
            actor_id,
        ],
    )?;

    Ok(())
}

pub fn list_versions(conn: &Connection, sal_id: &str) -> Result<Vec<Value>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, version, change_reason, created_by, created_at
             FROM sal_document_versions WHERE sal_id = ?1 ORDER BY version DESC",
        )
        .map_err(to_database_error)?;

    let rows = stmt
        .query_map(params![sal_id], |row| {
            let id: String = row.get(0)?;
            let version: i64 = row.get(1)?;
            let reason: String = row.get(2)?;
            let created_by: Option<String> = row.get(3)?;
            let created_at: String = row.get(4)?;
            Ok(serde_json::json!({
                "id": id,
                "salId": sal_id,
                "version": version,
                "changeReason": reason,
                "createdBy": created_by,
                "createdAt": created_at,
            }))
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)?;

    Ok(rows)
}

pub fn get_version(conn: &Connection, version_id: &str) -> Result<Option<Value>, AppError> {
    let result = conn.query_row(
        "SELECT sal_id, version, change_reason, snapshot_json, created_by, created_at
         FROM sal_document_versions WHERE id = ?1",
        params![version_id],
        |row| {
            let sal_id: String = row.get(0)?;
            let version: i64 = row.get(1)?;
            let reason: String = row.get(2)?;
            let snapshot: String = row.get(3)?;
            let created_by: Option<String> = row.get(4)?;
            let created_at: String = row.get(5)?;

            let snapshot_value: Value = serde_json::from_str(&snapshot).unwrap_or(Value::Null);

            Ok(serde_json::json!({
                "id": version_id,
                "salId": sal_id,
                "version": version,
                "changeReason": reason,
                "snapshotJson": snapshot_value,
                "createdBy": created_by,
                "createdAt": created_at,
            }))
        },
    );

    match result {
        Ok(r) => Ok(Some(r)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(to_database_error(e)),
    }
}

pub fn delete_sal_document_v2(conn: &Connection, id: &str) -> Result<(), AppError> {
    let affected = conn
        .execute("DELETE FROM sal_documents_v2 WHERE id = ?1", params![id])
        .map_err(to_database_error)?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "Sal document {} not found in v2",
            id
        )));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use serde_json::json;

    fn setup_schema(conn: &Connection) {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS sal_documents_v2 (
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
              description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
              date TEXT NOT NULL DEFAULT '', closed_at TEXT, notes TEXT NOT NULL DEFAULT '',
              total_cents INTEGER NOT NULL DEFAULT 0, gross_amount_cents INTEGER NOT NULL DEFAULT 0,
              discount_amount_cents INTEGER NOT NULL DEFAULT 0, lines_count INTEGER NOT NULL DEFAULT 0,
              measurement_rows_count INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              version INTEGER NOT NULL DEFAULT 1, source_snapshot TEXT
            );
            CREATE TABLE IF NOT EXISTS sal_lines (
              id TEXT PRIMARY KEY, sal_id TEXT NOT NULL REFERENCES sal_documents_v2(id) ON DELETE CASCADE,
              voice_id TEXT NOT NULL DEFAULT '', voice_code TEXT NOT NULL DEFAULT '',
              voice_description TEXT NOT NULL DEFAULT '', voice_category TEXT NOT NULL DEFAULT '',
              voice_unit TEXT NOT NULL DEFAULT '', voice_unit_price_cents INTEGER NOT NULL DEFAULT 0,
              voice_labor_percentage REAL NOT NULL DEFAULT 0, voice_project_year INTEGER NOT NULL DEFAULT 0,
              quantity REAL NOT NULL DEFAULT 0, surcharge_kind TEXT NOT NULL DEFAULT 'none',
              surcharge_percent REAL NOT NULL DEFAULT 0, gross_amount_cents INTEGER NOT NULL DEFAULT 0,
              discount_amount_cents INTEGER NOT NULL DEFAULT 0, total_amount_cents INTEGER NOT NULL DEFAULT 0,
              order_index INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS sal_measurement_rows (
              id TEXT PRIMARY KEY, sal_line_id TEXT NOT NULL REFERENCES sal_lines(id) ON DELETE CASCADE,
              date TEXT, station TEXT NOT NULL DEFAULT '', section TEXT NOT NULL DEFAULT '',
              description TEXT NOT NULL DEFAULT '', factor1 REAL NOT NULL DEFAULT 0,
              factor2 REAL NOT NULL DEFAULT 1, factor3 REAL NOT NULL DEFAULT 1,
              partial_quantity REAL NOT NULL DEFAULT 0, unit TEXT NOT NULL DEFAULT '',
              notes TEXT NOT NULL DEFAULT '', order_index INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS sal_material_usage (
              id TEXT PRIMARY KEY, sal_id TEXT NOT NULL REFERENCES sal_documents_v2(id) ON DELETE CASCADE,
              material_id TEXT NOT NULL DEFAULT '', material_code TEXT NOT NULL DEFAULT '',
              material_description TEXT NOT NULL DEFAULT '', material_unit TEXT NOT NULL DEFAULT '',
              quantity REAL NOT NULL DEFAULT 0, order_index INTEGER NOT NULL DEFAULT 0
            );",
        ).expect("schema setup");
    }

    fn make_test_sal() -> Value {
        json!({
            "id": "test_sal_1", "projectId": "test_project", "title": "Test SAL",
            "description": "A test document", "status": "draft", "date": "2026-05-20",
            "notes": "", "total": 1500.00, "totalCents": 150000, "lineCount": 1,
            "measurementRowCount": 2, "voices": [{
                "id": "voice_1", "code": "V001", "description": "Test Voice",
                "category": "General", "unit": "m\u{00b2}", "unitPrice": 150.00,
                "laborPercentage": 0.0, "projectYear": 2026
            }], "lines": [{
                "id": "test_sal_1_line_0", "voiceId": "voice_1", "quantity": 10.0,
                "surcharge": { "kind": "none", "percent": 0.0 },
                "measurementRows": [{
                    "id": "test_sal_1_mr_0", "voiceId": "voice_1", "date": "2026-05-01",
                    "description": "M1", "factor1": 5.0, "factor2": 1.0, "factor3": 1.0,
                    "partialQuantity": 5.0, "unit": "m\u{00b2}", "notes": "", "order": 0
                }, {
                    "id": "test_sal_1_mr_1", "voiceId": "voice_1", "date": "2026-05-15",
                    "description": "M2", "factor1": 5.0, "factor2": 1.0, "factor3": 1.0,
                    "partialQuantity": 5.0, "unit": "m\u{00b2}", "notes": "", "order": 1
                }]
            }], "materialUsage": [{
                "id": "test_sal_1_mu_0", "materialId": "mat_1", "code": "M001",
                "description": "Cement", "unit": "kg", "quantity": 100.0
            }]
        })
    }

    fn make_test_sal_with(id: &str, project_id: &str) -> Value {
        let mut v = make_test_sal();
        if let Some(obj) = v.as_object_mut() {
            obj.insert("id".to_string(), Value::String(id.to_string()));
            obj.insert(
                "projectId".to_string(),
                Value::String(project_id.to_string()),
            );
        }
        v
    }

    #[test]
    fn test_create_and_list() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        create_sal_document_v2(&conn, "proj_1", &make_test_sal()).unwrap();
        let docs = list_sal_documents_v2(&conn, Some("proj_1")).unwrap();
        assert_eq!(docs.len(), 1);
    }

    #[test]
    fn test_list_by_project() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        create_sal_document_v2(&conn, "proj_x", &make_test_sal_with("a", "proj_x")).unwrap();
        create_sal_document_v2(&conn, "proj_y", &make_test_sal_with("b", "proj_y")).unwrap();
        assert_eq!(
            list_sal_documents_v2(&conn, Some("proj_x")).unwrap().len(),
            1
        );
        assert_eq!(
            list_sal_documents_v2(&conn, Some("proj_y")).unwrap().len(),
            1
        );
        assert_eq!(list_sal_documents_v2(&conn, None).unwrap().len(), 2);
    }

    #[test]
    fn test_list_all() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        create_sal_document_v2(&conn, "p1", &make_test_sal_with("a", "p1")).unwrap();
        create_sal_document_v2(&conn, "p1", &make_test_sal_with("b", "p1")).unwrap();
        assert_eq!(list_sal_documents_v2(&conn, None).unwrap().len(), 2);
    }

    #[test]
    fn test_delete() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        create_sal_document_v2(&conn, "proj_1", &make_test_sal()).unwrap();
        delete_sal_document_v2(&conn, "test_sal_1").unwrap();
        assert_eq!(
            list_sal_documents_v2(&conn, Some("proj_1")).unwrap().len(),
            0
        );
    }

    #[test]
    fn test_delete_nonexistent_fails() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        assert!(delete_sal_document_v2(&conn, "nonexistent").is_err());
    }

    #[test]
    fn test_rewrite_same_id() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        create_sal_document_v2(&conn, "p1", &make_test_sal_with("same_id", "p1")).unwrap();
        let mut v = make_test_sal_with("same_id", "p1");
        v.as_object_mut()
            .unwrap()
            .insert("title".to_string(), json!("Updated"));
        create_sal_document_v2(&conn, "p1", &v).unwrap();
        let docs = list_sal_documents_v2(&conn, Some("p1")).unwrap();
        assert_eq!(docs.len(), 1);
        assert_eq!(docs[0]["title"], "Updated");
    }
}
