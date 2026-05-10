"""
Cont.IA — Política de Retenção de Fotos no Firebase Storage
=============================================================

Política implementada (baseada no Código Tributário Nacional e LGPD):

  ┌─────────────────────────────────────────────────────────────────────┐
  │  Tipo de dado                         │  Retenção                  │
  ├─────────────────────────────────────────────────────────────────────┤
  │  Fotos de scan confirmado (inventário)│  5 anos (CTN art. 173)     │
  │  Fotos de scan rejeitado (dataset)    │  90 dias                   │
  │  Fotos de perfil (usuário desativado) │  90 dias após desativação  │
  └─────────────────────────────────────────────────────────────────────┘

Uso:
    # Modo seguro — apenas mostra o que seria deletado (padrão)
    python scripts/cleanup_storage.py --dry-run

    # Execução real
    python scripts/cleanup_storage.py

    # Forçar execução em produção (requer confirmação explícita)
    python scripts/cleanup_storage.py --env production

Pré-requisitos:
    pip install firebase-admin
    export FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from urllib.parse import unquote, urlparse

import firebase_admin
from firebase_admin import credentials, firestore, storage

# ── Constantes de retenção ───────────────────────────────────────────────────

RETENTION_CONFIRMED_SCAN_YEARS = 5    # fotos de inventário confirmado
RETENTION_REJECTED_SCAN_DAYS   = 90   # scans rejeitados do dataset
RETENTION_PROFILE_DAYS         = 90   # fotos de perfil após desativação

# ── Coleções Firestore ────────────────────────────────────────────────────────

COL_INVENTARIO = "inventario"
COL_USUARIOS   = "usuarios"

# ── Helpers ───────────────────────────────────────────────────────────────────

def _init_firebase(service_account_path: str) -> None:
    if not firebase_admin._apps:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, {
            "storageBucket": _get_bucket_name(service_account_path),
        })


def _get_bucket_name(service_account_path: str) -> str:
    """Deriva o nome do bucket a partir do project_id no service account."""
    import json
    with open(service_account_path) as f:
        data = json.load(f)
    return f"{data['project_id']}.firebasestorage.app"


def _storage_path_from_url(foto_url: str) -> str | None:
    """
    Extrai o caminho relativo no Storage a partir de uma download URL do Firebase.
    Ex.: https://firebasestorage.googleapis.com/v0/b/proj.../o/scans%2F...jpg?...
    Retorna: scans/uid/timestamp.jpg
    """
    try:
        parsed = urlparse(foto_url)
        # O caminho está em /v0/b/{bucket}/o/{path_encoded}
        parts = parsed.path.split("/o/", 1)
        if len(parts) == 2:
            return unquote(parts[1])
    except Exception:
        pass
    return None


def _delete_storage_file(path: str, dry_run: bool, bucket) -> bool:
    """Deleta um arquivo do Storage. Retorna True se deletado (ou dry_run)."""
    if dry_run:
        print(f"  [DRY-RUN] deletaria: gs://{bucket.name}/{path}")
        return True
    try:
        blob = bucket.blob(path)
        blob.delete()
        print(f"  [DELETADO] gs://{bucket.name}/{path}")
        return True
    except Exception as exc:
        print(f"  [ERRO] Não foi possível deletar {path}: {exc}")
        return False


def _clear_foto_url(db, collection: str, doc_id: str, dry_run: bool) -> None:
    """Limpa o campo fotoUrl do documento Firestore após deletar o arquivo."""
    if dry_run:
        return
    db.collection(collection).document(doc_id).update({
        "fotoUrl": "",
        "storageCleanedAt": datetime.now(timezone.utc),
    })


# ── Rotinas de limpeza ────────────────────────────────────────────────────────

def cleanup_rejected_dataset_scans(db, bucket, dry_run: bool) -> dict:
    """
    Deleta fotos de scans com statusDataset='rejeitado' e mais de 90 dias.
    Esses scans não têm valor de auditoria fiscal.
    """
    print("\n── Scans rejeitados do dataset (> 90 dias) ──────────────────────")
    cutoff = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    from datetime import timedelta
    cutoff = cutoff - timedelta(days=RETENTION_REJECTED_SCAN_DAYS)

    query = (
        db.collection(COL_INVENTARIO)
        .where("statusDataset", "==", "rejeitado")
        .where("createdAt", "<", cutoff)
    )

    docs = list(query.stream())
    deleted = skipped = errors = 0

    for doc in docs:
        data = doc.to_dict()
        foto_url = data.get("fotoUrl", "")
        created = data.get("createdAt")
        created_str = created.strftime("%Y-%m-%d") if created else "?"

        if not foto_url:
            skipped += 1
            continue

        path = _storage_path_from_url(foto_url)
        if not path:
            print(f"  [AVISO] URL inválida no doc {doc.id}: {foto_url[:60]}...")
            skipped += 1
            continue

        print(f"  Doc {doc.id} | criado: {created_str} | empresa: {data.get('empresaId','?')}")
        if _delete_storage_file(path, dry_run, bucket):
            _clear_foto_url(db, COL_INVENTARIO, doc.id, dry_run)
            deleted += 1
        else:
            errors += 1

    print(f"  Total: {len(docs)} candidatos | {deleted} deletados | {skipped} sem foto | {errors} erros")
    return {"candidates": len(docs), "deleted": deleted, "skipped": skipped, "errors": errors}


def cleanup_deactivated_user_profiles(db, bucket, dry_run: bool) -> dict:
    """
    Deleta fotos de perfil de usuários com status='rejected' há mais de 90 dias.
    """
    print("\n── Fotos de perfil (usuários rejeitados > 90 dias) ──────────────")
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_PROFILE_DAYS)

    query = (
        db.collection(COL_USUARIOS)
        .where("status", "==", "rejected")
        .where("updatedAt", "<", cutoff)
    )

    docs = list(query.stream())
    deleted = skipped = errors = 0

    for doc in docs:
        data = doc.to_dict()
        photo_url = data.get("photoURL", "")
        updated = data.get("updatedAt")
        updated_str = updated.strftime("%Y-%m-%d") if updated else "?"

        if not photo_url or "firebasestorage" not in photo_url:
            skipped += 1
            continue

        path = _storage_path_from_url(photo_url)
        if not path or not path.startswith("perfil/"):
            skipped += 1
            continue

        print(f"  Doc {doc.id} | rejeitado em: {updated_str} | {data.get('email','?')}")
        if _delete_storage_file(path, dry_run, bucket):
            if not dry_run:
                db.collection(COL_USUARIOS).document(doc.id).update({
                    "photoURL": "",
                    "storageCleanedAt": datetime.now(timezone.utc),
                })
            deleted += 1
        else:
            errors += 1

    print(f"  Total: {len(docs)} candidatos | {deleted} deletados | {skipped} sem foto local | {errors} erros")
    return {"candidates": len(docs), "deleted": deleted, "skipped": skipped, "errors": errors}


def report_confirmed_scans(db) -> None:
    """
    Apenas informa quantos scans confirmados existem e quando o mais antigo expira.
    Não deleta nada — retenção de 5 anos.
    """
    print("\n── Scans confirmados (retenção 5 anos — sem ação) ───────────────")
    from datetime import timedelta

    # Conta total de scans com fotoUrl preenchida
    query = db.collection(COL_INVENTARIO).where("fotoUrl", "!=", "")
    docs = list(query.stream())

    oldest = None
    for doc in docs:
        data = doc.to_dict()
        created = data.get("createdAt")
        if created and (oldest is None or created < oldest):
            oldest = created

    if oldest:
        expiry = oldest + timedelta(days=365 * RETENTION_CONFIRMED_SCAN_YEARS)
        print(f"  {len(docs)} fotos de inventário armazenadas")
        print(f"  Mais antiga: {oldest.strftime('%Y-%m-%d')}")
        print(f"  Expira em:   {expiry.strftime('%Y-%m-%d')} (5 anos — CTN art. 173)")
    else:
        print("  Nenhum scan confirmado com foto encontrado.")


# ── Ponto de entrada ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Limpeza de fotos do Firebase Storage conforme política de retenção do Cont.IA"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Modo seguro: apenas mostra o que seria deletado (padrão)",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        default=False,
        help="Executa a limpeza real (sem este flag, roda em dry-run)",
    )
    parser.add_argument(
        "--env",
        default="development",
        help="Ambiente: development | production",
    )
    args = parser.parse_args()

    dry_run = not args.execute

    if not dry_run and args.env == "production":
        print("⚠️  Você está prestes a deletar arquivos em PRODUÇÃO.")
        confirm = input("Digite 'CONFIRMO' para continuar: ")
        if confirm != "CONFIRMO":
            print("Abortado.")
            sys.exit(0)

    service_account = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH",
        "firebase-service-account.json",
    )

    if not os.path.exists(service_account):
        print(f"Erro: arquivo não encontrado: {service_account}")
        sys.exit(1)

    print("=" * 60)
    print("Cont.IA — Limpeza de Storage")
    print(f"Modo: {'DRY-RUN (sem exclusões reais)' if dry_run else '⚠️  EXECUÇÃO REAL'}")
    print(f"Data: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)

    _init_firebase(service_account)
    db = firestore.client()
    bucket = storage.bucket()

    results = {}
    results["rejected_scans"] = cleanup_rejected_dataset_scans(db, bucket, dry_run)
    results["deactivated_profiles"] = cleanup_deactivated_user_profiles(db, bucket, dry_run)
    report_confirmed_scans(db)

    total_deleted = sum(r["deleted"] for r in results.values())
    total_errors  = sum(r["errors"]  for r in results.values())

    print("\n" + "=" * 60)
    print(f"Resumo: {total_deleted} arquivo(s) {'seriam deletados' if dry_run else 'deletados'} | {total_errors} erro(s)")
    if dry_run:
        print("Para executar de verdade: python cleanup_storage.py --execute")
    print("=" * 60)


if __name__ == "__main__":
    main()
