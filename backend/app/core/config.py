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


settings = Settings()
