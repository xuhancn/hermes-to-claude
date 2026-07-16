import { createServer } from "./server.mjs";
import { UserManager } from "./users.mjs";
import { COLORS, log } from "./utils.mjs";

const PORT = 9190;

async function cmd_enable() {
  const users = new UserManager();
  
  // 交互问用户名
  process.stdout.write("  Username: ");
  const username = await new Promise(r => {
    process.stdin.once("data", d => r(d.toString().trim()));
  });
  
  const key = users.add(username);
  
  console.log(`
  ╔══════════════════════════════════╗
  ║  ${COLORS.yellow}⚠ H-Bridge enabled${COLORS.reset}             ║
  ║  Remote access is now allowed    ║
  ║                                  ║
  ║  User:   ${username.padEnd(22)}║
  ║  Key:    ${key.padEnd(22)}║
  ║  Addr:   127.0.0.1:${PORT}          ║
  ║          ${getLocalIPs().join(", ").padEnd(22)}║
  ║                                  ║
  ║  Save this key — shown once      ║
  ╚══════════════════════════════════╝
  `);
  
  const server = createServer(users);
  server.listen(PORT);
  
  // 一行状态栏
  log(`  hbridge: on | port: ${PORT} | 0 tasks | ↑ just now`);
  
  process.stdin.resume(); // keep alive
}

function getLocalIPs() {
  const os = require("os");
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(n => n.family === "IPv4" && !n.internal)
    .map(n => n.address);
}

const cmd = process.argv[2] || "--enable";
if (cmd === "--enable") cmd_enable();
else if (cmd === "--disable") console.log("disabled (not yet)");
else if (cmd === "--status") console.log("status (not yet)");
'EOF
echo "cli.mjs written"
