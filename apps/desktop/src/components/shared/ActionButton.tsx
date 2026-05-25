import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import type { AppAction } from "@/lib/action-registry";
import { useAction } from "@/hooks/useAction";
import { Button } from "@/components/shared/Button";
import type { ButtonProps } from "@/components/shared/Button";

export type ActionButtonProps = {
  action: AppAction;
  label: string;
  icon?: LucideIcon;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  disabled?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;

export function ActionButton({
  action,
  label,
  icon,
  variant = "primary",
  size = "default",
  className,
  disabled,
  ...props
}: ActionButtonProps) {
  const { dispatch } = useAction();

  return (
    <Button
      className={className}
      disabled={disabled}
      {...(icon ? { icon } : {})}
      onClick={() => dispatch(action)}
      size={size}
      variant={variant}
      {...props}
    >
      {label}
    </Button>
  );
}
