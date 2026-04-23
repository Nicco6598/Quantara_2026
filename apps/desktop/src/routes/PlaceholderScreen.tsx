type PlaceholderScreenProps = {
  title: string;
};

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <section className="grid min-h-[520px] place-items-center rounded-md border border-subtle bg-card p-10 shadow-soft">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold text-primary">Fase A foundation</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-secondary">
          La route e pronta nella shell. Le schermate operative saranno sviluppate nelle fasi
          dedicate mantenendo sidebar, topbar, tabelle dense e pannelli contestuali.
        </p>
      </div>
    </section>
  );
}
