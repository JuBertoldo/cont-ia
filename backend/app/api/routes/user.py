"""
Rotas de gerenciamento de conta do usuário.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.core.limiter import limiter
from app.core.logging import get_logger
from app.services.deletion_service import delete_user_account

router = APIRouter(prefix="/v1/user", tags=["user"])
logger = get_logger(__name__)


@router.delete(
    "/account",
    status_code=status.HTTP_200_OK,
    summary="Exclui a conta do usuário autenticado (LGPD art. 18, II)",
)
@limiter.limit("3/hour")  # máx 3 tentativas por hora — exclusão é irreversível
async def delete_account(request: Request, user: dict = Depends(get_current_user)):
    """
    Remove todos os dados pessoais do usuário autenticado, conforme LGPD.

    - Dados pessoais (perfil, notificações, métricas, foto) → **deletados**
    - Registros de inventário e audit de login → **anonimizados** (obrigação fiscal)
    - Fotos de scan → mantidas (ligadas ao inventário anonimizado)
    - Evento de exclusão → registrado em /deletion_log sem dados pessoais
    """
    uid = user.get("uid")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não autenticado.",
        )

    logger.info("Solicitação de exclusão de conta | uid=%s", uid)

    result = await delete_user_account(uid)

    if not result.to_dict()["success"]:
        logger.error("Exclusão com erros | uid=%s | erros=%s", uid, result.errors)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "message": "Exclusão parcialmente concluída. Contate o suporte.",
                "errors": result.errors,
            },
        )

    return {
        "message": "Conta excluída com sucesso.",
        "deleted": result.deleted,
        "anonymized": result.anonymized,
    }
