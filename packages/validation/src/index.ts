import { z } from "zod";

export const moneySchema = z.object({
  amount: z.number().finite(),
  currency: z.literal("EUR"),
});

export const contractSchema = z.object({
  applicationContractCode: z.string().min(1),
  contractualAmount: moneySchema,
  frameworkAgreementCode: z.string().min(1),
  id: z.string().startsWith("contract_"),
  tenderDiscountPercent: z.number().min(0).max(100),
  tariffPriorities: z.array(
    z.object({
      priority: z.number().int().positive(),
      reason: z.string().min(1),
      tariffBookId: z.string().startsWith("tariff_"),
    }),
  ),
  title: z.string().min(1),
  osExcludedAmount: z.number().min(0).optional().nullable(),
});

export type ContractInput = z.infer<typeof contractSchema>;
