FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# mobile-sam==1.0.0 declara Requires-Python<=3.11 mas funciona em 3.11.x
# --ignore-requires-python contorna a verificação de metadados do pacote
RUN pip install --no-cache-dir --ignore-requires-python mobile-sam==1.0.0

# MobileSAM checkpoint (38 MB) — baixado uma vez no build, não em runtime
RUN wget -q \
    https://github.com/ChaoningZhang/MobileSAM/releases/download/v1.0/mobile_sam.pt \
    -O /app/mobile_sam.pt

COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
