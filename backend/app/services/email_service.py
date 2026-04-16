"""
Serviço de envio de e-mail via SMTP.
Usa apenas a biblioteca padrão do Python (smtplib + ssl) — sem dependências extras.
"""

import asyncio
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Status com label e cor para o template HTML
_STATUS_INFO = {
    "aberto": ("Aberto", "#3b82f6"),
    "em_andamento": ("Em andamento", "#f59e0b"),
    "aguardando_cliente": ("Aguardando cliente", "#8b5cf6"),
    "resolvido": ("Resolvido", "#22c55e"),
}


def _build_ticket_html(
    numero: str,
    titulo: str,
    status: str,
    resposta: str,
    empresa: str,
    respondido_por: str,
) -> str:
    status_label, status_color = _STATUS_INFO.get(status, (status, "#888888"))
    resposta_block = (
        f"""
        <div style="background:#f0faf0;border-left:4px solid #00e676;
                    padding:16px;border-radius:4px;margin-top:16px;">
          <p style="margin:0;color:#333;font-size:14px;white-space:pre-wrap;">{resposta}</p>
        </div>
        """
        if resposta
        else "<p style='color:#888;font-size:13px;'>Sem resposta registrada.</p>"
    )

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:600px;margin:32px auto;background:#fff;
                    border-radius:8px;overflow:hidden;
                    box-shadow:0 2px 8px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a;padding:24px 32px;">
            <h1 style="color:#00e676;margin:0;font-size:22px;letter-spacing:2px;">
              CONT.IA
            </h1>
            <p style="color:#888;margin:4px 0 0;font-size:13px;">
              Sistema de Contagem Inteligente
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="color:#333;font-size:15px;margin-top:0;">
              Olá, <strong>{empresa}</strong>!
            </p>
            <p style="color:#555;font-size:14px;">
              O status do seu chamado foi atualizado.
            </p>

            <!-- Ticket info -->
            <table width="100%" style="border:1px solid #eee;border-radius:6px;
                                       border-collapse:collapse;margin-bottom:20px;">
              <tr style="background:#fafafa;">
                <td style="padding:12px 16px;font-size:12px;color:#888;
                           border-bottom:1px solid #eee;width:40%;">
                  Chamado
                </td>
                <td style="padding:12px 16px;font-size:13px;color:#333;
                           border-bottom:1px solid #eee;font-weight:bold;">
                  {numero}
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;font-size:12px;color:#888;
                           border-bottom:1px solid #eee;">
                  Assunto
                </td>
                <td style="padding:12px 16px;font-size:13px;color:#333;
                           border-bottom:1px solid #eee;">
                  {titulo}
                </td>
              </tr>
              <tr style="background:#fafafa;">
                <td style="padding:12px 16px;font-size:12px;color:#888;">
                  Novo status
                </td>
                <td style="padding:12px 16px;">
                  <span style="background:{status_color};color:#fff;
                               padding:4px 12px;border-radius:12px;
                               font-size:12px;font-weight:bold;">
                    {status_label}
                  </span>
                </td>
              </tr>
            </table>

            <!-- Resposta do suporte -->
            <p style="color:#333;font-size:14px;font-weight:bold;margin-bottom:8px;">
              Resposta do suporte:
            </p>
            {resposta_block}

            <p style="color:#888;font-size:12px;margin-top:24px;">
              Respondido por: <strong>{respondido_por}</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;padding:16px 32px;
                     border-top:1px solid #eee;text-align:center;">
            <p style="color:#aaa;font-size:11px;margin:0;">
              Cont.IA · Sistema de Auditoria de Inventário
            </p>
          </td>
        </tr>

      </table>
    </body>
    </html>
    """


def _send_sync(to_email: str, subject: str, html: str) -> None:
    """Envio SMTP síncrono — executa em thread para não bloquear o event loop."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_USER, to_email, msg.as_string())


async def send_ticket_notification(
    to_email: str,
    numero: str,
    titulo: str,
    status: str,
    resposta: str,
    empresa: str,
    respondido_por: str,
) -> bool:
    """
    Envia e-mail de notificação de ticket de forma assíncrona.
    Retorna True se enviou, False se falhou (não lança exceção — nunca bloqueia o fluxo principal).
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.debug("SMTP não configurado — notificação por e-mail ignorada.")
        return False

    if not to_email:
        logger.debug("E-mail do destinatário ausente — notificação ignorada.")
        return False

    try:
        status_label = _STATUS_INFO.get(status, (status, ""))[0]
        subject = f"[Cont.IA] Chamado {numero} — {status_label}"
        html = _build_ticket_html(numero, titulo, status, resposta, empresa, respondido_por)

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _send_sync, to_email, subject, html)

        logger.info(
            "E-mail de ticket enviado | para=%s numero=%s status=%s", to_email, numero, status
        )
        return True

    except Exception as exc:
        logger.warning("Falha ao enviar e-mail de ticket: %s", exc)
        return False
