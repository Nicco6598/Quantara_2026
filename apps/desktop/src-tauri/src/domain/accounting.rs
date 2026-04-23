use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
pub struct Money {
    pub amount: f64,
    pub currency: &'static str,
}

pub fn calculate_sal_total(
    discountable_gross: f64,
    safety_costs: f64,
    tender_adjustment_percent: f64,
    subcontract_adjustment_percent: f64,
) -> Money {
    let after_tender = discountable_gross * adjustment_multiplier(tender_adjustment_percent);
    let after_subcontract = after_tender * adjustment_multiplier(subcontract_adjustment_percent);

    Money {
        amount: round_currency(after_subcontract + safety_costs),
        currency: "EUR",
    }
}

fn adjustment_multiplier(percent: f64) -> f64 {
    1.0 + percent / 100.0
}

fn round_currency(amount: f64) -> f64 {
    (amount * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::calculate_sal_total;

    #[test]
    fn safety_costs_are_not_discounted() {
        let total = calculate_sal_total(100_000.0, 5_000.0, -10.0, -5.0);

        assert_eq!(total.amount, 90_500.0);
    }
}
