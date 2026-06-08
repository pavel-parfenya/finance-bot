export function DocPageFallback({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
      {lastUpdated && (
        <p className="text-sm text-gray-400 mb-12">Последнее обновление: {lastUpdated}</p>
      )}
      <div className="space-y-8 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  );
}
