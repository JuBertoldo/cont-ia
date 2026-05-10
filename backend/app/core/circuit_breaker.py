"""
Circuit Breaker genérico para serviços externos.

Estados:
  CLOSED   — funcionando normalmente; requisições passam.
  OPEN     — muitas falhas; requisições bloqueadas por `reset_timeout_s`.
  HALF_OPEN — após o timeout, uma requisição de teste é permitida.
              Sucesso → CLOSED. Falha → OPEN novamente.

Uso:
    breaker = CircuitBreaker(name="roboflow", failure_threshold=3, reset_timeout_s=60)

    if breaker.is_open():
        return []  # falha rápida sem chamar o serviço

    try:
        result = await call_external_service()
        breaker.record_success()
        return result
    except Exception as exc:
        breaker.record_failure()
        raise
"""

import time
from enum import Enum

from app.core.logging import get_logger

logger = get_logger(__name__)


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,
        reset_timeout_s: float = 60.0,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.reset_timeout_s = reset_timeout_s

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._opened_at: float | None = None

    @property
    def state(self) -> CircuitState:
        if self._state == CircuitState.OPEN:
            elapsed = time.monotonic() - (self._opened_at or 0)
            if elapsed >= self.reset_timeout_s:
                self._state = CircuitState.HALF_OPEN
                logger.info(
                    "CircuitBreaker[%s] → HALF_OPEN (testando reconexão após %.0fs)",
                    self.name,
                    elapsed,
                )
        return self._state

    def is_open(self) -> bool:
        return self.state == CircuitState.OPEN

    def record_success(self) -> None:
        if self._state in (CircuitState.HALF_OPEN, CircuitState.OPEN):
            logger.info("CircuitBreaker[%s] → CLOSED (serviço recuperado)", self.name)
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._opened_at = None

    def record_failure(self) -> None:
        self._failure_count += 1
        if self._state == CircuitState.HALF_OPEN:
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()
            logger.warning(
                "CircuitBreaker[%s] → OPEN novamente (falha no teste HALF_OPEN)",
                self.name,
            )
        elif self._failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()
            logger.warning(
                "CircuitBreaker[%s] → OPEN (%d falhas consecutivas). "
                "Requisições bloqueadas por %.0fs.",
                self.name,
                self._failure_count,
                self.reset_timeout_s,
            )
