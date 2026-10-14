/** Number formatting in Brazilian Portuguese conventions, US dollars. */

const usd2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** "$1.234,56". With `sign`, "+$" / "−$" (true minus sign). */
export function usd(value: number, opts: { sign?: boolean; decimals?: 0 | 2 } = {}): string {
  if (!Number.isFinite(value)) return value > 0 ? "Ilimitado" : "−Ilimitado";
  const fmt = opts.decimals === 0 ? usd0 : usd2;
  const body = `$${fmt.format(Math.abs(value))}`;
  if (opts.sign) return (value < 0 ? "−" : value > 0 ? "+" : "") + body;
  return value < 0 ? `−${body}` : body;
}

export function pct(value: number, decimals = 1): string {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

export function num(value: number, decimals = 2): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Tailwind text color for a P&L value. Always pair with a sign — color is never the only cue. */
export function pnlColor(value: number | null | undefined): string {
  if (value === null || value === undefined || Math.abs(value) < 0.005) return "text-foreground";
  return value > 0 ? "text-gain" : "text-loss";
}

/** "2026-10-14" -> "14 out" */
export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${String(d).padStart(2, "0")} ${months[m - 1]}`;
}

export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
