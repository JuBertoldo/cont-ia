.PHONY: up up-d down logs restart

VENV=backend/.venv/bin/python3
UVICORN=backend/.venv/bin/uvicorn

## Inicia o backend diretamente no Mac (sem Docker)
up:
	@echo "▶ Iniciando backend..."
	@cd backend && ../.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 2>/dev/null || \
	PYTHONPATH=backend $(UVICORN) app.main:app --host 0.0.0.0 --port 8000

## Inicia o backend em background
up-d:
	@echo "▶ Iniciando backend em background..."
	@cd backend && $(CURDIR)/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 &
	@echo "✓ Backend iniciado em background (porta 8000)"

## Para o backend em background
down:
	@pkill -f "uvicorn app.main:app" 2>/dev/null && echo "✓ Backend parado" || echo "Backend não estava rodando"

## Logs em tempo real (backend em background)
logs:
	@echo "Use: tail -f /tmp/contia-backend.log"

## Reinicia o backend em background
restart: down up-d
