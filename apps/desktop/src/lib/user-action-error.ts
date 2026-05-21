import type { ToastInput } from "@/components/shared/ToastProvider";

type ReportUserActionErrorOptions = {
  action: string;
  area: string;
  notify?: (toast: ToastInput) => string;
  title?: string;
  userMessage: string;
};

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function reportUserActionError(
  error: unknown,
  {
    action,
    area,
    notify,
    title = "Operazione non riuscita",
    userMessage,
  }: ReportUserActionErrorOptions,
) {
  if (import.meta.env.DEV) {
    console.error(`[${area}] ${action} failed`, error);
  }

  notify?.({
    message: `${userMessage} ${getErrorMessage(error)}`,
    title,
    tone: "danger",
  });
}
