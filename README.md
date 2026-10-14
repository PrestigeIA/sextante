# Sextante

App e site educacional de opções americanas, em português: simulador (payoff, gregas, probabilidade e valor esperado depois dos custos), Diário de trades e Academia. Não recomenda nem executa operações.

Stack: TanStack Start (React 19) + Vite + Nitro na Vercel, Better Auth, Postgres (Neon), Stripe no site, RevenueCat nas lojas e Capacitor 8 para iOS e Android.

## Rodar localmente

```bash
npm install
npm run dev          # http://localhost:8080 (sem login: o /api/auth só existe no build)
npm run build:dev && npx vite preview   # http://127.0.0.1:8081, com login e banco PGLite em memória
npm test             # testes do motor de opções e do Diário
npm run typecheck
```

Sem `DATABASE_URL`, o app usa um Postgres embutido (PGLite) que zera a cada reinício.

## Estrutura

| Pasta | O que tem |
|---|---|
| `src/lib/options/` | Motor Black-Scholes, análise de estratégias e testes |
| `src/lib/journal/` | Métricas do Diário (resultado, profit factor, drawdown, amostra) e funções de servidor |
| `src/lib/academy/` | Catálogo das trilhas e conteúdo das lições (o conteúdo Pro só sai do servidor) |
| `src/lib/billing/` | Stripe (site), RevenueCat (apps), preços e verificação de Pro no servidor |
| `src/routes/` | Telas: `/` (site ou painel), `/simulador`, `/diario`, `/academia`, `/assinatura`, `/conta`, `/precos`, legais |
| `migrations/` | Esquema do banco, aplicado automaticamente no `npm run build` |
| `ios/`, `android/` | Projetos nativos (Capacitor, modo `server.url`) |

## Planos

- **Grátis:** 4 estratégias, Trilha 1 + lição de valor esperado, até 5 operações no Diário e 3 simulações salvas.
- **Pro:** tudo liberado. Preços em `src/lib/billing/plans.ts` (hipótese de lançamento: US$ 12,90/mês ou US$ 99/ano, 7 dias grátis).
- Os limites são aplicados no servidor (`src/lib/access.ts`, `entitlement.server.ts`).

## Publicar

1. **Neon:** criar o banco e copiar a connection string pooled para `DATABASE_URL`.
2. **Vercel:** importar o repositório, preencher as variáveis de `.env.example` e apontar o domínio. `BETTER_AUTH_URL` = domínio canônico.
3. **Stripe:** produto "Sextante Pro" com 2 preços recorrentes (mensal e anual). Webhook em `/api/webhooks/stripe` com os eventos `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.payment_failed`.
4. **RevenueCat:** entitlement `sextante_pro`, produtos com "monthly" e "annual" no ID, webhook em `/api/webhooks/revenuecat` com o header `Authorization` = `REVENUECAT_WEBHOOK_SECRET`.
5. **Resend:** verificar o domínio e ligar `VITE_PASSWORD_RESET_ENABLED=true`.
6. **Textos legais:** preencher `src/lib/brand.ts` (razão social e e-mail), revisar com advogado e mudar `LEGAL_DRAFT` para `false`.

## Apps (iOS e Android)

```bash
SEXTANTE_APP_URL=https://www.seu-dominio.com npx cap sync
npm run ios       # abre o Xcode (Mac)
npm run android   # abre o Android Studio
```

- Bundle ID: `com.prestigeia.sextante`. Ícones e splash estão em `assets/` (regenerar com `npx @capacitor/assets generate`).
- Dentro do app as assinaturas passam pela loja (RevenueCat). A página de preços do site não aparece no app (regra 3.1.1 da Apple).
- Para um app de educação financeira, publique numa conta de desenvolvedor de Organização (Apple e Google) em nome da empresa dona do Sextante.
