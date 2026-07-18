# Alle Modelle importieren, damit Base.metadata vollständig ist.
from app.models.auth import (  # noqa: F401
    KanzleiEinladung as _KE, PasswortReset, Session,
)
from app.models.bank import BankKonto, BankTransaktion  # noqa: F401
from app.models.bankverbindung import BankVerbindung  # noqa: F401
from app.models.fach import (  # noqa: F401
    AuditLog, Beleg, BelegDatei, Klaerungsfall, Rueckfrage,
    RueckfrageNachricht, VorjahresImport,
)
from app.models.personal import PersonalEinladung  # noqa: F401
from app.models.verkauf import VerkaufDokument  # noqa: F401
from app.models.fibu import (  # noqa: F401
    DatevStapel, Journal, OposPosten, PartnerRegel, Personenkonto, SkrKonto,
)
from app.models.org import (  # noqa: F401
    KanzleiMandat, Org, OrgEinstellung, OrgMember, User,
)
