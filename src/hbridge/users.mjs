import { randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const BASE52 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DB = "./hbridge_users.json";

export class UserManager {
  constructor() {
    this.users = existsSync(DB) ? JSON.parse(readFileSync(DB, "utf8")) : {};
  }
  
  add(username) {
    const key = "hb_" + Array.from({ length: 8 }, () => BASE52[randomBytes(1)[0] % 52]).join("");
    const formatted = key.slice(0, 6) + "-" + key.slice(6);
    this.users[username] = { key, created: Date.now() };
    this._save();
    return formatted;
  }
  
  verify(username, key) {
    return this.users[username]?.key === key;
  }
  
  _save() {
    writeFileSync(DB, JSON.stringify(this.users, null, 2));
  }
}
