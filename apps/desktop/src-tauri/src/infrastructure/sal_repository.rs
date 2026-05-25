use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

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
            serde_json::from_str::<SalBackednProject>(&json)
                .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
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
    let json = serde_json::to_string(project).map_err(|e| AppError::Serde(e.to_string()))?;

    connection
        .execute(
            "INSERT OR REPLACE INTO sal_workflow_projects (id, data) VALUES (?1, ?2)",
            params![project.id, json],
        )
        .map_err(to_database_error)?;

    Ok(())
}
