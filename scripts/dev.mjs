// Starts the Worker (wrangler, port 8788, same code as the live site) and Vite (port 5173) together.
// Vite proxies /api/* to wrangler, so open http://localhost:5173.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const isWindows = process.platform === "win32";

// wrangler.jsonc points the Worker's files at `dist`; it only has to exist, since Vite serves the game.
mkdirSync("dist", { recursive: true });

const processes = [
  {
    name: "api",
    command: "npx wrangler dev --port 8788 --show-interactive-dev-session=false",
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
