import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import type { DailySnapshot } from "@/types";
import { saveDailySnapshot } from "@/lib/firebase/admin";
import { slimSnapshot } from "@/lib/snapshot-view";

const DISK_SNAPSHOT_PATH = path.join(
  process.env.VERCEL ? "/tmp" : process.cwd(),
  process.env.VERCEL ? "tvm-latest-snapshot.json" : path.join(".data", "latest-snapshot.json"),
);

export async function writeDiskSnapshot(snapshot: DailySnapshot) {
  await mkdir(path.dirname(DISK_SNAPSHOT_PATH), { recursive: true });
  await writeFile(DISK_SNAPSHOT_PATH, JSON.stringify(snapshot));
}

export async function readDiskSnapshot(): Promise<DailySnapshot | null> {
  try {
    const raw = await readFile(DISK_SNAPSHOT_PATH, "utf8");
    const snapshot = JSON.parse(raw) as DailySnapshot;
    return snapshot?.id ? snapshot : null;
  } catch {
    return null;
  }
}

export function newerLive(...snapshots: Array<DailySnapshot | null | undefined>) {
  const rows = snapshots.filter((snapshot): snapshot is DailySnapshot => Boolean(snapshot));
  const live = rows.filter((snapshot) => snapshot.dataMode === "live");
  const pool = live.length ? live : rows;
  return pool.sort((left, right) =>
    `${right.date}${right.generatedAt}`.localeCompare(`${left.date}${left.generatedAt}`),
  )[0];
}

export async function persistSnapshot(snapshot: DailySnapshot): Promise<boolean> {
  const slim = slimSnapshot(snapshot);
  try {
    await writeDiskSnapshot(slim);
  } catch (error) {
    console.warn("Local snapshot cache failed:", error);
  }
  return saveDailySnapshot(slim);
}
