import { useId } from "react";
import { usd, num } from "@/lib/format";

type Point = { s: number; pnl: number };

/**
 * P&L at expiration, as an SVG area chart: green above zero, red below,
 * dashed brass line at today's price and blue lines at the break-evens.
 * Pure SVG so it renders on the server and in the native webview alike.
 */
export function PayoffChart({
  points,
  spot,
  breakevens,
  height = 220,
}: {
  points: Point[];
  spot: number;
  breakevens: number[];
  height?: number;
}) {
  const clipId = useId().replace(/:/g, "");
  if (points.length < 2) return null;
  const W = 640;
  const H = height;
  const padTop = 22;
  const padBottom = 26;
  const xs = points.map((p) => p.s);
  const ys = points.map((p) => p.pnl);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  let yMax = Math.max(...ys, 0);
  let yMin = Math.min(...ys, 0);
  if (yMax - yMin < 1) {
    yMax += 1;
    yMin -= 1;
  }
  const pad = (yMax - yMin) * 0.08;
  yMax += pad;
  yMin -= pad;
  const x = (s: number) => ((s - xMin) / (xMax - xMin)) * W;
  const y = (v: number) => padTop + ((yMax - v) / (yMax - yMin)) * (H - padTop - padBottom);
  const zero = y(0);
  const line = points.map((p) => `${x(p.s).toFixed(1)},${y(p.pnl).toFixed(1)}`).join(" ");
  const area = `0,${zero.toFixed(1)} ${line} ${W},${zero.toFixed(1)}`;
  const top = Math.max(...ys);
  const bottom = Math.min(...ys);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Gráfico de lucro e prejuízo no vencimento. Lucro máximo no intervalo mostrado ${usd(top, { sign: true })}, perda máxima ${usd(bottom, { sign: true })}.`}
      >
        <defs>
          <clipPath id={`above-${clipId}`}>
            <rect x="0" y="0" width={W} height={zero} />
          </clipPath>
          <clipPath id={`below-${clipId}`}>
            <rect x="0" y={zero} width={W} height={H - zero} />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={W * f} x2={W * f} y1={padTop} y2={H - padBottom} stroke="#1a2130" strokeWidth="1" />
        ))}
        <polygon points={area} fill="#3ddc97" fillOpacity="0.16" clipPath={`url(#above-${clipId})`} />
        <polygon points={area} fill="#ff7a7a" fillOpacity="0.16" clipPath={`url(#below-${clipId})`} />
        <line x1="0" x2={W} y1={zero} y2={zero} stroke="#3a4354" strokeWidth="1" />
        <polyline
          points={line}
          fill="none"
          stroke="#e8ecf2"
          strokeWidth="2.4"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {breakevens
          .filter((b) => b > xMin && b < xMax)
          .map((b) => (
            <g key={b}>
              <line x1={x(b)} x2={x(b)} y1={padTop - 6} y2={H - padBottom} stroke="#7fb2ff" strokeDasharray="3 4" />
              <text x={x(b)} y={12} fill="#7fb2ff" fontSize="12" textAnchor="middle" fontFamily="Geist Mono, monospace">
                BE {num(b)}
              </text>
            </g>
          ))}
        {spot > xMin && spot < xMax ? (
          <g>
            <line x1={x(spot)} x2={x(spot)} y1={padTop} y2={H - padBottom} stroke="#e2b355" strokeDasharray="4 4" />
            <text
              x={Math.min(Math.max(x(spot), 40), W - 40)}
              y={H - 8}
              fill="#e2b355"
              fontSize="12"
              textAnchor="middle"
              fontFamily="Geist Mono, monospace"
            >
              Hoje {num(spot)}
            </text>
          </g>
        ) : null}
        <text x="4" y={H - 8} fill="#7c8698" fontSize="11" fontFamily="Geist Mono, monospace">
          {num(xMin, 0)}
        </text>
        <text x={W - 4} y={H - 8} fill="#7c8698" fontSize="11" textAnchor="end" fontFamily="Geist Mono, monospace">
          {num(xMax, 0)}
        </text>
      </svg>
      <figcaption className="sr-only">Eixo horizontal: preço do ativo no vencimento. Eixo vertical: resultado em dólares.</figcaption>
    </figure>
  );
}
