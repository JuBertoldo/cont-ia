from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.core.logging import get_logger
from app.schemas.notify import NotifyTicketRequest
from app.services.email_service import send_ticket_notification

router = APIRouter(prefix="/v1", tags=["notify"])
logger = get_logger(__name__)


@router.post(
    "/notify/ticket",
    status_code=status.HTTP_200_OK,
    summary="Envia e-mail de notificação quando status do chamado muda",
)
async def notify_ticket(
    payload: NotifyTicketRequest,
    user: dict = Depends(get_current_user),
):
    sent = await send_ticket_notification(
        to_email=payload.admin_email,
        numero=payload.numero,
        titulo=payload.titulo,
        status=payload.status,
        resposta=payload.resposta,
        empresa=payload.empresa_nome,
        respondido_por=payload.respondido_por,
    )

    logger.info(
        "Notificação de ticket | uid=%s numero=%s para=%s enviado=%s",
        user.get("uid"),
        payload.numero,
        payload.admin_email,
        sent,
    )

    return {"sent": sent, "numero": payload.numero}
