use rusqlite::Connection;
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::infrastructure::to_database_error;
use crate::models::app_error::AppError;

pub fn append_event(
    conn: &Connection,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    actor_id: Option<&str>,
    payload: Option<&Value>,
) -> Result<(), AppError> {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let id = format!("aud_{}_{}", entity_id, ts);

    let effective_actor_id = match actor_id {
        Some(id) => Some(id.to_string()),
        None => conn
            .query_row(
                "SELECT id FROM members ORDER BY created_at ASC LIMIT 1",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok(),
    };

    let payload_json = payload.and_then(|v| serde_json::to_string(v).ok());

    conn.execute(
        "INSERT INTO audit_events (id, entity_type, entity_id, action, actor_id, payload)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![
            id,
            entity_type,
            entity_id,
            action,
            effective_actor_id,
            payload_json
        ],
    )
    .map_err(to_database_error)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    use serde_json::json;

    fn setup_schema(conn: &Connection) {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS audit_events (
              id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
              action TEXT NOT NULL, actor_id TEXT, payload TEXT,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS members (
              id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL DEFAULT 'ws_default',
              name TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Admin',
              status TEXT NOT NULL DEFAULT 'active', avatar_initials TEXT NOT NULL DEFAULT '',
              last_access_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            INSERT OR IGNORE INTO members (id, workspace_id, name, email, role, status, avatar_initials)
            VALUES ('test_member', 'ws_test', 'Test Admin', 'admin@test.com', 'Admin', 'active', 'TA');",
        ).expect("schema setup");
    }

    #[test]
    fn test_append_event() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        append_event(
            &conn,
            "sal",
            "sal_123",
            "confirm",
            Some("test_member"),
            None,
        )
        .unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM audit_events", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_append_with_payload() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        let payload = json!({"id": "sal_123", "total": 5000.0});
        append_event(
            &conn,
            "sal",
            "sal_123",
            "create",
            Some("test_member"),
            Some(&payload),
        )
        .unwrap();
        let stored: String = conn
            .query_row("SELECT payload FROM audit_events LIMIT 1", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert!(stored.contains("sal_123"));
        assert!(stored.contains("5000"));
    }

    #[test]
    fn test_auto_actor_id() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        append_event(&conn, "material", "mat_001", "deduct", None, None).unwrap();
        let actor: Option<String> = conn
            .query_row("SELECT actor_id FROM audit_events LIMIT 1", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert!(actor.is_some());
        assert_eq!(actor.unwrap(), "test_member");
    }

    #[test]
    fn test_events_append_only() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        append_event(&conn, "sal", "s1", "create", None, None).unwrap();
        append_event(&conn, "sal", "s1", "update", None, None).unwrap();
        append_event(&conn, "sal", "s1", "delete", None, None).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM audit_events", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 3);
    }

    #[test]
    fn test_explicit_actor_overrides_auto() {
        let conn = Connection::open_in_memory().unwrap();
        setup_schema(&conn);
        append_event(
            &conn,
            "contract",
            "c_001",
            "create",
            Some("custom_actor"),
            None,
        )
        .unwrap();
        let actor: String = conn
            .query_row("SELECT actor_id FROM audit_events LIMIT 1", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(actor, "custom_actor");
    }
}
