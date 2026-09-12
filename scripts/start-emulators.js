#!/usr/bin/env node
/**
 * start-emulators.js
 *
 * Ensures Firebase Auth + Firestore emulators are running before dev server starts.
 * - Checks if ports 9099/8081 are already listening
 * - If not, starts emulators in background and waits for them
 * - Seeds auth emulator accounts
 *
 * Usage: node scripts/start-emulators.js
 */
import { execSync, spawn } from "child_process";
import net from "net";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8081;
const MAX_WAIT_MS = 30_000;

function isPortOpen(port) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(1000);
    sock.on("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("timeout", () => {
      sock.destroy();
      resolve(false);
    });
    sock.on("error", () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, "127.0.0.1");
  });
}

function waitForPort(port, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      if (await isPortOpen(port)) return resolve(true);
      if (Date.now() - start > timeoutMs)
        return reject(new Error(`Port ${port} not open after ${timeoutMs}ms`));
      setTimeout(check, 500);
    };
    check();
  });
}

async function main() {
  const authOpen = await isPortOpen(AUTH_PORT);
  const fsOpen = await isPortOpen(FIRESTORE_PORT);

  if (authOpen && fsOpen) {
    console.log(`[OK] Emulators already running (auth:${AUTH_PORT}, firestore:${FIRESTORE_PORT})`);
  } else {
    console.log("[..] Starting Firebase emulators...");
    const child = spawn(
      "firebase",
      ["emulators:start", "--only", "auth,firestore", "--project", "sahldz-demo"],
      {
        cwd: ROOT,
        stdio: "ignore",
        detached: true,
        shell: true,
      }
    );
    child.unref();

    try {
      await waitForPort(AUTH_PORT, MAX_WAIT_MS);
      console.log(`[OK] Auth emulator ready on :${AUTH_PORT}`);
    } catch (e) {
      console.error(`[FAIL] Auth emulator: ${e.message}`);
      process.exit(1);
    }

    try {
      await waitForPort(FIRESTORE_PORT, MAX_WAIT_MS);
      console.log(`[OK] Firestore emulator ready on :${FIRESTORE_PORT}`);
    } catch (e) {
      console.error(`[FAIL] Firestore emulator: ${e.message}`);
      process.exit(1);
    }
  }

  // Seed auth accounts
  try {
    console.log("[..] Seeding auth emulator accounts...");
    execSync("node scripts/seed-auth-emulator.js", { cwd: ROOT, stdio: "pipe" });
    console.log("[OK] Auth accounts seeded");
  } catch (e) {
    console.log("[WARN] Auth seed failed (accounts may already exist)");
  }
}

main();
