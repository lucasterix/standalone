# Kontoklar API

Fibu-Kern als Service: CSV-Import → lernende Kontierung → Autopilot →
Cent-Anker → EXTF-Export für DATEV. Portiert aus dem FZR-Echtbetrieb
(>23.000 Transaktionen), mandantenfähig über `org_id` auf jeder Tabelle.

## Entwicklung
```bash
cd apps/api
python3.12 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
docker compose -f docker-compose.dev.yml up -d   # Postgres :5433
.venv/bin/uvicorn app.main:app --reload          # http://localhost:8000/docs
.venv/bin/pytest                                  # Kern- + Auth-Tests
```

## Auth & Rollen
Echtes Login: `POST /auth/registrieren` (legt optional die Org an — inkl.
Kontenrahmen-Seed SKR45/SKR04 und Bankkonto) bzw. `POST /auth/login` liefern
ein Session-Token (`Authorization: Bearer …`, 30 Tage; `POST /auth/logout`
invalidiert). Passwörter: scrypt; Sessions: nur Token-Hash in der DB.
Org-Zugriff: eigene Mitgliedschaft (inhaber|buchhaltung) ODER Kanzlei-Mandat
(Rolle `kanzlei`) — jede Fachroute prüft `require_org`.

## Demo-Datenbestand (Produktionsniveau)
```bash
.venv/bin/python -m app.scripts.seed_demo
```
Legt „Pflegedienst Sonnenweg GmbH" an: SKR45 (200 Konten), 6 Monate
realistischer Zahlungsverkehr (Kassen-Sammelavise, Gehaltsläufe, SV, Miete,
Tanken …), Kostenträger-Debitoren + Lieferanten-Regeln, propose + Autopilot
gelaufen, Rückfrage/Klärungsfall/Belege/Vorjahres-Import — plus
„Steuerkanzlei Meyer & Kollegen" mit aktivem Mandat. Beide Demo-Logins
stehen in der Ausgabe. **Das Frontend muss nur noch verbunden werden.**

## Durchstich per API
1. `POST /auth/registrieren` → User + Org (Kontenrahmen + Bankkonto stehen)
2. `POST /orgs/{id}/personenkonten` → Kostenträger/Lieferanten
3. `POST /orgs/{id}/bank/import-csv` → Bank-CSV (Sparkasse/VR/…)
4. `POST /orgs/{id}/propose` → Leiter: OPOS → Kostenträger → Regel →
   Historie → Lohn-Muster → Fallback (nie automatisch)
5. `PATCH /journal/{id}` → entscheiden, optional `als_regel: true`
6. `POST /orgs/{id}/autopilot/run` (`/revert` = Not-Aus)
7. `GET /orgs/{id}/saldenabgleich?jahr=` → Cent-Anker
8. `POST /orgs/{id}/datev/stapel` + `GET /datev/stapel/{id}/extf` →
   DATEV-Format-Datei; `POST …/uebernommen` setzt exakt die eingefrorenen
   Sätze auf `gebucht`
9. Kanzlei: `POST /kanzlei/{id}/einladungen` → Annahme durch das Unternehmen
   → `GET /kanzlei/{id}/cockpit?jahr=` + Rückfragen an Buchungen

## Bewusste Grenzen (PLAN.md)
- Bank nur CSV (PSD2-Aggregator: P1); Beleg-KI-Extraktion: P1 (Modell steht)
- `create_all` statt Alembic (wird vor Pilot als Migration 0001 eingefroren)
- EXTF vor erstem Pilot mit einer echten Kanzlei testimportieren
