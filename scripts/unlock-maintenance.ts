import { loadEnvConfig } from "@next/env";
import { disableSiteMaintenance } from "../src/lib/firebase/admin";

loadEnvConfig(process.cwd());

async function main() {
  await disableSiteMaintenance();
  console.log("Maintenance lock is off.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
