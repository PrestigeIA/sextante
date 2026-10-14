/**
 * Public price list shown on the website. MUST match the Stripe Prices set in
 * STRIPE_PRICE_MONTHLY / STRIPE_PRICE_ANNUAL. Inside the iOS/Android app the
 * store shows its own localized price (RevenueCat) and this list is not used.
 *
 * Launch hypothesis — validate with the waitlist before fixing it.
 */
export const PRO_PRICES = {
  monthly: { label: "Mensal", price: 12.9, period: "mês" },
  annual: { label: "Anual", price: 99, period: "ano" },
} as const;

export const TRIAL_DAYS = 7;

export const FREE_FEATURES = [
  "Simulador com compra de call e put, put credit spread e covered call",
  "Payoff, gregas, probabilidade e valor esperado depois dos custos",
  "Trilha 1 da Academia (Fundamentos) e a lição de valor esperado",
  "Diário com até 5 operações e 3 simulações salvas",
];

export const PRO_FEATURES = [
  "Todas as 10 estratégias do simulador, incluindo iron condor e straddle",
  "As quatro trilhas da Academia: gregas, estratégias de renda e risco",
  "Diário ilimitado, com paper e conta real separados",
  "Simulações salvas ilimitadas",
];
