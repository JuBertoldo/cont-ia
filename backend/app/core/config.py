import os


class Settings:
    API_ENV: str = os.getenv("API_ENV", "development")
    YOLO_MODEL: str = os.getenv("YOLO_MODEL", "yolo11m.pt")
    YOLO_CONF: float = float(os.getenv("YOLO_CONF", "0.25"))
    YOLO_TIMEOUT_S: float = float(os.getenv("YOLO_TIMEOUT_S", "60"))
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")
    FIREBASE_SERVICE_ACCOUNT_PATH: str = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json"
    )
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    RATE_LIMIT: str = os.getenv("RATE_LIMIT", "30/minute")
    ROBOFLOW_API_KEY: str = os.getenv("ROBOFLOW_API_KEY", "")
    ROBOFLOW_WORKSPACE: str = os.getenv("ROBOFLOW_WORKSPACE", "julianas-workspace-fcaqd")
    ROBOFLOW_WORKFLOW_ID: str = os.getenv(
        "ROBOFLOW_WORKFLOW_ID", "smart-bottle-counting-pipeline-1776046255903"
    )
    ENSEMBLE_IOU_THRESHOLD: float = float(os.getenv("ENSEMBLE_IOU_THRESHOLD", "0.5"))

    # ── E-mail (SMTP) ─────────────────────────────────────────────────────────
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM_NAME: str = os.getenv("EMAIL_FROM_NAME", "Cont.IA Suporte")

    @property
    def is_production(self) -> bool:
        return self.API_ENV == "production"

    @property
    def effective_cors_origins(self) -> list[str]:
        """Em produção, CORS_ORIGINS='*' é inseguro — levanta erro para forçar configuração explícita."""
        if self.is_production and self.CORS_ORIGINS == ["*"]:
            raise ValueError(
                "CORS_ORIGINS não pode ser '*' em produção. "
                "Defina origens explícitas, ex: CORS_ORIGINS=https://app.example.com"
            )
        return self.CORS_ORIGINS


settings = Settings()
