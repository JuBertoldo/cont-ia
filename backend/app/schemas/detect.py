from __future__ import annotations

from pydantic import BaseModel, Field


class DetectRequest(BaseModel):
    image_base64: str = Field(
        ...,
        min_length=10,
        description="Imagem codificada em base64 (sem prefixo data:image/).",
    )
    source: str | None = Field(default="mobile", description="Origem da requisição.")
    platform: str | None = Field(
        default="unknown", description="Plataforma do cliente (android/ios/web)."
    )


class DetectionItem(BaseModel):
    label: str = Field(..., description="Nome da classe detectada.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confiança da detecção (0-1).")
    bbox: list[float] = Field(
        ..., min_length=4, max_length=4, description="Bounding box [x1, y1, x2, y2] em pixels."
    )
    source: str = Field(default="yolo+sam", description="Pipeline que gerou a detecção (yolo+sam).")
    mask_polygon: list[list[float]] | None = Field(
        default=None,
        description="Polígono da máscara SAM [[x, y], ...] em pixels do espaço da imagem.",
    )
    mask_area: float | None = Field(
        default=None,
        description="Área da máscara SAM em pixels².",
    )


class DetectResponse(BaseModel):
    detections: list[DetectionItem] = Field(..., description="Lista de objetos detectados.")
    meta: dict = Field(..., description="Metadados da inferência (model, processing_ms, pipeline).")
