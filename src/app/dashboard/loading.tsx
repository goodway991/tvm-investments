export default function DashboardLoading() {
  return (
    <div className="page-enter animate-pulse space-y-4">
      <div className="h-10 w-64 rounded-2xl bg-ink/[0.06]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-[22px] bg-ink/[0.06]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="h-80 rounded-[24px] bg-ink/[0.06]" />
        <div className="h-80 rounded-[24px] bg-ink/[0.06]" />
      </div>
    </div>
  );
}
