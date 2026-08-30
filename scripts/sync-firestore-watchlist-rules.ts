/**
 * Regenerates allowedSymbols() in firestore.rules from WATCHLIST_ALLOWED_SYMBOLS.
 *
 *   npm run sync:firestore-rules
 *
 * Then deploy rules:
 *   firebase deploy --only firestore:rules --project tvm-investments-varish
 */
import fs from "fs";
import path from "path";
import { WATCHLIST_ALLOWED_SYMBOLS } from "../src/lib/watchlist-symbols";

const rulesPath = path.join(process.cwd(), "firestore.rules");
const rules = fs.readFileSync(rulesPath, "utf8");

const lines = WATCHLIST_ALLOWED_SYMBOLS.map((symbol) => `        "${symbol}"`).join(
  ",\n",
);

const block = `    function allowedSymbols() {
      // Auto-generated from WATCHLIST_ALLOWED_SYMBOLS — run: npm run sync:firestore-rules
      return [
${lines}
      ];
    }`;

const pattern = /    function allowedSymbols\(\) \{[\s\S]*?    \}/;
if (!pattern.test(rules)) {
  console.error("Could not find allowedSymbols() in firestore.rules");
  process.exit(1);
}

const updated = rules.replace(pattern, block);
fs.writeFileSync(rulesPath, updated);
console.log(`Synced ${WATCHLIST_ALLOWED_SYMBOLS.length} symbols into firestore.rules`);
