import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "./Badge";

type DeltaBadgeProps = {
  value: string;
  trend: "up" | "down";
};

export function DeltaBadge({ trend, value }: DeltaBadgeProps) {
  const Icon = trend === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge variant={trend === "up" ? "success" : "danger"}>
      <Icon data-icon="inline-start" />
      {value}
    </Badge>
  );
}
