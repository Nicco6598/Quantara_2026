# Changelog

All notable changes to Quantara follow SemVer.

## 0.1.32 - 2026-04-24

- Add ad-hoc macOS code signing for test DMG builds so Gatekeeper no longer reports the app as damaged on Apple Silicon.
- Publish GitHub release notes from the matching `CHANGELOG.md` version section.
- Keep the in-app post-update patch notes aligned with the release notes shown after restart.

## 0.1.31 - 2026-04-23

- Replace the native updater prompt with a branded in-app release cockpit showing notes, progress and install state.
- Repair Windows shell identity on startup so updated builds realign Start Menu and desktop shortcut icons with the current executable.
- Sync desktop release metadata to the new updater flow and release version.

## 0.1.2 - 2026-04-23

- Fix CI quality gate formatting and lint alignment.
- Keep release workflow tied to GitHub tags and updater artifacts.

## 0.1.1 - 2026-04-23

- Add automatic updater flow with GitHub Releases.
- Add branded Windows installers and macOS DMG assets.
- Add release notes dialog shown after updater relaunch.

## 0.1.0 - Unreleased

- Bootstrap enterprise workspace for Phase A foundations.
- Add centralized UI token system and desktop shell baseline.
- Add initial accounting domain rules for tariff priority, SAL totals and OS exclusion from discounts.
