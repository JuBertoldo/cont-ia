"""Testes unitários para deletion_service."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.deletion_service import (
    DeletionResult,
    _anonymize_inventory,
    _anonymize_login_audit,
    _delete_collection_where,
    _delete_profile_photo,
    delete_user_account,
)

# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_doc(doc_id="doc1"):
    doc = MagicMock()
    doc.id = doc_id
    doc.reference = MagicMock()
    return doc


def _make_db(docs=None):
    db = MagicMock()
    query = MagicMock()
    query.stream.return_value = docs or []
    db.collection.return_value.where.return_value = query
    db.collection.return_value.document.return_value.get.return_value = MagicMock(
        exists=True, to_dict=lambda: {"empresaId": "emp-1"}
    )
    db.batch.return_value = MagicMock()
    return db


# ── DeletionResult ────────────────────────────────────────────────────────────


class TestDeletionResult:
    def test_estado_inicial_vazio(self):
        result = DeletionResult()
        assert result.deleted == {}
        assert result.anonymized == {}
        assert result.errors == []

    def test_record_deleted_acumula(self):
        result = DeletionResult()
        result.record_deleted("notificacoes", 3)
        result.record_deleted("notificacoes", 2)
        assert result.deleted["notificacoes"] == 5

    def test_record_anonymized(self):
        result = DeletionResult()
        result.record_anonymized("inventario", 10)
        assert result.anonymized["inventario"] == 10

    def test_to_dict_success_true_sem_erros(self):
        result = DeletionResult()
        assert result.to_dict()["success"] is True

    def test_to_dict_success_false_com_erros(self):
        result = DeletionResult()
        result.record_error("Algo falhou")
        assert result.to_dict()["success"] is False


# ── _delete_collection_where ──────────────────────────────────────────────────


class TestDeleteCollectionWhere:
    def test_sem_documentos_retorna_zero(self):
        db = _make_db([])
        result = DeletionResult()
        count = _delete_collection_where(
            db, "notificacoes", "paraUid", "==", "uid1", result, "notificacoes"
        )
        assert count == 0
        assert result.deleted == {}

    def test_deleta_documentos_e_registra(self):
        docs = [_make_doc("n1"), _make_doc("n2")]
        db = _make_db(docs)
        result = DeletionResult()
        count = _delete_collection_where(
            db, "notificacoes", "paraUid", "==", "uid1", result, "notificacoes"
        )
        assert count == 2
        assert result.deleted["notificacoes"] == 2
        db.batch.return_value.commit.assert_called_once()

    def test_registra_erro_quando_commit_falha(self):
        docs = [_make_doc()]
        db = _make_db(docs)
        db.batch.return_value.commit.side_effect = Exception("Firestore error")
        result = DeletionResult()
        _delete_collection_where(
            db, "notificacoes", "paraUid", "==", "uid1", result, "notificacoes"
        )
        assert len(result.errors) == 1
        assert "notificacoes" in result.errors[0]


# ── _anonymize_inventory ──────────────────────────────────────────────────────


class TestAnonymizeInventory:
    def test_sem_documentos_retorna_zero(self):
        db = _make_db([])
        result = DeletionResult()
        count = _anonymize_inventory(db, "uid1", result)
        assert count == 0

    def test_anonimiza_campos_pessoais(self):
        docs = [_make_doc("inv1"), _make_doc("inv2")]
        db = _make_db(docs)
        result = DeletionResult()
        count = _anonymize_inventory(db, "uid1", result)
        assert count == 2
        assert result.anonymized.get("inventario") == 2
        # Verifica que os campos corretos foram anonimizados
        update_calls = db.batch.return_value.update.call_args_list
        for c in update_calls:
            data = c.args[1]
            assert data["usuarioId"] == ""
            assert data["usuarioNome"] == "Usuário removido"
            assert "lgpdAnonymizedAt" in data


# ── _anonymize_login_audit ────────────────────────────────────────────────────


class TestAnonymizeLoginAudit:
    def test_anonimiza_uid_e_email(self):
        docs = [_make_doc("audit1")]
        db = _make_db(docs)
        result = DeletionResult()
        _anonymize_login_audit(db, "uid1", result)
        update_call = db.batch.return_value.update.call_args
        data = update_call.args[1]
        assert data["uid"] == ""
        assert data["email"] == "removido@lgpd"
        assert "lgpdAnonymizedAt" in data


# ── _delete_profile_photo ─────────────────────────────────────────────────────


class TestDeleteProfilePhoto:
    def test_deleta_blobs_do_perfil(self):
        bucket = MagicMock()
        blob1, blob2 = MagicMock(), MagicMock()
        bucket.list_blobs.return_value = [blob1, blob2]
        result = DeletionResult()

        with patch("app.services.deletion_service.storage") as mock_storage:
            mock_storage.bucket.return_value = bucket
            _delete_profile_photo("uid1", result)

        bucket.list_blobs.assert_called_once_with(prefix="perfil/uid1/")
        blob1.delete.assert_called_once()
        blob2.delete.assert_called_once()
        assert result.deleted["foto_perfil"] == 2

    def test_sem_blobs_nao_registra(self):
        bucket = MagicMock()
        bucket.list_blobs.return_value = []
        result = DeletionResult()

        with patch("app.services.deletion_service.storage") as mock_storage:
            mock_storage.bucket.return_value = bucket
            _delete_profile_photo("uid1", result)

        assert "foto_perfil" not in result.deleted


# ── delete_user_account ───────────────────────────────────────────────────────


class TestDeleteUserAccount:
    @pytest.mark.asyncio
    async def test_fluxo_completo_sem_erros(self):
        db = _make_db([])  # sem dados — simplifica o teste de integração
        bucket = MagicMock()
        bucket.list_blobs.return_value = []

        with (
            patch("app.services.deletion_service.firestore") as mock_fs,
            patch("app.services.deletion_service.storage") as mock_storage,
            patch("app.services.deletion_service.firebase_auth") as mock_auth,
        ):
            mock_fs.client.return_value = db
            mock_storage.bucket.return_value = bucket
            mock_auth.delete_user = MagicMock()

            result = await delete_user_account("uid-test")

        assert result.to_dict()["success"] is True
        mock_auth.delete_user.assert_called_once_with("uid-test")

    @pytest.mark.asyncio
    async def test_usuario_nao_encontrado_no_auth_nao_e_erro(self):
        from firebase_admin.auth import UserNotFoundError

        db = _make_db([])
        bucket = MagicMock()
        bucket.list_blobs.return_value = []

        with (
            patch("app.services.deletion_service.firestore") as mock_fs,
            patch("app.services.deletion_service.storage") as mock_storage,
            patch("app.services.deletion_service.firebase_auth") as mock_auth,
        ):
            mock_fs.client.return_value = db
            mock_storage.bucket.return_value = bucket
            mock_auth.delete_user.side_effect = UserNotFoundError("not found")
            mock_auth.UserNotFoundError = UserNotFoundError

            result = await delete_user_account("uid-test")

        # UserNotFoundError não deve gerar erro — conta já deletada
        assert result.to_dict()["success"] is True
