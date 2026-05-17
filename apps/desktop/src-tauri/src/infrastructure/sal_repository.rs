use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::infrastructure::to_database_error;
use crate::models::app_error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SalBackednProject {
    pub id: String,
    pub client: String,
    pub description: String,
    pub name: String,
    pub year: i64,
}

pub fn list_sal_projects(connection: &Connection) -> Result<Vec<SalBackednProject>, AppError> {
    let mut statement = connection
        .prepare("SELECT data FROM sal_workflow_projects ORDER BY id")
        .map_err(to_database_error)?;

    let rows = statement
        .query_map([], |row| {
            let json: String = row.get(0)?;
            serde_json::from_str::<SalBackednProject>(&json).map_err(|e| {
                rusqlite::Error::ToSqlConversionFailure(Box::new(e))
            })
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)?;

    Ok(rows)
}

pub fn upsert_sal_project(
    connection: &mut Connection,
    project: &SalBackednProject,
) -> Result<(), AppError> {
    let json =
        serde_json::to_string(project).map_err(|e| AppError::Serde(e.to_string()))?;

    connection
        .execute(
            "INSERT OR REPLACE INTO sal_workflow_projects (id, data) VALUES (?1, ?2)",
            params![project.id, json],
        )
        .map_err(to_database_error)?;

    Ok(())
}

pub fn list_sal_documents(
    connection: &Connection,
    project_id: Option<&str>,
) -> Result<Vec<Value>, AppError> {
    let sql = if project_id.is_some() {
        "SELECT id, project_id, data FROM sal_workflow_documents WHERE project_id = ?1 ORDER BY id"
    } else {
        "SELECT id, project_id, data FROM sal_workflow_documents ORDER BY id"
    };

    let mut statement = connection.prepare(sql).map_err(to_database_error)?;

    let params: Vec<Box<dyn rusqlite::types::ToSql>> = match project_id {
        Some(pid) => vec![Box::new(pid.to_string())],
        None => vec![],
    };
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let rows = statement
        .query_map(param_refs.as_slice(), |row| {
            let json: String = row.get(2)?;
            serde_json::from_str::<Value>(&json).map_err(|e| {
                rusqlite::Error::ToSqlConversionFailure(Box::new(e))
            })
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)?;

    Ok(rows)
}

pub fn create_sal_document(
    connection: &mut Connection,
    project_id: &str,
    data: &Value,
) -> Result<(), AppError> {
    let id = data
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Validation("SalDocument missing id field".into()))?;

    let json =
        serde_json::to_string(data).map_err(|e| AppError::Serde(e.to_string()))?;

    connection
        .execute(
            "INSERT OR REPLACE INTO sal_workflow_documents (id, project_id, data) VALUES (?1, ?2, ?3)",
            params![id, project_id, json],
        )
        .map_err(to_database_error)?;

    Ok(())
}

pub fn update_sal_document(
    connection: &mut Connection,
    id: &str,
    data: &Value,
) -> Result<(), AppError> {
    let project_id = data
        .get("projectId")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Validation("SalDocument missing projectId field".into()))?;

    let json =
        serde_json::to_string(data).map_err(|e| AppError::Serde(e.to_string()))?;

    let affected = connection
        .execute(
            "UPDATE sal_workflow_documents SET project_id = ?1, data = ?2 WHERE id = ?3",
            params![project_id, json, id],
        )
        .map_err(to_database_error)?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "Sal document {} not found",
            id
        )));
    }

    Ok(())
}

pub fn delete_sal_document(
    connection: &mut Connection,
    id: &str,
) -> Result<(), AppError> {
    let affected = connection
        .execute(
            "DELETE FROM sal_workflow_documents WHERE id = ?1",
            params![id],
        )
        .map_err(to_database_error)?;

    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "Sal document {} not found",
            id
        )));
    }

    Ok(())
}
