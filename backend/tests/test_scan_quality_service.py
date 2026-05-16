"""
TDD — Ciclo RED: Serviço de avaliação de qualidade de scan.

Este teste foi escrito ANTES da implementação (fase Red).
Ele define o comportamento esperado de scan_quality_service.py,
que ainda não existe — portanto deve FALHAR ao ser executado agora.

Regras de negócio:
- scan com 0 detecções → qualidade "baixa"
- scan com 1-4 deteccoes -> qualidade "media"
- scan com 5+ detecções → qualidade "alta"
- confiança média < 0.50 → penaliza um nível
- scan sem foto (fotoUrl vazio) → flag ausente_foto = True
"""

from app.services.scan_quality_service import avaliar_qualidade_scan


def test_zero_deteccoes_retorna_baixa():
    resultado = avaliar_qualidade_scan(deteccoes=[], confianca_media=0.0, foto_url="")
    assert resultado["qualidade"] == "baixa"


def test_uma_deteccao_retorna_media():
    resultado = avaliar_qualidade_scan(
        deteccoes=[{"label": "bottle", "confidence": 0.85}],
        confianca_media=0.85,
        foto_url="https://storage.firebase.com/foto.jpg",
    )
    assert resultado["qualidade"] == "media"


def test_cinco_deteccoes_retorna_alta():
    deteccoes = [{"label": "bottle", "confidence": 0.90}] * 5
    resultado = avaliar_qualidade_scan(
        deteccoes=deteccoes, confianca_media=0.90, foto_url="https://url.jpg"
    )
    assert resultado["qualidade"] == "alta"


def test_confianca_baixa_penaliza_qualidade():
    deteccoes = [{"label": "bottle", "confidence": 0.40}] * 5
    resultado = avaliar_qualidade_scan(
        deteccoes=deteccoes, confianca_media=0.40, foto_url="https://url.jpg"
    )
    # 5 detecções seriam "alta", mas confiança < 0.50 penaliza → "media"
    assert resultado["qualidade"] == "media"


def test_sem_foto_flag_ausente():
    resultado = avaliar_qualidade_scan(deteccoes=[], confianca_media=0.0, foto_url="")
    assert resultado["ausente_foto"] is True


def test_com_foto_flag_presente():
    resultado = avaliar_qualidade_scan(
        deteccoes=[{"label": "bottle", "confidence": 0.80}],
        confianca_media=0.80,
        foto_url="https://storage.firebase.com/foto.jpg",
    )
    assert resultado["ausente_foto"] is False


def test_retorna_score_numerico():
    resultado = avaliar_qualidade_scan(
        deteccoes=[{"label": "bottle", "confidence": 0.75}] * 3,
        confianca_media=0.75,
        foto_url="https://url.jpg",
    )
    assert "score" in resultado
    assert isinstance(resultado["score"], float)
    assert 0.0 <= resultado["score"] <= 1.0
