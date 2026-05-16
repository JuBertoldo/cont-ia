"""
Serviço de avaliação de qualidade de scan.

Determina se um scan tem qualidade suficiente para entrar no dataset de treino
e para exibição confiável no histórico do operador.
"""

_THRESHOLDS = {"baixa": 0, "media": 1, "alta": 5}
_SCORE_BASE = {"baixa": 0.2, "media": 0.6, "alta": 1.0}
_CONFIANCA_MINIMA = 0.50
_PENALIZACAO = {"alta": "media", "media": "baixa"}


def _nivel_por_quantidade(n: int) -> str:
    if n >= _THRESHOLDS["alta"]:
        return "alta"
    if n >= _THRESHOLDS["media"]:
        return "media"
    return "baixa"


def avaliar_qualidade_scan(
    deteccoes: list[dict],
    confianca_media: float,
    foto_url: str,
) -> dict:
    """
    Avalia a qualidade de um scan com base em detecções e confiança.

    Args:
        deteccoes: lista de objetos detectados pelo pipeline YOLO+SAM
        confianca_media: média das confianças das detecções [0.0, 1.0]
        foto_url: URL da foto de auditoria no Firebase Storage

    Returns:
        dict com:
            qualidade (str): "baixa" | "media" | "alta"
            score (float): pontuação normalizada [0.0, 1.0]
            ausente_foto (bool): True se foto não foi enviada
    """
    nivel = _nivel_por_quantidade(len(deteccoes))

    if confianca_media < _CONFIANCA_MINIMA and nivel in _PENALIZACAO:
        nivel = _PENALIZACAO[nivel]

    score = _SCORE_BASE[nivel] * min(confianca_media + 0.1, 1.0)

    return {
        "qualidade": nivel,
        "score": round(score, 4),
        "ausente_foto": not bool(foto_url),
    }
