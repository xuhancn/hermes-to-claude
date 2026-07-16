import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { console.error(`FAIL: ${msg}`); fail++; }
}

const MOCK = "/tmp/test_claude_config_mcp";
rmSync(MOCK, { recursive: true, force: true });
mkdirSync(MOCK);

// 1. No config → creates it
const r1 = spawnSync("node", ["scripts/setup-mcp.cjs"], {
  env: { ...process.env, HOME: MOCK }, cwd: process.cwd()
});
const configPath = join(MOCK, ".claude", "claude_desktop_config.json");
assert(existsSync(configPath), "config created");
const c = JSON.parse(readFileSync(configPath, "utf8"));
assert(c.mcpServers?.hbridge?.command === "hbridge", "hbridge entry");

// 2. Existing config + other MCP → hbridge added, existing untouched
c.mcpServers.existing = { command: "other" };
writeFileSync(configPath, JSON.stringify(c, null, 2));
spawnSync("node", ["scripts/setup-mcp.cjs"], {
  env: { ...process.env, HOME: MOCK }, cwd: process.cwd()
});
const c2 = JSON.parse(readFileSync(configPath, "utf8"));
assert(c2.mcpServers.existing?.command === "other", "existing unchanged");
assert(c2.mcpServers.hbridge?.command === "hbridge", "hbridge present");

rmSync(MOCK, { recursive: true, force: true });
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
