import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

function say(lines) {
  console.log("");
  for (const line of lines) console.log(line);
  console.log("");
}

function waitToClose() {
  if (!process.stdin.isTTY) return Promise.resolve();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Press Enter to close.\n", () => {
      rl.close();
      resolve();
    });
  });
}

async function stop(lines) {
  say(lines);
  await waitToClose();
  process.exit(1);
}

function nodeIsNewEnough() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return major > 22 || (major === 22 && minor >= 13);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, cwd: root });
  return result.status === 0;
}

function officeAddresses() {
  const addresses = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.push(entry.address);
    }
  }
  return addresses;
}

function ensureSecret() {
  const envPath = path.join(root, ".env");
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  if (/^SESSION_SECRET=.+/m.test(current)) return;
  const secret = randomBytes(32).toString("hex");
  const line = `SESSION_SECRET=${secret}\n`;
  writeFileSync(envPath, current.length && !current.endsWith("\n") ? `${current}\n${line}` : `${current}${line}`);
}

async function countStaff() {
  const dbPath = path.join(root, "data", "brightpaths.sqlite");
  if (!existsSync(dbPath)) return null;
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = db
      .prepare(
        "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND email NOT LIKE '%@brightpaths.test'",
      )
      .get();
    return Number(row.n);
  } finally {
    db.close();
  }
}

function saveCopy() {
  const dbPath = path.join(root, "data", "brightpaths.sqlite");
  if (!existsSync(dbPath)) return;
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const dir = path.join(root, "data", "backups");
  mkdirSync(dir, { recursive: true });
  const already = existsSync(path.join(dir, `brightpaths-${stamp}-000000.sqlite`));
  if (already) return;
  copyFileSync(dbPath, path.join(dir, `brightpaths-${stamp}-000000.sqlite`));
}

function openBrowser(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(command, [url], { shell: true, detached: true, stdio: "ignore" }).unref();
}

async function siteIsUp() {
  try {
    const response = await fetch("http://127.0.0.1:3000", { redirect: "manual" });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function waitUntilUp() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await siteIsUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

if (!nodeIsNewEnough()) {
  await stop([
    `This computer has Node ${process.versions.node}.`,
    "The portal needs Node.js 22.13 or newer.",
    "Install it from https://nodejs.org, then double-click Start Brightpaths again.",
  ]);
}

if (!existsSync(path.join(root, "node_modules", "next"))) {
  say(["First-time setup. This can take a few minutes. Leave this window open."]);
  if (!run("npm", ["install"])) {
    await stop(["Setup stopped. Leave this window open and ask Sanjana to look at the message above."]);
  }
}

if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
  say(["Preparing the site. This can take a minute. Leave this window open."]);
  if (!run("npm", ["run", "build"])) {
    await stop(["The site did not finish preparing. Leave this window open and ask Sanjana to look at the message above."]);
  }
}

const envFile = path.join(root, ".env.local");
const usesCloud = existsSync(envFile) && /^DATABASE_URL=.+/m.test(readFileSync(envFile, "utf8"));
if (!usesCloud) {
  const staff = await countStaff();
  if (staff === null) {
    await stop([
      "The records file is missing from this folder.",
      "Copy the whole project folder again, including the data folder, then double-click Start Brightpaths.",
      "Opening it without that file would create practice people instead of the real records.",
    ]);
  }
  if (staff < 1) {
    await stop([
      "This copy still only has the practice staff login.",
      "On the try-out site, open Upkeep and add Brightpaths' real email and password.",
      "Then copy the folder again, or double-click Start Brightpaths on the computer where you added that login.",
    ]);
  }
}

if (await siteIsUp()) {
  say(["The site is already open.", "On this computer: http://localhost:3000"]);
  openBrowser("http://localhost:3000");
  await waitToClose();
  process.exit(0);
}

ensureSecret();
saveCopy();

const others = officeAddresses().map((address) => `http://${address}:3000`);
say([
  "Leave this window open. Closing it turns the site off.",
  "On this computer, the site is http://localhost:3000",
  others.length ? `Other computers in the office can use ${others.join(" or ")}` : "Other computers can use this one once they are on the same office network.",
  "If the site will not load later, double-click Start Brightpaths again.",
]);

const child = spawn("npm", ["start"], { stdio: "inherit", shell: true, cwd: root });
child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

if (await waitUntilUp()) openBrowser("http://localhost:3000");
