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
  tariffPriorities: z
    .array(
      z.object({
        priority: z.number().int().positive(),
        reason: z.string().min(1),
        tariffBookId: z.string().startsWith("tariff_"),
      }),
    )
    .min(1),
  title: z.string().min(1),
});

export type ContractInput = z.infer<typeof contractSchema>;
