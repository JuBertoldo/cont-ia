"""Testes unitários para o script de limpeza do Firebase Storage."""

from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

sys_path_patch = patch("sys.path")

# ── Helpers para criar documentos Firestore falsos ───────────────────────────


def _make_doc(doc_id: str, data: dict):
    doc = MagicMock()
    doc.id = doc_id
    doc.to_dict.return_value = data
    return doc


def _foto_url(path: str) -> str:
    return f"https://firebasestorage.googleapis.com/v0/b/proj.firebasestorage.app/o/{path.replace('/', '%2F')}?alt=media"


def _days_ago(days: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=days)


# ── _storage_path_from_url ────────────────────────────────────────────────────


class TestStoragePathFromUrl:
    def setup_method(self):
        import importlib.util
        import os

        spec = importlib.util.spec_from_file_location(
            "cleanup_storage",
            os.path.join(os.path.dirname(__file__), "../../scripts/cleanup_storage.py"),
        )
        self.mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.mod)

    def test_extrai_path_de_url_valida(self):
        url = _foto_url("scans/uid123/timestamp.jpg")
        result = self.mod._storage_path_from_url(url)
        assert result == "scans/uid123/timestamp.jpg"

    def test_extrai_path_de_perfil(self):
        url = _foto_url("perfil/uid123/avatar.jpg")
        result = self.mod._storage_path_from_url(url)
        assert result == "perfil/uid123/avatar.jpg"

    def test_retorna_none_para_url_invalida(self):
        result = self.mod._storage_path_from_url("https://example.com/foto.jpg")
        assert result is None

    def test_retorna_none_para_string_vazia(self):
        result = self.mod._storage_path_from_url("")
        assert result is None


# ── cleanup_rejected_dataset_scans ───────────────────────────────────────────


class TestCleanupRejectedDatasetScans:
    def setup_method(self):
        import importlib.util
        import os

        spec = importlib.util.spec_from_file_location(
            "cleanup_storage",
            os.path.join(os.path.dirname(__file__), "../../scripts/cleanup_storage.py"),
        )
        self.mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.mod)

    def _run(self, docs, dry_run=True):
        db = MagicMock()
        bucket = MagicMock()
        bucket.name = "proj.firebasestorage.app"

        query_mock = MagicMock()
        query_mock.stream.return_value = docs
        db.collection.return_value.where.return_value.where.return_value = query_mock

        blob_mock = MagicMock()
        bucket.blob.return_value = blob_mock

        return self.mod.cleanup_rejected_dataset_scans(db, bucket, dry_run), db, bucket, blob_mock

    def test_sem_candidatos_retorna_zeros(self):
        result, *_ = self._run([])
        assert result == {"candidates": 0, "deleted": 0, "skipped": 0, "errors": 0}

    def test_dry_run_nao_chama_delete(self):
        doc = _make_doc(
            "doc1",
            {
                "fotoUrl": _foto_url("scans/u1/foto.jpg"),
                "createdAt": _days_ago(100),
                "empresaId": "emp1",
                "statusDataset": "rejeitado",
            },
        )
        result, _, bucket, blob = self._run([doc], dry_run=True)
        blob.delete.assert_not_called()
        assert result["deleted"] == 1  # contabiliza como "deletaria"

    def test_execucao_real_chama_delete(self):
        doc = _make_doc(
            "doc1",
            {
                "fotoUrl": _foto_url("scans/u1/foto.jpg"),
                "createdAt": _days_ago(100),
                "empresaId": "emp1",
                "statusDataset": "rejeitado",
            },
        )
        result, db, bucket, blob = self._run([doc], dry_run=False)
        blob.delete.assert_called_once()
        assert result["deleted"] == 1
        assert result["errors"] == 0

    def test_pula_doc_sem_foto_url(self):
        doc = _make_doc(
            "doc1",
            {
                "fotoUrl": "",
                "createdAt": _days_ago(100),
                "statusDataset": "rejeitado",
            },
        )
        result, *_ = self._run([doc])
        assert result["skipped"] == 1
        assert result["deleted"] == 0

    def test_contabiliza_erro_quando_delete_falha(self):
        doc = _make_doc(
            "doc1",
            {
                "fotoUrl": _foto_url("scans/u1/foto.jpg"),
                "createdAt": _days_ago(100),
                "statusDataset": "rejeitado",
            },
        )
        _, _, bucket, blob = self._run([], dry_run=False)
        blob.delete.side_effect = Exception("Not Found")

        db = MagicMock()
        query_mock = MagicMock()
        query_mock.stream.return_value = [doc]
        db.collection.return_value.where.return_value.where.return_value = query_mock
        bucket.blob.return_value = blob

        result = self.mod.cleanup_rejected_dataset_scans(db, bucket, dry_run=False)
        assert result["errors"] == 1
        assert result["deleted"] == 0


# ── cleanup_deactivated_user_profiles ────────────────────────────────────────


class TestCleanupDeactivatedUserProfiles:
    def setup_method(self):
        import importlib.util
        import os

        spec = importlib.util.spec_from_file_location(
            "cleanup_storage",
            os.path.join(os.path.dirname(__file__), "../../scripts/cleanup_storage.py"),
        )
        self.mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.mod)

    def _run(self, docs, dry_run=True):
        db = MagicMock()
        bucket = MagicMock()
        bucket.name = "proj.firebasestorage.app"
        query_mock = MagicMock()
        query_mock.stream.return_value = docs
        db.collection.return_value.where.return_value.where.return_value = query_mock
        blob_mock = MagicMock()
        bucket.blob.return_value = blob_mock
        return (
            self.mod.cleanup_deactivated_user_profiles(db, bucket, dry_run),
            db,
            bucket,
            blob_mock,
        )

    def test_sem_candidatos_retorna_zeros(self):
        result, *_ = self._run([])
        assert result == {"candidates": 0, "deleted": 0, "skipped": 0, "errors": 0}

    def test_pula_foto_de_url_externa(self):
        doc = _make_doc(
            "uid1",
            {
                "photoURL": "https://lh3.googleusercontent.com/photo.jpg",
                "updatedAt": _days_ago(100),
                "status": "rejected",
                "email": "user@test.com",
            },
        )
        result, *_ = self._run([doc])
        assert result["skipped"] == 1

    def test_pula_sem_photo_url(self):
        doc = _make_doc(
            "uid1",
            {
                "photoURL": "",
                "updatedAt": _days_ago(100),
                "status": "rejected",
            },
        )
        result, *_ = self._run([doc])
        assert result["skipped"] == 1

    def test_deleta_foto_de_perfil_local(self):
        doc = _make_doc(
            "uid1",
            {
                "photoURL": _foto_url("perfil/uid1/avatar.jpg"),
                "updatedAt": _days_ago(100),
                "status": "rejected",
                "email": "user@test.com",
            },
        )
        result, _, _, blob = self._run([doc], dry_run=False)
        blob.delete.assert_called_once()
        assert result["deleted"] == 1

    def test_dry_run_nao_deleta(self):
        doc = _make_doc(
            "uid1",
            {
                "photoURL": _foto_url("perfil/uid1/avatar.jpg"),
                "updatedAt": _days_ago(100),
                "status": "rejected",
                "email": "user@test.com",
            },
        )
        result, _, _, blob = self._run([doc], dry_run=True)
        blob.delete.assert_not_called()
        assert result["deleted"] == 1
