# Kontoklar Desktop

Duenne Tauri-Shell (System-Webview, ~5-10 MB) um die LIVE-Web-App
https://kontoklar.froehlichdienste.de - bewusst OHNE eigene Logik.

**Update-Modell:** Die App laedt immer die Live-URL. Jeder Web-Deploy
(`./infra/deploy-web.sh`) ist damit sofort auch auf dem Desktop live -
es gibt nichts zu verteilen. Die Binary selbst aendert sich nur, wenn
Fenster/Icon/Titel angepasst werden.

**Release bauen:** Tag pushen -> GitHub Actions baut mac (.dmg) und
Windows (.msi/.exe) und haengt sie an ein GitHub-Release:

    git tag desktop-v0.1.0 && git push origin desktop-v0.1.0

Unsigniert (Pilot-Phase): macOS-Nutzer einmal Rechtsklick -> Oeffnen;
Windows-SmartScreen einmal "Trotzdem ausfuehren". Signierung/Notarisierung
kommt vor dem oeffentlichen Vertrieb.

**Alternative ohne Installation:** Die Web-App ist eine PWA - in
Chrome/Edge "App installieren" klicken; gleiches Update-Modell.
