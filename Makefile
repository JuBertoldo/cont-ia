.PHONY: up down build logs restart backend-shell

## Inicia o Colima (se parado) e sobe o backend
up:
	@if ! colima status 2>/dev/null | grep -q "running"; then \
		echo "▶ Iniciando Colima..."; \
		colima start; \
	else \
		echo "✓ Colima já está rodando"; \
	fi
	docker-compose up --build

## Sobe em background (detached)
up-d:
	@if ! colima status 2>/dev/null | grep -q "running"; then \
		echo "▶ Iniciando Colima..."; \
		colima start; \
	else \
		echo "✓ Colima já está rodando"; \
	fi
	docker-compose up --build -d

## Para os containers (mantém Colima rodando)
down:
	docker-compose down

## Rebuild sem cache
build:
	docker-compose build --no-cache

## Logs do backend
logs:
	docker-compose logs -f backend

## Reinicia o backend
restart:
	docker-compose restart backend

## Abre shell dentro do container
backend-shell:
	docker-compose exec backend bash
