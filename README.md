# 120 DAYS

PWA mobile-first do desafio pessoal.

## Estrutura
- `index.html` — estrutura do app
- `style.css` — interface, safe area e navegação
- `app.js` — lógica, registros, cálculos e histórico
- `manifest.json` — instalação como app/PWA
- `sw.js` — cache/offline básico
- `assets/icon-180.png`, `icon-192.png`, `icon-512.png` — Jolly Roger escolhida para o app

## Publicação no GitHub Pages
Envie **os arquivos e pastas do projeto**, mantendo `index.html` na raiz do repositório. Depois, em Settings → Pages, use a branch `main` e a pasta `/(root)`.

## Instalação no iPhone
Abra o endereço do GitHub Pages no Safari → Compartilhar → Adicionar à Tela de Início → Adicionar.

O manifesto usa `display: standalone` e o código considera as safe areas do iOS.

## Dados
Os dados ficam no `localStorage` deste navegador/aparelho. O menu permite exportar/importar um backup JSON.

## Regras de data
- Início oficial: 01/09/2026
- Fim configurado: 01/01/2027
- Contagem oficial: 0/120 antes do início
- Dia operacional: muda às 03:00
- Treino, alimentação, fotos e finanças podem ser registrados antes do início oficial
- Corridas ficam exclusivamente na área Corrida dentro de Treino
