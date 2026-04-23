# Architecture Overview

Quantara is organized as a domain-first offline desktop application.

The presentation layer owns React screens, components, selectors and stores. It does not own
business rules, filesystem access or database access.

The shared TypeScript packages define contracts, validation, domain utilities, import/export
adapters and UI tokens. The Rust/Tauri side owns OS integration, local storage, updater hooks and
high-value domain services as the product matures.

The first hot paths to protect are tariff voice resolution, SAL totals, large table rendering and
import/export pipelines.
