"""Zentrale Konfiguration (12-factor, alles per Env überschreibbar)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="KK_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://kontoklar:kontoklar@localhost:5433/kontoklar"

    # P0-Auth: EIN Dev-Token für alle Requests (Bearer). Echtes Auth (Sessions,
    # Rollen, Kanzlei-Scoping) kommt in P1 — der Code trennt Tenants bereits
    # strikt über org_id, nur die IDENTITÄT ist noch Platzhalter.
    dev_api_token: str = "dev-token-CHANGE-ME"

    # Beim Start Tabellen anlegen (Dev/Tests). Vor dem ersten Pilotkunden wird
    # der Stand als Alembic-0001 eingefroren und das hier abgeschaltet.
    create_all_on_startup: bool = True


settings = Settings()
