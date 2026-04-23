use serde::{Deserialize, Serialize};

use crate::domain::accounting::{Money, calculate_sal_total};
use crate::models::app_error::AppError;

#[derive(Debug, Deserialize)]
pub struct SalTotalPreviewRequest {
    pub discountable_gross: f64,
    pub safety_costs: f64,
    pub tender_adjustment_percent: f64,
    pub subcontract_adjustment_percent: f64,
}

#[derive(Debug, Serialize)]
pub struct SalTotalPreviewResponse {
    pub final_total: Money,
}

#[tauri::command]
pub fn preview_sal_total(
    request: SalTotalPreviewRequest,
) -> Result<SalTotalPreviewResponse, String> {
    if !request.discountable_gross.is_finite()
        || !request.safety_costs.is_finite()
        || !request.tender_adjustment_percent.is_finite()
        || !request.subcontract_adjustment_percent.is_finite()
    {
        return Err(
            AppError::Validation("SAL total preview received a non-finite number".into())
                .to_string(),
        );
    }

    Ok(SalTotalPreviewResponse {
        final_total: calculate_sal_total(
            request.discountable_gross,
            request.safety_costs,
            request.tender_adjustment_percent,
            request.subcontract_adjustment_percent,
        ),
    })
}
