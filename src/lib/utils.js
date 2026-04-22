import fs from 'fs'
import readline from 'readline';
import os from 'os';
import path from 'path';
import { exec, execSync } from 'child_process';

export function removeFromArray(arr, value) {
  const before = arr.length;
  const updated = arr.filter(x => x !== value);

  return {
    updated,
    removed: updated.length !== before
  };
}

export function askConfirmation(message) {
  const force = process.argv.includes("--yes");

  if (force) return Promise.resolve(true);

  console.log("\n[NGF WARNING]");
  console.log(message);

  try {
    const rl = readline.createInterface({
      input: fs.createReadStream("/dev/tty"),
      output: fs.createWriteStream("/dev/tty")
    });

    return new Promise((resolve) => {
      rl.question("Continue? (y/n): ", (answer) => {
        rl.close();
        resolve(
          answer.trim().toLowerCase() === "y" ||
          answer.trim().toLowerCase() === "Y"
        );
      });
    });

  } catch (e) {
    console.log("[NGF] no TTY, auto-continue");
    return Promise.resolve(true);
  }
}

export function normalizeContext(ctx) {
  return {
    ports: {
      tcp: {
        blocked: ctx?.ports?.tcp?.blocked ?? [],
        followed: ctx?.ports?.tcp?.followed ?? []
      },
      udp: {
        blocked: ctx?.ports?.udp?.blocked ?? [],
        followed: ctx?.ports?.udp?.followed ?? []
      }
    },
    ip: {
      blocked: ctx?.ip?.blocked ?? [],
      followed: ctx?.ip?.followed ?? [],
      ignored: ctx?.ip?.ignored ?? []
    }
  };
}

export function applyEvent(ctx, event) {
  if (event.type === "ip") {
    if (event.action === "block") {
      ctx.ip.blocked.push(event.value);
      ctx.ip.followed = ctx.ip.followed.filter(x => x !== event.value);
    }

    if (event.action === "follow") {
      ctx.ip.followed.push(event.value);
      ctx.ip.blocked = ctx.ip.blocked.filter(x => x !== event.value);
    }

    if (event.action === "rm") {
      ctx.ip.blocked = ctx.ip.blocked.filter(x => x !== event.value);
      ctx.ip.followed = ctx.ip.followed.filter(x => x !== event.value);
    }
  }

  return ctx;
}

const BLOCKED_IPS = new Set([
  "127.0.0.1",
  "0.0.0.0/0",
  "0.0.0.0"
]);

const PROTECTED_PORTS = new Set([
  22,
  80,
  443
]);

export function isSafe(event) {
  if (!event || typeof event !== "object") return false;

  if (event.type === "ip") {
    return !BLOCKED_IPS.has(event.value);
  }

  if (event.type === "port") {
    const port = Number(event.port ?? event.value);
    if (Number.isNaN(port)) return false;

    return !PROTECTED_PORTS.has(port);
  }

  return false;
}

export function run(cmd) {
  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (err) {
    console.error("[NGF OS ERROR]\n", err.message);
  }
}

export function isAdmin() {
  try {
    if (process.platform === "win32") {
      execSync("net session", { stdio: "ignore" });
      return true;
    } else {
      return process.getuid && process.getuid() === 0;
    }
  } catch {
    return false;
  }
}
