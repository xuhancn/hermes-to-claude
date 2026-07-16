import { createServer as http } from "http";

export function createServer(users) {
  return http((req, res) => {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("hbridge not ready — skeleton");
  });
}
