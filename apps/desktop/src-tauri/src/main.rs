// Kontoklar Desktop: bewusst NUR eine Shell um die Live-Web-App.
// Jeder Web-Deploy aktualisiert damit automatisch auch die Desktop-App -
// diese Binary muss nur neu gebaut werden, wenn sich die Shell selbst
// aendert (Fenster, Icon, Titel).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Kontoklar konnte nicht starten");
}
