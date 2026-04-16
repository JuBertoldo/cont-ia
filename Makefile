.PHONY: up up-d down logs restart \
        metro ios-device \
        tunnel-login tunnel-create tunnel-route tunnel-up tunnel-down tunnel-logs tunnel-quick

VENV=backend/.venv/bin/python3
UVICORN=backend/.venv/bin/uvicorn

## Inicia o backend via Docker (recomendado — resolve lzma e carrega .env automaticamente)
up:
	@docker-compose up -d backend
	@echo "✓ Backend iniciado via Docker (porta 8000)"

## Para o backend Docker
down:
	@docker-compose stop backend
	@echo "✓ Backend parado"

## Logs em tempo real do backend Docker
logs:
	@docker-compose logs -f backend

## Reinicia o backend Docker
restart: down up

## ── Frontend / Metro ─────────────────────────────────────────────────────────

## Inicia o Metro detectando o IP da rede atual automaticamente (funciona em qualquer rede)
metro:
	@IP=$$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null) ; \
	if [ -z "$$IP" ]; then echo "✗ Sem rede Wi-Fi ativa (en0/en1). Conecte o Mac ao Wi-Fi." ; exit 1 ; fi ; \
	echo "▶ Metro host: $$IP (rede atual)" ; \
	cd frontend && RCT_METRO_PORT=8081 npx react-native start --host $$IP

## Build e instala no iPhone Juliana (use após 'make metro' em outro terminal)
ios-device:
	@cd frontend && npx react-native run-ios \
		--udid 00008150-00062DC02E41401C \
		--no-packager

## ── Cloudflare Tunnel ────────────────────────────────────────────────────────

## 1) Autentica no Cloudflare (abre browser) — execute uma única vez
tunnel-login:
	@cloudflared tunnel login

## 2) Cria o tunnel permanente — execute uma única vez e anote o UUID
tunnel-create:
	@cloudflared tunnel create contia-backend
	@echo ""
	@echo "▶ Copie o UUID exibido acima para .cloudflared/config.yml (campo 'tunnel:')"
	@echo "▶ Copie ~/.cloudflared/<UUID>.json para .cloudflared/"

## 3) Cria registro DNS permanente no Cloudflare (ex: make tunnel-route DOMINIO=api.contia.com)
tunnel-route:
ifndef DOMINIO
	$(error Defina DOMINIO. Ex: make tunnel-route DOMINIO=api.contia.com)
endif
	@cloudflared tunnel route dns contia-backend $(DOMINIO)
	@echo "✓ DNS criado — atualize YOLO_API_URL no frontend/.env com https://$(DOMINIO)"

## Inicia o Cloudflare Tunnel via Docker Compose (requer .cloudflared/config.yml)
tunnel-up:
	@docker compose up -d cloudflared
	@echo "✓ Tunnel ativo — URL pública configurada no DNS do Cloudflare"

## Para o Cloudflare Tunnel
tunnel-down:
	@docker compose stop cloudflared
	@echo "✓ Tunnel parado"

## Logs do Cloudflare Tunnel em tempo real
tunnel-logs:
	@docker compose logs -f cloudflared

## URL temporária para testes rápidos (sem domínio, sem configuração — muda a cada vez)
tunnel-quick:
	@echo "▶ Tunnel temporário — URL muda ao reiniciar. Para URL fixa, use 'make tunnel-up'."
	@cloudflared tunnel --url http://localhost:8000
