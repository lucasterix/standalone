/* Kontoklar Service Worker — bewusst minimal (Installierbarkeit + Offline-
   Hinweis). IMMER network-first: kein Precache, kein Stale-Content — jeder
   Web-Deploy ist sofort auch in der installierten App live. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(
          "<!doctype html><meta charset='utf-8'><title>Offline</title>" +
          "<body style='font-family:system-ui;display:grid;place-items:center;height:100vh;background:#f5f3ef'>" +
          "<div style='text-align:center'><h1>Gerade offline</h1>" +
          "<p>Kontoklar braucht eine Internetverbindung.<br>Einfach neu laden, sobald Sie wieder online sind.</p></div>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        ),
      ),
    );
  }
});
