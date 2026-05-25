import { DatePicker } from "@/components/shared/form";

export function FilterDateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <DatePicker
      align="end"
      ariaLabel={`Filtro data ${label}`}
      className="w-auto min-w-[188px]"
      label={label}
      onChange={onChange}
      value={value}
      valueClassName="w-[108px] flex-none"
    />
  );
}
