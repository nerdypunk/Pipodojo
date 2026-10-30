// Starts the Pages Function (wrangler, port 8788) and Vite (port 5173) together.
// Vite proxies /api/* to wrangler, so open http://localhost:5173.
import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";

const processes = [
  {
    name: "api",
    // `public` is only a placeholder asset dir; Vite serves the real front end.
    command: "npx wrangler pages dev public --port 8788 --compatibility-date=2026-10-01 --show-interactive-dev-session=false",
  },
  { name: "web", command: "npx vite" },
];

const children = processes.map(({ name, command }) => {
  const child = spawn(command, { shell: true, stdio: ["ignore", "pipe", "pipe"] });
  const prefix = (line) => `[${name}] ${line}`;
  const pipe = (stream, out) =>
    stream.on("data", (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) out.write(prefix(line) + "\n");
    });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    console.log(prefix(`exited (${code ?? "signal"})`));
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (isWindows) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
