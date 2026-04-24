use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use windows::Win32::System::Com::{
    CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx,
};
use windows::Win32::UI::Shell::{
    IShellLinkW, SHCNE_ASSOCCHANGED, SHCNF_IDLIST, SHChangeNotify,
    SetCurrentProcessExplicitAppUserModelID, ShellLink,
};
use windows::core::{HSTRING, Interface};

const APP_USER_MODEL_ID: &str = "com.quantara.desktop";
const PRODUCT_NAME: &str = "Quantara";

pub fn reconcile() {
    if let Err(error) = reconcile_inner() {
        eprintln!("failed to reconcile Windows shell assets: {error}");
    }
}

fn reconcile_inner() -> Result<(), Box<dyn std::error::Error>> {
    let exe_path = env::current_exe()?;
    let _ = unsafe { SetCurrentProcessExplicitAppUserModelID(&HSTRING::from(APP_USER_MODEL_ID)) };

    let start_menu_shortcut = start_menu_programs_dir().join(format!("{PRODUCT_NAME}.lnk"));
    let desktop_shortcut = desktop_dir().join(format!("{PRODUCT_NAME}.lnk"));

    repair_shortcut(&start_menu_shortcut, &exe_path, true)?;
    repair_shortcut(&desktop_shortcut, &exe_path, false)?;

    unsafe {
        SHChangeNotify(SHCNE_ASSOCCHANGED, SHCNF_IDLIST, None, None);
    }

    Ok(())
}

fn repair_shortcut(
    shortcut_path: &Path,
    exe_path: &Path,
    create_if_missing: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    if !create_if_missing && !shortcut_path.exists() {
        return Ok(());
    }

    if let Some(parent) = shortcut_path.parent() {
        fs::create_dir_all(parent)?;
    }

    unsafe {
        let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
        let shell_link: IShellLinkW = CoCreateInstance(&ShellLink, None, CLSCTX_INPROC_SERVER)?;
        let persist_file: windows::Win32::System::Com::IPersistFile = shell_link.cast()?;

        let exe_value = HSTRING::from(exe_path.to_string_lossy().into_owned());
        shell_link.SetPath(&exe_value)?;
        shell_link.SetIconLocation(&exe_value, 0)?;

        if let Some(working_dir) = exe_path.parent() {
            shell_link
                .SetWorkingDirectory(&HSTRING::from(working_dir.to_string_lossy().into_owned()))?;
        }

        shell_link.SetDescription(&HSTRING::from(PRODUCT_NAME))?;
        persist_file.Save(
            &HSTRING::from(shortcut_path.to_string_lossy().into_owned()),
            true,
        )?;
    }

    Ok(())
}

fn desktop_dir() -> PathBuf {
    user_profile_dir().join("Desktop")
}

fn start_menu_programs_dir() -> PathBuf {
    match env::var_os("APPDATA") {
        Some(value) => PathBuf::from(value).join(r"Microsoft\Windows\Start Menu\Programs"),
        None => user_profile_dir().join(r"AppData\Roaming\Microsoft\Windows\Start Menu\Programs"),
    }
}

fn user_profile_dir() -> PathBuf {
    PathBuf::from(env::var_os("USERPROFILE").unwrap_or_default())
}
