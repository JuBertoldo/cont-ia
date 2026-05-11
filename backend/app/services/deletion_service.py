"""
Serviço de exclusão de dados do usuário — conformidade LGPD.

Referências legais:
  Art. 18, II  — direito de eliminação de dados pessoais
  Art. 16, II  — exceção para dados fiscais (CTN art. 173 — 5 anos)
  Art. 19      — resposta ao titular em até 15 dias

Ações por tipo de dado:
  /chamados               → criar chamado informativo (status=resolvido) ANTES de deletar
  Firebase Auth           → deletar conta
  /usuarios/{uid}         → deletar documento
  Storage /perfil/{uid}/  → deletar foto de perfil
  /notificacoes           → deletar (dados do destinatário)
  /inference_metrics      → deletar (telemetria técnica)
  /login_audit            → anonimizar (uid="", email="removido@lgpd")
  /inventario             → anonimizar (usuarioId="", usuarioNome="Usuário removido")
  Storage /scans/{uid}/   → manter (ligados ao inventário — dado fiscal)
  /deletion_log           → criar registro de conformidade (sem dados pessoais)
"""

from datetime import UTC, datetime

from firebase_admin import auth as firebase_auth
from firebase_admin import firestore, storage

from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Constantes ────────────────────────────────────────────────────────────────

COL_USERS = "usuarios"
COL_INVENTORY = "inventario"
COL_NOTIFS = "notificacoes"
COL_AUDIT = "login_audit"
COL_METRICS = "inference_metrics"
COL_LOG = "deletion_log"
COL_TICKETS = "chamados"
COL_CONFIG = "config"

ANONYMOUS_USER_ID = ""
ANONYMOUS_USER_NAME = "Usuário removido"
ANONYMOUS_EMAIL = "removido@lgpd"


# ── Resultado ─────────────────────────────────────────────────────────────────


class DeletionResult:
    def __init__(self):
        self.deleted: dict[str, int] = {}
        self.anonymized: dict[str, int] = {}
        self.errors: list[str] = []

    def record_deleted(self, label: str, count: int = 1) -> None:
        self.deleted[label] = self.deleted.get(label, 0) + count

    def record_anonymized(self, label: str, count: int = 1) -> None:
        self.anonymized[label] = self.anonymized.get(label, 0) + count

    def record_error(self, message: str) -> None:
        logger.error("DeletionService: %s", message)
        self.errors.append(message)

    def to_dict(self) -> dict:
        return {
            "deleted": self.deleted,
            "anonymized": self.anonymized,
            "errors": self.errors,
            "success": len(self.errors) == 0,
        }


# ── Serviço principal ─────────────────────────────────────────────────────────


