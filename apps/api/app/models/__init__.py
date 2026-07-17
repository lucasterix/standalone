# Alle Modelle importieren, damit Base.metadata vollständig ist.
from app.models.auth import KanzleiEinladung as _KE, Session  # noqa: F401
from app.models.bank import BankKonto, BankTransaktion  # noqa: F401
from app.models.fach import (  # noqa: F401
    AuditLog, Beleg, Klaerungsfall, Rueckfrage, RueckfrageNachricht,
    VorjahresImport,
)
from app.models.fibu import (  # noqa: F401
    DatevStapel, Journal, OposPosten, PartnerRegel, Personenkonto, SkrKonto,
)
from app.models.org import KanzleiMandat, Org, OrgMember, User  # noqa: F401
