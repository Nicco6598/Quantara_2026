pub mod contract_repository;
pub mod encryption;
pub mod local_storage;
pub mod material_repository;
pub mod audit_repository;
pub mod sal_repository;
pub mod sal_document_repository_v2;
pub mod tariff_repository;
pub mod workspace_repository;

use serde::Serialize;

use crate::models::app_error::AppError;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct Money {
    pub amount: f64,
    pub currency: &'static str,
}

pub(crate) fn money_to_cents(amount: f64) -> i64 {
    (amount * 100.0).round() as i64
}

pub(crate) fn cents_to_money(amount_cents: i64) -> f64 {
    amount_cents as f64 / 100.0
}

pub(crate) fn to_database_error(error: rusqlite::Error) -> AppError {
    AppError::Database(error.to_string())
}
