function toSeconds(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getTime() / 1000;
}

function sortByDate<T extends { date: string; closedAt?: string }>(views: T[]): T[] {
  return [...views].sort((a, b) => {
    const da = a.closedAt || a.date;
    const db = b.closedAt || b.date;
    return da.localeCompare(db);
  });
}

function sCurveVal(frac: number, center: number, k: number, f0: number, f1: number): number {
  if (frac <= 0) return 0;
  if (frac >= 1) return 1;
  const f = (x: number) => 1 / (1 + Math.exp(-k * (x - center)));
  return (f(frac) - f0) / (f1 - f0);
}

export function buildSpendingTrend(
  views: Array<{ date: string; closedAt?: string; total: number }>,
  contractualAmount: number,
  preCumulative = 0,
): { dates: number[]; actual: (number | null)[]; projected: number[] } {
  if (views.length === 0) {
    return { dates: [], actual: [], projected: [] };
  }

  const sorted = sortByDate(views);
  const pastDates: number[] = [];
  const pastActual: number[] = [];
  let cum = preCumulative;

  for (const v of sorted) {
    cum += v.total;
    pastDates.push(toSeconds(v.closedAt || v.date));
    pastActual.push(cum);
  }

  const n = pastActual.length;

  if (n === 1) {
    const firstDate = pastDates[0];
    if (firstDate !== undefined) pastDates.unshift(firstDate);
    pastActual.unshift(0);
  }

  const lastActual = pastActual[pastActual.length - 1] as number;
  const lastDate = pastDates[pastDates.length - 1] as number;
  const startSec = pastDates[0] as number;
  const elapsedSeconds = lastDate - startSec;

  // --- Progress-based duration estimate ---
  let totalDuration: number;
  if (elapsedSeconds <= 0 || lastActual <= 0) {
    totalDuration = 365 * 86400;
  } else {
    const progress = lastActual / Math.max(contractualAmount, 1);
    const estimatedTotalSec = elapsedSeconds / Math.max(progress, 0.005);
    totalDuration = Math.max(
      elapsedSeconds * 1.5,
      Math.min(estimatedTotalSec, elapsedSeconds * 12),
    );
  }

  const projectedEnd = startSec + totalDuration;

  // Build result containers
  const dates: number[] = [...pastDates];
  const actual: (number | null)[] = [...pastActual];

  // With few data points (< 4), use a simple linear projection.
  // With enough data, use the logistic S-curve (construction standard).
  const pointCount = pastActual.length - (pastActual[0] === 0 ? 1 : 0);
  let projected: number[];

  if (pointCount < 4) {
    const invElapsed = elapsedSeconds > 0 ? 1 / elapsedSeconds : 0;
    projected = pastDates.map((t) => {
      const frac = (t - startSec) * invElapsed;
      return Math.round(lastActual * Math.min(frac, 1) * 100) / 100;
    });
  } else {
    const halfTarget = lastActual / 2;
    let halfIdx = 0;
    for (let i = 1; i < n; i++) {
      const a = pastActual[i];
      if (a !== undefined && a >= halfTarget) {
        halfIdx = i;
        break;
      }
    }
    const adaptive = halfIdx / Math.max(n - 1, 1);
    const center = Math.max(Math.min(adaptive, 0.5), 0.2);
    const k = Math.max(4, 7 + center * 2);
    const f = (x: number) => 1 / (1 + Math.exp(-k * (x - center)));
    const f0 = f(0);
    const f1 = f(Math.min(1, totalDuration > 0 ? elapsedSeconds / totalDuration : 1));

    projected = pastDates.map((t) => {
      const frac = totalDuration > 0 ? (t - startSec) / totalDuration : 1;
      const s = sCurveVal(frac, center, k, f0, f1);
      return Math.round(contractualAmount * s * 100) / 100;
    });

    // Add future monthly points up to projected end
    const step = 30 * 86400;
    let nextDate = lastDate + step;
    while (nextDate <= projectedEnd) {
      dates.push(nextDate);
      actual.push(null);
      const frac = (nextDate - startSec) / totalDuration;
      const s = sCurveVal(frac, center, k, f0, f1);
      projected.push(Math.round(contractualAmount * s * 100) / 100);
      nextDate += step;
    }
  }

  return { dates, actual, projected };
}

export function buildSalHistoryBars(
  views: Array<{ date: string; closedAt?: string; total: number; status: string }>,
): { labels: string[]; values: number[]; statuses: string[] } {
  const sorted = sortByDate(views);
  return {
    labels: sorted.map((_, i) => `SAL ${i + 1}`),
    values: sorted.map((v) => v.total),
    statuses: sorted.map((v) => v.status),
  };
}

export interface ContractorExposureItem {
  contractor: string;
  budget: number;
  committed: number;
}

export function buildContractorExposure(
  projects: Array<{ id: string; contractor: string; budget: { amount: number } }>,
  viewsByProjectId: Map<string, Array<{ total: number }>>,
): ContractorExposureItem[] {
  const map = new Map<string, { budget: number; committed: number }>();

  for (const p of projects) {
    const existing = map.get(p.contractor) || { budget: 0, committed: 0 };
    existing.budget += p.budget.amount;
    const pViews = viewsByProjectId.get(p.id) || [];
    existing.committed += pViews.reduce((s, v) => s + v.total, 0);
    map.set(p.contractor, existing);
  }

  return [...map.entries()]
    .map(([contractor, v]) => ({ contractor, budget: v.budget, committed: v.committed }))
    .sort((a, b) => b.budget - a.budget);
}

export function buildPortfolioBurn(
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string; total: number }>>,
): { dates: number[]; cumulative: number[] } {
  const all: Array<{ date: string; closedAt?: string; total: number }> = [];
  for (const views of viewsByProjectId.values()) {
    all.push(...views);
  }
  if (all.length === 0) return { dates: [], cumulative: [] };

  const sorted = sortByDate(all);
  const dates: number[] = [];
  const cumulative: number[] = [];
  let cum = 0;

  for (const v of sorted) {
    cum += v.total;
    dates.push(toSeconds(v.closedAt || v.date));
    cumulative.push(cum);
  }

  return { dates, cumulative };
}

export type ProjectBurnSeries = {
  id: string;
  title: string;
  dates: number[];
  cumulative: number[];
};

export function buildPortfolioBurnByProject(
  viewsByProjectId: Map<string, Array<{ date: string; closedAt?: string; total: number }>>,
  projects: Array<{ id: string; title: string }>,
): ProjectBurnSeries[] {
  const result: ProjectBurnSeries[] = [];

  for (const project of projects) {
    const views = viewsByProjectId.get(project.id);
    if (!views || views.length === 0) continue;

    const sorted = sortByDate(views);
    const dates: number[] = [];
    const cumulative: number[] = [];
    let cum = 0;

    for (const v of sorted) {
      cum += v.total;
      dates.push(toSeconds(v.closedAt || v.date));
      cumulative.push(cum);
    }

    result.push({ id: project.id, title: project.title, dates, cumulative });
  }

  return result;
}
