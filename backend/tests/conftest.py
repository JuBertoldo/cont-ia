"""
Fixtures globais para os testes do backend.

- mock_firebase_init: impede a inicialização real do Firebase Admin SDK
- override_auth: substitui get_current_user por um usuário fake em todos os testes de endpoint
"""

from unittest.mock import MagicMock, patch

import pytest


@pytest.fixture(autouse=True, scope="session")
def mock_firebase_init():
    """Evita que o lifespan tente carregar o service account de verdade."""
    with (
        patch("app.main.credentials.Certificate", return_value=MagicMock()),
        patch("app.main.firebase_admin.initialize_app", return_value=MagicMock()),
    ):
        yield


@pytest.fixture(autouse=True)
def override_auth():
    """Sobrescreve get_current_user para todos os testes de endpoint."""
    from app.api.deps import get_current_user
    from app.main import app

    app.dependency_overrides[get_current_user] = lambda: {
        "uid": "test-uid-123",
        "email": "test@contia.com",
    }
    yield
    app.dependency_overrides.pop(get_current_user, None)
