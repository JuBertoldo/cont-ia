import asyncio

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user
from app.core.logging import get_logger
from app.schemas.notify import NotifyTicketRequest
from app.services.email_service import send_ticket_notification
from app.services.push_service import send_push_notification

router = APIRouter(prefix="/v1", tags=["notify"])
logger = get_logger(__name__)


@router.post(
    "/notify/ticket",
    status_code=status.HTTP_200_OK,
    summary="Envia e-mail e push notification quando status do chamado muda",
)
async def notify_ticket(
    payload: NotifyTicketRequest,
    user: dict = Depends(get_current_user),
):
    # Dispara e-mail e push em paralelo — falhas são silenciosas
    email_sent, push_sent = await asyncio.gather(
        send_ticket_notification(
            to_email=payload.admin_email,
            numero=payload.numero,
            titulo=payload.titulo,
            status=payload.status,
            resposta=payload.resposta,
            empresa=payload.empresa_nome,
            respondido_por=payload.respondido_por,
        ),
        send_push_notification(
            fcm_token=payload.admin_fcm_token,
            numero=payload.numero,
            titulo=payload.titulo,
            status=payload.status,
            respondido_por=payload.respondido_por,
        ),
    )

    logger.info(
        "Notificação de ticket | uid=%s numero=%s email=%s push=%s",
        user.get("uid"),
        payload.numero,
        email_sent,
        push_sent,
    )

    return {"email_sent": email_sent, "push_sent": push_sent, "numero": payload.numero}
