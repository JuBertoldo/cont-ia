"""
Serviço de Push Notifications via Firebase Cloud Messaging (FCM).
Usa o Firebase Admin SDK já inicializado no main.py.
"""

from firebase_admin import messaging

from app.core.logging import get_logger

logger = get_logger(__name__)

_STATUS_LABELS = {
    "aberto": "Aberto",
    "em_andamento": "Em andamento",
    "aguardando_cliente": "Aguardando sua resposta",
    "resolvido": "Resolvido",
}


async def send_push_notification(
    fcm_token: str,
    numero: str,
    titulo: str,
    status: str,
    respondido_por: str,
) -> bool:
    """
    Envia push notification para o dispositivo do admin via FCM.
    Retorna True se enviou, False em caso de falha (nunca lança exceção).
    """
    if not fcm_token:
        logger.debug("FCM token ausente — push notification ignorado.")
        return False

    status_label = _STATUS_LABELS.get(status, status)

    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=f"Chamado {numero} — {status_label}",
                body=f"{titulo} · Respondido por {respondido_por}",
            ),
            data={
                "numero": numero,
                "status": status,
                "tipo": "ticket_update",
            },
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    color="#00E676",
                    sound="default",
                    channel_id="contia_tickets",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        sound="default",
                        badge=1,
                    )
                )
            ),
        )

        messaging.send(message)
        logger.info(
            "Push notification enviado | numero=%s status=%s",
            numero,
            status,
        )
        return True

    except Exception as exc:
        logger.warning("Falha ao enviar push notification: %s", exc)
        return False