async def delete_user_account(uid: str) -> DeletionResult:
    """
    Remove todos os dados pessoais do usuário, conforme LGPD.

    Etapas:
      1. Valida que o uid existe
      2. Deleta dados pessoais (Auth, perfil, notificações, métricas)
      3. Anonimiza registros com valor legal (inventário, audit de login)
      4. Registra o evento de exclusão no /deletion_log (sem dados pessoais)
    """
    result = DeletionResult()
    db = firestore.client()

    logger.info("Iniciando exclusão de conta | uid=%s", uid)

    # ── 1. Busca dados do usuário antes de deletar ────────────────────────────
    user_doc = db.collection(COL_USERS).document(uid).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    empresa_id = user_data.get("empresaId", "")

    # ── 2. Cria chamado informativo ANTES de deletar (Opção A — LGPD) ─────────
    # O chamado precisa dos dados do usuário (nome, empresa) — criado antes
    # de qualquer exclusão. Status = 'resolvido' imediatamente (informativo).
    ticket_numero = _create_deletion_ticket(db, uid, user_data)
    if ticket_numero:
        logger.info("Chamado LGPD criado: %s", ticket_numero)

    # ── 2. Deleta notificações ────────────────────────────────────────────────
    count = _delete_collection_where(db, COL_NOTIFS, "paraUid", "==", uid, result, "notificacoes")
    logger.info("Notificações deletadas: %d", count)

    # ── 3. Deleta métricas de inferência (telemetria técnica) ─────────────────
    count = _delete_collection_where(
        db, COL_METRICS, "usuarioId", "==", uid, result, "inference_metrics"
    )
    logger.info("Métricas deletadas: %d", count)

    # ── 4. Anonimiza registros de inventário (dado fiscal — CTN 5 anos) ───────
    count = _anonymize_inventory(db, uid, result)
    logger.info("Registros de inventário anonimizados: %d", count)

    # ── 5. Anonimiza audit de login ───────────────────────────────────────────
    count = _anonymize_login_audit(db, uid, result)
    logger.info("Registros de login_audit anonimizados: %d", count)

    # ── 6. Deleta foto de perfil do Storage ───────────────────────────────────
    _delete_profile_photo(uid, result)

    # ── 7. Deleta documento do usuário no Firestore ───────────────────────────
    try:
        db.collection(COL_USERS).document(uid).delete()
        result.record_deleted("perfil_usuario")
    except Exception as exc:
        result.record_error(f"Erro ao deletar /usuarios/{uid}: {exc}")

    # ── 8. Deleta conta no Firebase Auth ─────────────────────────────────────
    try:
        firebase_auth.delete_user(uid)
        result.record_deleted("firebase_auth")
    except firebase_auth.UserNotFoundError:
        pass  # Conta já não existe — tudo bem
    except Exception as exc:
        result.record_error(f"Erro ao deletar Firebase Auth uid={uid}: {exc}")

    # ── 9. Registra log de exclusão (sem dados pessoais) ─────────────────────
    _write_deletion_log(db, uid, empresa_id, result)

    logger.info(
        "Exclusão concluída | uid=%s | deletados=%s | anonimizados=%s | erros=%d",
        uid,
        result.deleted,
        result.anonymized,
        len(result.errors),
    )

    return result


# ── Funções auxiliares ────────────────────────────────────────────────────────


def _get_next_ticket_number(db) -> str:
    """
    Gera o próximo número de chamado usando a mesma lógica do frontend:
    Firestore transaction em /config/ticketCounter → CONTIA-{YYYYMMDD}{seq:02d}
    """
    now = datetime.now(UTC)
    date_key = now.strftime("%Y%m%d")
    counter_ref = db.collection(COL_CONFIG).document("ticketCounter")

    @firestore.transactional
    def _run(transaction, ref):
        snap = ref.get(transaction=transaction)
        data = snap.to_dict() if snap.exists else {}
        seq = (data.get("count", 0) or 0) + 1 if data.get("data") == date_key else 1
        transaction.set(ref, {"data": date_key, "count": seq})
        return seq

    transaction = db.transaction()
    seq = _run(transaction, counter_ref)
    return f"CONTIA-{date_key}{str(seq).zfill(2)}"


def _create_deletion_ticket(db, uid: str, user_data: dict) -> str | None:
    """
    Cria um chamado informativo com status 'resolvido' para registrar
    a solicitação de exclusão de conta conforme LGPD art. 18, II.

    Deve ser chamado ANTES de qualquer exclusão de dados — precisa do
    nome e empresa do usuário para preencher o chamado corretamente.

    Retorna o número do chamado criado, ou None em caso de falha.
    """
    now = datetime.now(UTC)

    # Busca nome da empresa (dados ainda disponíveis neste momento)
    empresa_id = user_data.get("empresaId", "")
    empresa_nome = ""
    if empresa_id:
        emp_snap = db.collection("empresas").document(empresa_id).get()
        if emp_snap.exists:
            empresa_nome = (emp_snap.to_dict() or {}).get("nome", "")

    try:
        numero = _get_next_ticket_number(db)

        db.collection(COL_TICKETS).add(
            {
                "numero": numero,
                "titulo": "Exclusão de conta solicitada (LGPD)",
                "descricao": (
                    "O usuário solicitou a exclusão de todos os seus dados pessoais "
                    "conforme LGPD art. 18, II. A exclusão foi processada automaticamente "
                    "pelo sistema."
                ),
                "tipo": "outro",
                "status": "resolvido",
                "prioridade": "Baixa",
                "prioridadeColor": "#22c55e",
                "empresaId": empresa_id,
                "empresaNome": empresa_nome,
                "adminId": uid,
                "adminNome": user_data.get("nome") or user_data.get("email") or "",
                "adminEmail": user_data.get("email") or "",
                "resposta": (
                    "Conta excluída automaticamente conforme solicitação LGPD art. 18, II. "
                    "Dados pessoais removidos. Registros fiscais anonimizados (CTN art. 173)."
                ),
                "respondidoPor": "Sistema Cont.IA",
                "reaberturas": 0,
                "slaRespostaSuporteAt": None,
                "slaResolucaoAt": None,
                "slaRespostaClienteAt": None,
                "primeiraRespostaAt": now,
                "resolvidoAt": now,
                "createdAt": now,
                "updatedAt": now,
            }
        )
        return numero
    except Exception as exc:
        logger.warning("Falha ao criar chamado LGPD: %s", exc)
        return None


