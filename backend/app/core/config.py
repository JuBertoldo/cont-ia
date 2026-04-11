import os


class Settings:
    API_ENV: str = os.getenv("API_ENV", "development")
    YOLO_MODEL: str = os.getenv("YOLO_MODEL", "yolo11m.pt")
    YOLO_CONF: float = float(os.getenv("YOLO_CONF", "0.25"))
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "*").split(",")
    FIREBASE_SERVICE_ACCOUNT_PATH: str = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json"
    )

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
