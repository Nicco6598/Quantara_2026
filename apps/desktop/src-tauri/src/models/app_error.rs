use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(String),
    #[error("validation error: {0}")]
    Validation(String),
}