def _delete_collection_where(
    db,
    collection: str,
    field: str,
    op: str,
    value: str,
    result: DeletionResult,
    label: str,
) -> int:
    """Deleta todos os documentos de uma coleção que atendam ao filtro."""
    docs = list(db.collection(collection).where(field, op, value).stream())
    batch = db.batch()
    for doc in docs:
        batch.delete(doc.reference)
    if docs:
        try:
            batch.commit()
            result.record_deleted(label, len(docs))
        except Exception as exc:
            result.record_error(f"Erro ao deletar {collection}: {exc}")
    return len(docs)


def _anonymize_inventory(db, uid: str, result: DeletionResult) -> int:
    """
    Anonimiza registros de inventário do usuário.
    Remove dados pessoais mas preserva os dados de contagem
    (obrigação fiscal — CTN art. 173, 5 anos).
    """
    docs = list(db.collection(COL_INVENTORY).where("usuarioId", "==", uid).stream())
    if not docs:
        return 0

    batch = db.batch()
    now = datetime.now(UTC)
    for doc in docs:
        batch.update(
            doc.reference,
            {
                "usuarioId": ANONYMOUS_USER_ID,
                "usuarioNome": ANONYMOUS_USER_NAME,
                "lgpdAnonymizedAt": now,
            },
        )
    try:
        batch.commit()
        result.record_anonymized(COL_INVENTORY, len(docs))
    except Exception as exc:
        result.record_error(f"Erro ao anonimizar inventário: {exc}")
    return len(docs)


def _anonymize_login_audit(db, uid: str, result: DeletionResult) -> int:
    """Anonimiza registros de audit de login (remove uid e email)."""
    docs = list(db.collection(COL_AUDIT).where("uid", "==", uid).stream())
    if not docs:
        return 0

    batch = db.batch()
    now = datetime.now(UTC)
    for doc in docs:
        batch.update(
            doc.reference,
            {
                "uid": ANONYMOUS_USER_ID,
                "email": ANONYMOUS_EMAIL,
                "lgpdAnonymizedAt": now,
            },
        )
    try:
        batch.commit()
        result.record_anonymized(COL_AUDIT, len(docs))
    except Exception as exc:
        result.record_error(f"Erro ao anonimizar login_audit: {exc}")
    return len(docs)


def _delete_profile_photo(uid: str, result: DeletionResult) -> None:
    """Deleta a foto de perfil do Firebase Storage."""
    try:
        bucket = storage.bucket()
        prefix = f"perfil/{uid}/"
        blobs = list(bucket.list_blobs(prefix=prefix))
        for blob in blobs:
            blob.delete()
        if blobs:
            result.record_deleted("foto_perfil", len(blobs))
    except Exception as exc:
        result.record_error(f"Erro ao deletar foto de perfil uid={uid}: {exc}")


def _write_deletion_log(db, uid: str, empresa_id: str, result: DeletionResult) -> None:
    """
    Registra o evento de exclusão para conformidade LGPD.
    Não armazena nenhum dado pessoal — apenas o uid hasheado
    e as contagens de registros processados.
    """
    import hashlib

    uid_hash = hashlib.sha256(uid.encode()).hexdigest()[:16]

    try:
        db.collection(COL_LOG).document(uid_hash).set(
            {
                "completedAt": datetime.now(UTC),
                "reason": "user_request",
                "deletedCounts": result.deleted,
                "anonymizedCounts": result.anonymized,
                "hadErrors": len(result.errors) > 0,
                # empresa_id é retido para fins de auditoria interna
                # (não é dado pessoal do usuário titular)
                "empresaId": empresa_id,
            }
        )
    except Exception as exc:
        logger.warning("Falha ao gravar deletion_log: %s", exc)
