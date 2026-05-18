"""
Logging estruturado do Cont.IA.

Desenvolvimento: formato legível (texto).
Produção:        formato JSON — compatível com Grafana Loki, Datadog, CloudWatch.

Campos padrão em produção:
  timestamp, level, logger, message + qualquer kwargs extra passado ao logger.
"""

import json
import logging
import sys
from datetime import UTC, datetime

from app.core.config import settings

_LOG_FORMAT_DEV = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
_LOG_DATE_FORMAT = "%Y-%m-%dT%H:%M:%S"


class _JsonFormatter(logging.Formatter):
    """Formata cada log como uma linha JSON — ideal para ingestão em Loki/Datadog."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def setup_logging() -> None:
    level = logging.DEBUG if settings.API_ENV == "development" else logging.INFO

    root = logging.getLogger()
    root.setLevel(level)

    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        if settings.API_ENV == "production":
            handler.setFormatter(_JsonFormatter())
        else:
            handler.setFormatter(logging.Formatter(fmt=_LOG_FORMAT_DEV, datefmt=_LOG_DATE_FORMAT))
        root.addHandler(handler)

    # Reduz verbosidade de libs externas em produção
    if settings.API_ENV != "development":
        logging.getLogger("ultralytics").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
