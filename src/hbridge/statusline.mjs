#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import http from "http";

async function main() {
  let line = "hbridge: off";
  
  // Check if hbridge HTTP is up
  try {
    await new Promise((resolve, reject) => {
      const req = http.get("http://127.0.0.1:9190/health", (res) => {
        let d = "";
        res.on("data", c => d += c);
        res.on("end", () => {
          if (d.includes("ok")) {
            const inbox = existsSync("hbridge_inbox.json") 
              ? JSON.parse(readFileSync("hbridge_inbox.json", "utf8")) 
              : [];
            const count = inbox.length;
            line = `hbridge: on | :9190 | ${count} pending`;
          }
          resolve();
        });
      });
      req.on("error", () => { line = "hbridge: off"; resolve(); });
      req.setTimeout(2000, () => { req.destroy(); resolve(); });
    });
  } catch {}
  
  process.stdout.write(line);
}

main();
