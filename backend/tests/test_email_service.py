"""Testes unitários para email_service."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.email_service import (
    _STATUS_INFO,
    _build_ticket_html,
    send_ticket_notification,
)

# ─── _build_ticket_html ───────────────────────────────────────────────────────


class TestBuildTicketHtml:
    def test_contem_numero_do_chamado(self):
        html = _build_ticket_html("CH-001", "Título", "aberto", "", "Empresa X", "Suporte")
        assert "CH-001" in html

    def test_contem_titulo(self):
        html = _build_ticket_html("CH-001", "Meu Chamado", "aberto", "", "Empresa X", "Suporte")
        assert "Meu Chamado" in html

    def test_contem_status_label_traduzido(self):
        html = _build_ticket_html("CH-001", "Título", "em_andamento", "", "Empresa X", "Suporte")
        assert "Em andamento" in html

    def test_contem_empresa(self):
        html = _build_ticket_html("CH-001", "Título", "aberto", "", "Distribuidora ABC", "Suporte")
        assert "Distribuidora ABC" in html

    def test_contem_respondido_por(self):
        html = _build_ticket_html("CH-001", "Título", "aberto", "", "Empresa X", "Fulano")
        assert "Fulano" in html

    def test_com_resposta_exibe_bloco_de_resposta(self):
        html = _build_ticket_html(
            "CH-001", "Título", "resolvido", "Problema corrigido.", "Empresa X", "Suporte"
        )
        assert "Problema corrigido." in html

    def test_sem_resposta_exibe_placeholder(self):
        html = _build_ticket_html("CH-001", "Título", "aberto", "", "Empresa X", "Suporte")
        assert "Sem resposta registrada." in html

    def test_status_desconhecido_usa_fallback_de_cor(self):
        html = _build_ticket_html(
            "CH-001", "Título", "status_inexistente", "", "Empresa X", "Suporte"
        )
        assert "#888888" in html

    @pytest.mark.parametrize("status,expected_label", list(_STATUS_INFO.items()))
    def test_todos_os_status_conhecidos(self, status, expected_label):
        html = _build_ticket_html("CH-001", "Título", status, "", "Empresa X", "Suporte")
        assert expected_label[0] in html


# ─── send_ticket_notification ────────────────────────────────────────────────


class TestSendTicketNotification:
    @pytest.mark.asyncio
    async def test_retorna_false_sem_smtp_configurado(self):
        with patch("app.services.email_service.settings") as mock_settings:
            mock_settings.SMTP_USER = ""
            mock_settings.SMTP_PASSWORD = ""
            result = await send_ticket_notification(
                "admin@empresa.com", "CH-001", "Título", "aberto", "", "Empresa", "Suporte"
            )
        assert result is False

    @pytest.mark.asyncio
    async def test_retorna_false_sem_destinatario(self):
        with patch("app.services.email_service.settings") as mock_settings:
            mock_settings.SMTP_USER = "smtp@contia.com"
            mock_settings.SMTP_PASSWORD = "senha"
            result = await send_ticket_notification(
                "", "CH-001", "Título", "aberto", "", "Empresa", "Suporte"
            )
        assert result is False

    @pytest.mark.asyncio
    async def test_retorna_true_ao_enviar_com_sucesso(self):
        with (
            patch("app.services.email_service.settings") as mock_settings,
            patch("app.services.email_service.asyncio") as mock_asyncio,
        ):
            mock_settings.SMTP_USER = "smtp@contia.com"
            mock_settings.SMTP_PASSWORD = "senha"
            mock_loop = MagicMock()
            mock_asyncio.get_running_loop.return_value = mock_loop
            mock_loop.run_in_executor = AsyncMock(return_value=None)

            result = await send_ticket_notification(
                "admin@empresa.com", "CH-001", "Título", "aberto", "", "Empresa", "Suporte"
            )
        assert result is True

    @pytest.mark.asyncio
    async def test_retorna_false_quando_smtp_lanca_excecao(self):
        with (
            patch("app.services.email_service.settings") as mock_settings,
            patch("app.services.email_service.asyncio") as mock_asyncio,
        ):
            mock_settings.SMTP_USER = "smtp@contia.com"
            mock_settings.SMTP_PASSWORD = "senha"
            mock_loop = MagicMock()
            mock_asyncio.get_running_loop.return_value = mock_loop
            mock_loop.run_in_executor = AsyncMock(side_effect=Exception("Conexão recusada"))

            result = await send_ticket_notification(
                "admin@empresa.com", "CH-001", "Título", "aberto", "", "Empresa", "Suporte"
            )
        assert result is False

    @pytest.mark.asyncio
    async def test_subject_usa_status_label_traduzido(self):
        with (
            patch("app.services.email_service.settings") as mock_settings,
            patch("app.services.email_service.asyncio") as mock_asyncio,
        ):
            mock_settings.SMTP_USER = "smtp@contia.com"
            mock_settings.SMTP_PASSWORD = "senha"
            mock_loop = MagicMock()
            mock_asyncio.get_running_loop.return_value = mock_loop

            captured = {}

            async def capture_executor(executor, fn, *args):
                captured["args"] = args
                return None

            mock_loop.run_in_executor = capture_executor

            await send_ticket_notification(
                "admin@empresa.com", "CH-002", "Assunto", "resolvido", "", "Empresa", "Suporte"
            )

        # O subject e html são passados para _send_sync como args[1] e args[2]
        assert captured.get("args") is not None
        subject = captured["args"][1]
        assert "Resolvido" in subject
        assert "CH-002" in subject
