"""
Cont.IA — Exportação do Dataset de Correções para Treino YOLO
=============================================================

Este script lê todos os scans do Firestore onde o usuário corrigiu
labels detectados pelo YOLO (campo temCorrecoes = true), baixa as fotos
do Firebase Storage e gera um dataset no formato YOLO (imagens + .txt de labels).

Pré-requisitos:
    pip install firebase-admin Pillow requests tqdm

Uso:
    cd contia/scripts
    python export_dataset.py

Saída:
    dataset/
    ├── images/
    │   ├── train/  (80% dos dados)
    │   └── val/    (20% dos dados)
    ├── labels/
    │   ├── train/
    │   └── val/
    └── data.yaml
"""

import json
import os
import random
import urllib.request
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore
from PIL import Image

# ─────────────────────────────────────────────────────────────────────────────
# Configuração
# ─────────────────────────────────────────────────────────────────────────────

SERVICE_ACCOUNT_PATH = "../backend/firebase-service-account.json"
OUTPUT_DIR = Path("../Dataset_correcoes")
TRAIN_RATIO = 0.8
MIN_CONFIANCA = 0.20       # Ignora detecções com confiança muito baixa
# Estratégia de coleta:
# TIER_GOLD   = scans validados pelo Super Admin (labelsValidados preenchido)
# TIER_SILVER = scans com correção humana (temCorrecoes=true) sem validação do super admin
# TIER_BRONZE = scans sem correção, confiança >= 0.70 (pseudo-labeling)
CONF_PSEUDOLABEL = 0.70    # Limiar mínimo para usar detecção sem correção humana

# ─────────────────────────────────────────────────────────────────────────────
# Inicializa Firebase
# ─────────────────────────────────────────────────────────────────────────────

if not firebase_admin._apps:
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)

db = firestore.client()


def baixar_imagem(url: str, destino: Path) -> bool:
    """Baixa uma imagem de uma URL e salva em disco."""
    try:
        urllib.request.urlretrieve(url, destino)
        return True
    except Exception as exc:
        print(f"  ✗ Erro ao baixar {url}: {exc}")
        return False


def bbox_para_yolo(bbox: list, img_w: int, img_h: int) -> tuple | None:
    """
    Converte bbox [x1, y1, x2, y2] em pixels para formato YOLO normalizado:
    (cx, cy, w, h) todos entre 0 e 1.
    """
    if len(bbox) < 4:
        return None
    x1, y1, x2, y2 = bbox
    cx = (x1 + x2) / 2 / img_w
    cy = (y1 + y2) / 2 / img_h
    w = (x2 - x1) / img_w
    h = (y2 - y1) / img_h
    if w <= 0 or h <= 0 or cx > 1 or cy > 1:
        return None
    return round(cx, 6), round(cy, 6), round(w, 6), round(h, 6)


def coletar_classes(docs: list) -> dict:
    """Coleta todas as classes de todos os tiers e atribui IDs sequenciais."""
    classes = set()
    for doc_data in docs:
        tier = doc_data.get("_tier", "bronze")

        # Gold: labelsValidados pelo super admin
        if tier == "gold" and doc_data.get("labelsValidados"):
            for l in doc_data["labelsValidados"]:
                label = l.get("label", "").strip()
                if label:
                    classes.add(label)

        # Silver/Gold sem labelsValidados: correções do usuário
        for c in doc_data.get("correcoes", []):
            label = c.get("labelCorrigido", "").strip()
            if label:
                classes.add(label)

        # Bronze: detecções de alta confiança
        if tier == "bronze":
            for d in doc_data.get("detections", []):
                if d.get("confidence", 0) >= CONF_PSEUDOLABEL:
                    label = d.get("label", "").strip()
                    if label:
                        classes.add(label)

    return {nome: idx for idx, nome in enumerate(sorted(classes))}


