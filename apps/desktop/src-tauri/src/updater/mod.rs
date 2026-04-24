pub mod patch_notes;
#[cfg(all(target_os = "windows", not(debug_assertions)))]
pub mod windows_shell;
