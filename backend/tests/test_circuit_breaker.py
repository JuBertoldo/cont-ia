"""Testes unitários para o CircuitBreaker."""

from unittest.mock import patch

from app.core.circuit_breaker import CircuitBreaker, CircuitState


class TestCircuitBreaker:
    def setup_method(self):
        self.cb = CircuitBreaker(name="test", failure_threshold=3, reset_timeout_s=60.0)

    def test_estado_inicial_e_closed(self):
        assert self.cb.state == CircuitState.CLOSED
        assert not self.cb.is_open()

    def test_falhas_abaixo_do_threshold_mantem_closed(self):
        self.cb.record_failure()
        self.cb.record_failure()
        assert self.cb.state == CircuitState.CLOSED

    def test_falhas_iguais_ao_threshold_abre_o_circuito(self):
        for _ in range(3):
            self.cb.record_failure()
        assert self.cb.state == CircuitState.OPEN
        assert self.cb.is_open()

    def test_sucesso_reseta_contagem_e_fecha_circuito(self):
        self.cb.record_failure()
        self.cb.record_failure()
        self.cb.record_success()
        assert self.cb.state == CircuitState.CLOSED
        assert self.cb._failure_count == 0

    def test_circuito_aberto_transiciona_para_half_open_apos_timeout(self):
        for _ in range(3):
            self.cb.record_failure()
        assert self.cb.state == CircuitState.OPEN

        # Simula passagem do tempo além do reset_timeout_s
        with patch("app.core.circuit_breaker.time.monotonic") as mock_time:
            mock_time.return_value = (self.cb._opened_at or 0) + 61.0
            assert self.cb.state == CircuitState.HALF_OPEN

    def test_sucesso_em_half_open_fecha_circuito(self):
        for _ in range(3):
            self.cb.record_failure()

        with patch("app.core.circuit_breaker.time.monotonic") as mock_time:
            mock_time.return_value = (self.cb._opened_at or 0) + 61.0
            assert self.cb.state == CircuitState.HALF_OPEN
            self.cb.record_success()

        assert self.cb.state == CircuitState.CLOSED

    def test_falha_em_half_open_reabre_circuito(self):
        for _ in range(3):
            self.cb.record_failure()

        with patch("app.core.circuit_breaker.time.monotonic") as mock_time:
            mock_time.return_value = (self.cb._opened_at or 0) + 61.0
            assert self.cb.state == CircuitState.HALF_OPEN
            self.cb.record_failure()

        assert self.cb.state == CircuitState.OPEN

    def test_circuito_aberto_nao_transiciona_antes_do_timeout(self):
        for _ in range(3):
            self.cb.record_failure()
        assert self.cb.state == CircuitState.OPEN
        # Sem mock de tempo — ainda dentro do timeout
        assert self.cb.state == CircuitState.OPEN
