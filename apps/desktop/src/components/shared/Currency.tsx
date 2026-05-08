export function Currency({ value }: { value: number }) {
  return (
    <span className="font-mono">
      {value.toLocaleString("it-IT", {
        currency: "EUR",
        minimumFractionDigits: 2,
        style: "currency",
      })}
    </span>
  );
}
