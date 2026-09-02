import type { SalesReportBucket } from "@/lib/merchant/sales-report";
import type { CompareReport } from "@/lib/reports/compare";
import type { IntelligenceReport } from "@/lib/reports/intelligence";
import { printHtmlDocument } from "@/lib/print/browser-print";
import { salesSeriesToRows } from "@/lib/reports/export";

function money(symbol: string, cents: number) {
  return `${symbol} ${(cents / 100).toFixed(2)}`;
}

function printStyles() {
  return `
    body { font-family: system-ui, sans-serif; padding: 24px; color: #1a1a1a; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
    p.meta { color: #666; font-size: 12px; margin: 0 0 20px; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .metric { border: 1px solid #ddd; padding: 12px; }
    .metric label { display: block; font-size: 10px; text-transform: uppercase; color: #666; }
    .metric strong { font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    ul { margin: 0; padding-left: 18px; font-size: 12px; }
    li { margin-bottom: 6px; }
  `;
}

function wrapReportHtml(title: string, merchantName: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${printStyles()}</style></head><body>
<h1>${title}</h1>
<p class="meta">${merchantName} · Generated ${new Date().toLocaleString()}</p>
${body}
</body></html>`;
}

export function printSalesOverviewReport(input: {
  merchantName: string;
  period: string;
  symbol: string;
  summary: { revenueCents: number; orderCount: number; avgOrderCents: number };
  series: SalesReportBucket[];
}) {
  const rows = salesSeriesToRows(input.series, input.symbol === "S$" ? "SGD" : "MYR");
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const tableHead = headers.map((h) => `<th>${h}</th>`).join("");
  const tableBody = rows
    .map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`)
    .join("");

  const html = wrapReportHtml(
    `${input.period} sales report`,
    input.merchantName,
    `<div class="metrics">
      <div class="metric"><label>Total revenue</label><strong>${money(input.symbol, input.summary.revenueCents)}</strong></div>
      <div class="metric"><label>Orders</label><strong>${input.summary.orderCount}</strong></div>
      <div class="metric"><label>Avg order</label><strong>${money(input.symbol, input.summary.avgOrderCents)}</strong></div>
    </div>
    <h2>Sales records</h2>
    <table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table>`,
  );

  printHtmlDocument(html, `${input.merchantName} sales report`);
}

export function printCompareReport(input: {
  merchantName: string;
  symbol: string;
  compare: CompareReport;
  periodDays: number;
}) {
  const { compare, symbol, periodDays } = input;
  const blocks = [compare.current, compare.previous, compare.yearAgo].filter(Boolean);

  const html = wrapReportHtml(
    `${periodDays}-day comparison`,
    input.merchantName,
    `<div class="metrics">
      ${blocks
        .map(
          (block) =>
            `<div class="metric"><label>${block!.label}</label><strong>${money(symbol, block!.revenueCents)}</strong><div>${block!.orderCount} orders</div></div>`,
        )
        .join("")}
    </div>
    <h2>Period changes</h2>
    <p>Revenue vs previous: ${compare.revenueChangePct >= 0 ? "+" : ""}${compare.revenueChangePct}% · Orders: ${compare.orderChangePct >= 0 ? "+" : ""}${compare.orderChangePct}%</p>
    <h2>Industry benchmark</h2>
    <p>Industry avg order ${money(symbol, compare.industry.avgOrderCents)} · Yours ${money(symbol, compare.industry.yourAvgOrderCents)} (${compare.industry.deltaPct >= 0 ? "+" : ""}${compare.industry.deltaPct}%)</p>
    <p>${compare.industry.note}</p>`,
  );

  printHtmlDocument(html, `${input.merchantName} comparison`);
}

export function printIntelligenceReport(input: {
  merchantName: string;
  symbol: string;
  intelligence: IntelligenceReport;
}) {
  const { intelligence: intel } = input;
  const topCampaign = [...intel.campaigns].sort(
    (a, b) => b.estimatedRevenueLiftCents - a.estimatedRevenueLiftCents,
  )[0];
  const topAutomation = [...intel.automations].sort(
    (a, b) => b.estimatedMonthlyLiftCents - a.estimatedMonthlyLiftCents,
  )[0];

  const html = wrapReportHtml(
    "Sales intelligence",
    input.merchantName,
    `<h2>Summary</h2><p>${intel.summary}</p>
    ${topCampaign ? `<h2>Top campaign</h2><p><strong>${topCampaign.name}</strong> — ${topCampaign.recommendation}</p>` : ""}
    ${topAutomation ? `<h2>Top automation</h2><p><strong>${topAutomation.title}</strong> — ${topAutomation.recommendation}</p>` : ""}`,
  );

  printHtmlDocument(html, `${input.merchantName} intelligence`);
}