def exportar_dataset():
    print("=" * 60)
    print("Cont.IA — Exportação do Dataset de Correções")
    print("=" * 60)

    # ── Busca scans com foto — três tiers de qualidade ────────────
    print("\n1. Buscando scans com foto no Firestore...")

    # TIER 1 — Ouro: validados pelo Super Admin
    gold_raw = list(db.collection("inventario").where("statusDataset", "==", "validado").stream())
    gold = [d.to_dict() | {"_id": d.id, "_tier": "gold"} for d in gold_raw if d.to_dict().get("fotoUrl")]

    # TIER 2 — Prata: corrigidos pelo usuário (ainda não validados)
    silver_raw = list(db.collection("inventario").where("temCorrecoes", "==", True).stream())
    gold_ids = {d["_id"] for d in gold}
    silver = [
        d.to_dict() | {"_id": d.id, "_tier": "silver"}
        for d in silver_raw
        if d.id not in gold_ids and d.to_dict().get("fotoUrl")
    ]

    # TIER 3 — Bronze: sem correção, alta confiança (pseudo-labeling)
    all_with_photo = list(db.collection("inventario").where("fotoUrl", "!=", "").stream())
    known_ids = gold_ids | {d["_id"] for d in silver}
    bronze = [
        d.to_dict() | {"_id": d.id, "_tier": "bronze"}
        for d in all_with_photo
        if d.id not in known_ids
        and d.to_dict().get("statusDataset") != "rejeitado"
    ]

    docs = gold + silver + bronze

    print(f"   ⭐⭐⭐ Tier 1 (Super Admin validou): {len(gold)}")
    print(f"   ⭐⭐  Tier 2 (usuário corrigiu):    {len(silver)}")
    print(f"   ⭐    Tier 3 (pseudo-label ≥0.70):  {len(bronze)}")
    print(f"   Total: {len(docs)} scans com foto")

    if len(docs) < 10:
        print(f"\n⚠️  Poucos dados ({len(docs)}). Recomendado: mínimo 100 imagens.")
        print("   Continue usando o app para coletar mais correções.")
        if len(docs) == 0:
            print("   Encerrando.")
            return

    # ── Coleta classes ────────────────────────────────────────────
    print("\n2. Identificando classes corrigidas...")
    classes = coletar_classes(docs)
    print(f"   Classes encontradas ({len(classes)}):")
    for nome, idx in classes.items():
        print(f"     {idx}: {nome}")

    # ── Cria estrutura de diretórios ──────────────────────────────
    print("\n3. Criando estrutura do dataset...")
    for split in ("train", "val"):
        (OUTPUT_DIR / "images" / split).mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / "labels" / split).mkdir(parents=True, exist_ok=True)

    # ── Separa treino/validação ───────────────────────────────────
    random.shuffle(docs)
    split_idx = int(len(docs) * TRAIN_RATIO)
    splits = {"train": docs[:split_idx], "val": docs[split_idx:]}

    # ── Processa cada scan ────────────────────────────────────────
    print("\n4. Baixando imagens e gerando labels...")
    total_ok = 0
    total_labels = 0

    for split_name, split_docs in splits.items():
        print(f"\n   [{split_name.upper()}] {len(split_docs)} imagens")

        for i, doc_data in enumerate(split_docs):
            scan_id = doc_data["_id"]
            foto_url = doc_data.get("fotoUrl", "")
            correcoes = doc_data.get("correcoes", [])

            img_path = OUTPUT_DIR / "images" / split_name / f"{scan_id}.jpg"
            label_path = OUTPUT_DIR / "labels" / split_name / f"{scan_id}.txt"

            print(f"   [{i+1}/{len(split_docs)}] {scan_id[:20]}...", end=" ")

            # Baixa a imagem
            if not baixar_imagem(foto_url, img_path):
                continue

            # Lê dimensões reais da imagem
            try:
                with Image.open(img_path) as img:
                    img_w, img_h = img.size
            except Exception:
                img_path.unlink(missing_ok=True)
                print("✗ imagem inválida")
                continue

            # Seleciona fonte dos labels conforme o tier
            tier = doc_data.get("_tier", "bronze")
            if tier == "gold" and doc_data.get("labelsValidados"):
                fonte_labels = [
                    {"labelCorrigido": l.get("label", ""), "bbox": l.get("bbox", []), "confianca": l.get("confidence", 1.0)}
                    for l in doc_data["labelsValidados"]
                ]
            elif tier in ("gold", "silver") and correcoes:
                fonte_labels = correcoes
            else:
                # Bronze: usa detecções com alta confiança como pseudo-labels
                deteccoes = doc_data.get("detections", [])
                fonte_labels = [
                    {"labelCorrigido": d.get("label", ""), "bbox": d.get("bbox", []), "confianca": d.get("confidence", 0)}
                    for d in deteccoes
                    if d.get("confidence", 0) >= CONF_PSEUDOLABEL
                ]

            # Gera arquivo de labels YOLO
            linhas = []
            for correcao in fonte_labels:
                label = correcao.get("labelCorrigido", "").strip()
                bbox = correcao.get("bbox", [])
                confianca = correcao.get("confianca", 0) or 0

                if not label or label not in classes:
                    continue
                if confianca < MIN_CONFIANCA:
                    continue
                if not bbox:
                    continue

                yolo = bbox_para_yolo(bbox, img_w, img_h)
                if yolo is None:
                    continue

                class_id = classes[label]
                cx, cy, w, h = yolo
                linhas.append(f"{class_id} {cx} {cy} {w} {h}")

            if not linhas:
                img_path.unlink(missing_ok=True)
                print("✗ sem labels válidos")
                continue

            label_path.write_text("\n".join(linhas))
            total_labels += len(linhas)
            total_ok += 1
            print(f"✓ ({len(linhas)} labels)")

    # ── Gera data.yaml ────────────────────────────────────────────
    print("\n5. Gerando data.yaml...")
    data_yaml = {
        "path": str(OUTPUT_DIR.resolve()),
        "train": "images/train",
        "val": "images/val",
        "nc": len(classes),
        "names": {idx: nome for nome, idx in classes.items()},
    }

    yaml_path = OUTPUT_DIR / "data.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(f"path: {data_yaml['path']}\n")
        f.write(f"train: {data_yaml['train']}\n")
        f.write(f"val: {data_yaml['val']}\n")
        f.write(f"nc: {data_yaml['nc']}\n")
        f.write("names:\n")
        for idx, nome in sorted(data_yaml["names"].items()):
            f.write(f"  {idx}: {nome}\n")

    # ── Resumo ────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("RESUMO DA EXPORTAÇÃO")
    print("=" * 60)
    print(f"  Imagens exportadas : {total_ok}")
    print(f"  Labels gerados     : {total_labels}")
    print(f"  Classes            : {len(classes)}")
    print(f"  Treino             : {len(splits['train'])} imagens")
    print(f"  Validação          : {len(splits['val'])} imagens")
    print(f"  Dataset salvo em   : {OUTPUT_DIR.resolve()}")
    print(f"  data.yaml          : {yaml_path.resolve()}")
    print("\n✅ Próximo passo: abra o notebook notebooks/treino_yolo.ipynb no Google Colab")


if __name__ == "__main__":
    exportar_dataset()
