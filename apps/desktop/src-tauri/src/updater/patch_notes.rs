pub struct PatchNotes {
    pub version: String,
    pub summary: String,
}

impl PatchNotes {
    pub fn foundation() -> Self {
        Self {
            summary: "Phase A foundations in progress".into(),
            version: env!("CARGO_PKG_VERSION").into(),
        }
    }
}
