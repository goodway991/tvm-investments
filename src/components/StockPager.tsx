"use client";

export const STOCK_PAGE_SIZE = 10;

export function pageSlice<T>(items: T[], page: number, size = STOCK_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const safe = Math.min(Math.max(0, page), pages - 1);
  return {
    page: safe,
    pages,
    slice: items.slice(safe * size, safe * size + size),
  };
}

export function StockPager({
  page,
  pages,
  onPage,
}: {
  page: number;
  pages: number;
  onPage: (next: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="First page"
        disabled={page <= 0}
        onClick={() => onPage(0)}
        className="glass grid h-10 min-w-10 place-items-center rounded-full px-2 text-sm font-semibold text-ink disabled:opacity-40"
      >
        «
      </button>
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 0}
        onClick={() => onPage(page - 1)}
        className="glass grid h-10 w-10 place-items-center rounded-full text-lg font-semibold text-ink disabled:opacity-40"
      >
        &lt;
      </button>
      <p className="min-w-20 text-center text-sm font-semibold text-ink-soft">
        {page + 1} / {pages}
      </p>
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pages - 1}
        onClick={() => onPage(page + 1)}
        className="glass grid h-10 w-10 place-items-center rounded-full text-lg font-semibold text-ink disabled:opacity-40"
      >
        &gt;
      </button>
      <button
        type="button"
        aria-label="Last page"
        disabled={page >= pages - 1}
        onClick={() => onPage(pages - 1)}
        className="glass grid h-10 min-w-10 place-items-center rounded-full px-2 text-sm font-semibold text-ink disabled:opacity-40"
      >
        »
      </button>
    </div>
  );
}
