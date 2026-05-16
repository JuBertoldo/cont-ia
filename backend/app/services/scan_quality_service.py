"""
Serviço de avaliação de qualidade de scan.

Implementação mínima para passar nos testes (fase Green do ciclo TDD).
Refatoração posterior pode adicionar persistência, alertas, etc.
"""


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
    n = len(deteccoes)

    if n == 0:
        nivel = "baixa"
    elif n < 5:
        nivel = "media"
    else:
        nivel = "alta"

    # confiança baixa penaliza um nível
    if confianca_media < 0.50 and nivel != "baixa":
        nivel = "baixa" if nivel == "media" else "media"

    score_map = {"baixa": 0.2, "media": 0.6, "alta": 1.0}
    score = score_map[nivel] * min(confianca_media + 0.1, 1.0)

    return {
        "qualidade": nivel,
        "score": round(score, 4),
        "ausente_foto": not bool(foto_url),
    }
