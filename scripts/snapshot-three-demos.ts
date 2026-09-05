/** Re-run: npx tsx /tmp/build-qa-packs.ts  OR this wrapper after copying script. */
import { spawnSync } from "child_process";
import { copyFileSync, existsSync } from "fs";
const src = "/tmp/build-qa-packs.ts";
if (!existsSync(src)) {
  console.error("missing /tmp/build-qa-packs.ts — restore from git history or re-create");
  process.exit(1);
}
const r = spawnSync("npx", ["--yes", "tsx", src], { stdio: "inherit", cwd: process.cwd() });
process.exit(r.status ?? 1);
