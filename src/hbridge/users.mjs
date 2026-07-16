import { randomBytes } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";

const BASE52 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DB = "./hbridge_users.json";

export class UserManager {
  constructor() {
    this.users = existsSync(DB) ? JSON.parse(readFileSync(DB, "utf8")) : {};
  }
  
  add(username) {
    const key = Array.from({ length: 8 }, () => BASE52[randomBytes(1)[0] % 52]).join("");
    const formatted = "hb_" + key.slice(0, 4) + "-" + key.slice(4);
    this.users[username] = { key: formatted, created: Date.now() };
    this._save();
    return formatted;
  }
  
  del(username) {
    delete this.users[username];
    this._save();
  }

  regenerate(username) {
    const key = Array.from({ length: 8 }, () => BASE52[randomBytes(1)[0] % 52]).join("");
    const formatted = "hb_" + key.slice(0, 4) + "-" + key.slice(4);
    this.users[username] = { key: formatted, created: Date.now() };
    this._save();
    return formatted;
  }

  list() {
    return this.users;
  }
  
  verify(username, key) {
    const u = this.users[username];
    if (!u) return false;
    // support both with/without dash
    const flat = key.replace("-", "").replace("hb_", "");
    return u.key === key.replace("-", "");
  }
  
  _save() {
    writeFileSync(DB, JSON.stringify(this.users, null, 2));
  }
}
