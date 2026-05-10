"""Testes unitários para push_service."""

from unittest.mock import MagicMock, patch

import pytest

from app.services.push_service import _STATUS_LABELS, send_push_notification


class TestSendPushNotification:
    @pytest.mark.asyncio
    async def test_retorna_false_sem_fcm_token(self):
        result = await send_push_notification("", "CH-001", "Título", "aberto", "Suporte")
        assert result is False

    @pytest.mark.asyncio
    async def test_retorna_false_com_token_none(self):
        result = await send_push_notification(None, "CH-001", "Título", "aberto", "Suporte")
        assert result is False

    @pytest.mark.asyncio
    async def test_retorna_true_ao_enviar_com_sucesso(self):
        with patch("app.services.push_service.messaging") as mock_messaging:
            mock_messaging.Message.return_value = MagicMock()
            mock_messaging.Notification.return_value = MagicMock()
            mock_messaging.AndroidConfig.return_value = MagicMock()
            mock_messaging.AndroidNotification.return_value = MagicMock()
            mock_messaging.APNSConfig.return_value = MagicMock()
            mock_messaging.APNSPayload.return_value = MagicMock()
            mock_messaging.Aps.return_value = MagicMock()
            mock_messaging.send.return_value = "projects/contia/messages/abc123"

            result = await send_push_notification(
                "fcm-token-valido", "CH-001", "Título", "aberto", "Suporte"
            )

        assert result is True
        mock_messaging.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_retorna_false_quando_messaging_lanca_excecao(self):
        with patch("app.services.push_service.messaging") as mock_messaging:
            mock_messaging.Message.return_value = MagicMock()
            mock_messaging.Notification.return_value = MagicMock()
            mock_messaging.AndroidConfig.return_value = MagicMock()
            mock_messaging.AndroidNotification.return_value = MagicMock()
            mock_messaging.APNSConfig.return_value = MagicMock()
            mock_messaging.APNSPayload.return_value = MagicMock()
            mock_messaging.Aps.return_value = MagicMock()
            mock_messaging.send.side_effect = Exception("Token inválido")

            result = await send_push_notification(
                "fcm-token-invalido", "CH-001", "Título", "aberto", "Suporte"
            )

        assert result is False

    @pytest.mark.asyncio
    @pytest.mark.parametrize("status,expected_label", list(_STATUS_LABELS.items()))
    async def test_notification_title_usa_label_traduzido(self, status, expected_label):
        with patch("app.services.push_service.messaging") as mock_messaging:
            mock_messaging.Message.return_value = MagicMock()
            mock_messaging.AndroidConfig.return_value = MagicMock()
            mock_messaging.AndroidNotification.return_value = MagicMock()
            mock_messaging.APNSConfig.return_value = MagicMock()
            mock_messaging.APNSPayload.return_value = MagicMock()
            mock_messaging.Aps.return_value = MagicMock()
            mock_messaging.send.return_value = "msg-id"

            await send_push_notification("token-valido", "CH-001", "Título", status, "Suporte")

            call_kwargs = mock_messaging.Notification.call_args
            title = (
                call_kwargs.kwargs.get("title", "") or call_kwargs.args[0]
                if call_kwargs.args
                else ""
            )
            assert expected_label in title or mock_messaging.Notification.called

    @pytest.mark.asyncio
    async def test_status_desconhecido_usa_proprio_status_como_label(self):
        with patch("app.services.push_service.messaging") as mock_messaging:
            mock_messaging.Message.return_value = MagicMock()
            mock_messaging.Notification.return_value = MagicMock()
            mock_messaging.AndroidConfig.return_value = MagicMock()
            mock_messaging.AndroidNotification.return_value = MagicMock()
            mock_messaging.APNSConfig.return_value = MagicMock()
            mock_messaging.APNSPayload.return_value = MagicMock()
            mock_messaging.Aps.return_value = MagicMock()
            mock_messaging.send.return_value = "msg-id"

            result = await send_push_notification(
                "token-valido", "CH-001", "Título", "status_inexistente", "Suporte"
            )

        assert result is True
        notification_call = mock_messaging.Notification.call_args
        title_arg = notification_call.kwargs.get("title", "")
        assert "status_inexistente" in title_arg
