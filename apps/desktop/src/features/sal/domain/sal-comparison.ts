import type { SalLineView } from "../types";

type DiffStatus = "unchanged" | "added" | "removed" | "modified";

export type DiffResult = {
  code: string;
  description: string;
  newQuantity: number;
  newTotal: number;
  oldQuantity?: number;
  oldTotal?: number;
  qtyDiff: number;
  totalDiff: number;
  status: DiffStatus;
  voiceId: string;
  surchargeChanged: boolean;
  unitPriceDiff: number;
};

export type ComparisonTotals = {
  oldTotal: number;
  newTotal: number;
  diff: number;
  oldCount: number;
  newCount: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
};

export function diffSalLines(
  before: SalLineView[],
  after: SalLineView[],
): { diffs: DiffResult[]; totals: ComparisonTotals } {
  const beforeMap = new Map(before.map((l) => [l.voice.id, l]));
  const results: DiffResult[] = [];

  for (const line of after) {
    const voiceId = line.voice.id;
    const prev = beforeMap.get(voiceId);
    if (!prev) {
      results.push({
        code: line.voice.code,
        description: line.voice.description,
        newQuantity: line.quantity,
        newTotal: line.totalAmount,
        qtyDiff: line.quantity,
        totalDiff: line.totalAmount,
        status: "added",
        voiceId: voiceId,
        surchargeChanged: false,
        unitPriceDiff: 0,
      });
    } else {
      const qtyDiff = line.quantity - prev.quantity;
      const totalDiff = line.totalAmount - prev.totalAmount;
      const unitPriceDiff = line.voice.unitPrice - prev.voice.unitPrice;
      const surchargeChanged = line.surchargePercent !== prev.surchargePercent;

      if (qtyDiff === 0 && totalDiff === 0 && !surchargeChanged && unitPriceDiff === 0) {
        results.push({
          code: line.voice.code,
          description: line.voice.description,
          newQuantity: line.quantity,
          newTotal: line.totalAmount,
          oldQuantity: prev.quantity,
          oldTotal: prev.totalAmount,
          qtyDiff: 0,
          totalDiff: 0,
          status: "unchanged",
          voiceId: voiceId,
          surchargeChanged: false,
          unitPriceDiff: 0,
        });
      } else {
        results.push({
          code: line.voice.code,
          description: line.voice.description,
          newQuantity: line.quantity,
          newTotal: line.totalAmount,
          oldQuantity: prev.quantity,
          oldTotal: prev.totalAmount,
          qtyDiff,
          totalDiff,
          status: "modified",
          voiceId: voiceId,
          surchargeChanged,
          unitPriceDiff,
        });
      }
    }
  }

  const afterIdSet = new Set(after.map((l) => l.voice.id));
  for (const line of before) {
    if (!afterIdSet.has(line.voice.id)) {
      results.push({
        code: line.voice.code,
        description: line.voice.description,
        newQuantity: 0,
        newTotal: 0,
        oldQuantity: line.quantity,
        oldTotal: line.totalAmount,
        qtyDiff: -line.quantity,
        totalDiff: -line.totalAmount,
        status: "removed",
        voiceId: line.voice.id,
        surchargeChanged: false,
        unitPriceDiff: 0,
      });
    }
  }

  const oldTotal = before.reduce((s, l) => s + l.totalAmount, 0);
  const newTotal = after.reduce((s, l) => s + l.totalAmount, 0);
  const addedCount = results.filter((r) => r.status === "added").length;
  const removedCount = results.filter((r) => r.status === "removed").length;
  const modifiedCount = results.filter((r) => r.status === "modified").length;

  return {
    diffs: results,
    totals: {
      oldTotal,
      newTotal,
      diff: newTotal - oldTotal,
      oldCount: before.length,
      newCount: after.length,
      addedCount,
      removedCount,
      modifiedCount,
    },
  };
}
