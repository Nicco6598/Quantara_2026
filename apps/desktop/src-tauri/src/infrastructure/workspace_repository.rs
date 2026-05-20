use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::infrastructure::to_database_error;
use crate::models::app_error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberRecord {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub email: String,
    pub role: String,
    pub status: String,
    pub avatar_initials: String,
    pub last_access_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub fn get_default_workspace_id(conn: &Connection) -> Result<String, AppError> {
    conn.query_row(
        "SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1",
        [],
        |row| row.get(0),
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound("No workspace found".into()),
        _ => to_database_error(e),
    })
}

pub fn get_default_member_id(conn: &Connection) -> Result<String, AppError> {
    conn.query_row(
        "SELECT id FROM members ORDER BY created_at ASC LIMIT 1",
        [],
        |row| row.get(0),
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound("No member found".into()),
        _ => to_database_error(e),
    })
}

pub fn list_members(conn: &Connection) -> Result<Vec<MemberRecord>, AppError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, workspace_id, name, email, role, status, avatar_initials, last_access_at, created_at, updated_at
             FROM members ORDER BY name ASC",
        )
        .map_err(to_database_error)?;

    let rows = stmt
        .query_map([], |row| {
            Ok(MemberRecord {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                email: row.get(3)?,
                role: row.get(4)?,
                status: row.get(5)?,
                avatar_initials: row.get(6)?,
                last_access_at: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)?;

    Ok(rows)
}

pub fn create_member(
    conn: &Connection,
    name: &str,
    email: &str,
    role: &str,
) -> Result<MemberRecord, AppError> {
    let workspace_id = get_default_workspace_id(conn)?;
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let id = format!("member_{}", ts);
    let initials = name
        .split_whitespace()
        .filter_map(|w| w.chars().next())
        .take(2)
        .collect::<String>()
        .to_uppercase();

    conn.execute(
        "INSERT INTO members (id, workspace_id, name, email, role, status, avatar_initials)
         VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6)",
        params![id, workspace_id, name, email, role, initials],
    )?;

    Ok(MemberRecord {
        id,
        workspace_id,
        name: name.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        status: "active".to_string(),
        avatar_initials: initials,
        last_access_at: None,
        created_at: String::new(),
        updated_at: String::new(),
    })
}

pub fn update_member(
    conn: &Connection,
    id: &str,
    name: &str,
    email: &str,
    role: &str,
) -> Result<(), AppError> {
    let affected = conn.execute(
        "UPDATE members SET name = ?1, email = ?2, role = ?3, updated_at = CURRENT_TIMESTAMP WHERE id = ?4",
        params![name, email, role, id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Member {} not found", id)));
    }
    Ok(())
}

pub fn delete_member(conn: &Connection, id: &str) -> Result<(), AppError> {
    let affected = conn.execute("DELETE FROM members WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Member {} not found", id)));
    }
    Ok(())
}

pub fn list_roles(conn: &Connection) -> Result<Vec<Value>, AppError> {
    let mut stmt = conn
        .prepare("SELECT id, name, description, is_system_role FROM roles ORDER BY is_system_role DESC, name ASC")
        .map_err(to_database_error)?;

    let rows = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let description: String = row.get(2)?;
            let is_system: bool = row.get::<_, i64>(3)? != 0;
            Ok(serde_json::json!({
                "id": id,
                "name": name,
                "description": description,
                "isSystemRole": is_system,
            }))
        })
        .map_err(to_database_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(to_database_error)?;

    Ok(rows)
}

pub fn get_member_by_id(conn: &Connection, id: &str) -> Result<Option<MemberRecord>, AppError> {
    let result = conn.query_row(
        "SELECT id, workspace_id, name, email, role, status, avatar_initials, last_access_at, created_at, updated_at
         FROM members WHERE id = ?1",
        params![id],
        |row| {
            Ok(MemberRecord {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                email: row.get(3)?,
                role: row.get(4)?,
                status: row.get(5)?,
                avatar_initials: row.get(6)?,
                last_access_at: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    );

    match result {
        Ok(r) => Ok(Some(r)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(to_database_error(e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_schema(conn: &Connection) {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS workspaces (
              id TEXT PRIMARY KEY, name TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS members (
              id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
              name TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Project Manager',
              status TEXT NOT NULL DEFAULT 'active', avatar_initials TEXT NOT NULL DEFAULT '',
              last_access_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS roles (
              id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
              name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
              is_system_role INTEGER NOT NULL DEFAULT 0, UNIQUE(workspace_id, name)
            );
            INSERT OR IGNORE INTO workspaces (id, name) VALUES ('ws_test', 'Test Workspace');",
        ).expect("schema setup");
    }

    #[test]
    fn test_get_default_workspace() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        assert_eq!(get_default_workspace_id(&conn).unwrap(), "ws_test");
    }

    #[test]
    fn test_create_member() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        let m = create_member(&conn, "Alice Rossi", "alice@test.com", "Project Manager").unwrap();
        assert_eq!(m.name, "Alice Rossi");
        assert_eq!(m.email, "alice@test.com");
        assert_eq!(m.role, "Project Manager");
        assert_eq!(m.status, "active");
        assert_eq!(m.avatar_initials, "AR");
    }

    #[test]
    fn test_list_members() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        create_member(&conn, "Alice", "alice@t.com", "PM").unwrap();
        create_member(&conn, "Bob", "bob@t.com", "Eng").unwrap();
        assert_eq!(list_members(&conn).unwrap().len(), 2);
    }

    #[test]
    fn test_update_member() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        let m = create_member(&conn, "Alice", "alice@t.com", "PM").unwrap();
        update_member(&conn, &m.id, "Alice R.", "alice@t.com", "Super Admin").unwrap();
        let updated = get_member_by_id(&conn, &m.id).unwrap().unwrap();
        assert_eq!(updated.name, "Alice R.");
        assert_eq!(updated.role, "Super Admin");
    }

    #[test]
    fn test_delete_member() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        let m = create_member(&conn, "Bob", "bob@t.com", "Eng").unwrap();
        delete_member(&conn, &m.id).unwrap();
        assert_eq!(list_members(&conn).unwrap().len(), 0);
    }

    #[test]
    fn test_delete_nonexistent_fails() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        assert!(delete_member(&conn, "nonexistent").is_err());
    }

    #[test]
    fn test_get_member_not_found() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        assert!(get_member_by_id(&conn, "nonexistent").unwrap().is_none());
    }

    #[test]
    fn test_list_roles() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        conn.execute_batch(
            "INSERT OR IGNORE INTO roles (id, workspace_id, name, description, is_system_role) VALUES
             ('r1', 'ws_test', 'Admin', 'Full', 1), ('r2', 'ws_test', 'Viewer', 'RO', 1);",
        ).unwrap();
        assert_eq!(list_roles(&conn).unwrap().len(), 2);
    }
}
