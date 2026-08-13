import type { Metadata } from "next";
import { HorizonGate } from "@/components/HorizonGate";
import { getDashboardSnapshot } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "Horizon Suite — TVM Investments",
};

export default async function HorizonSuitePage({
  searchParams,
}: {
  searchParams: Promise<{ archive?: string }>;
}) {
  const { archive } = await searchParams;
  const snapshot = await getDashboardSnapshot(archive);
  const quotes = new Map<string, { symbol: string; name: string; price: number }>();
  snapshot.screenedStocks.forEach((stock) => {
    quotes.set(stock.symbol, {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
    });
  });
  [...snapshot.topMovers, ...snapshot.topPicks].forEach((stock) => {
    quotes.set(stock.symbol, {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
    });
  });

  return <HorizonGate quotes={[...quotes.values()]} />;
}
