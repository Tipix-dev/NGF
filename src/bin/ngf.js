#!/usr/bin/env node
import promptSync from "prompt-sync";

import { parseInput } from "../lib/parser.js";
import { loadContext, saveContext, createEmptyContext } from "../lib/context.js";
import { removeFromArray, normalizeContext, askConfirmation, applyEvent, isSafe, isAdmin } from "../lib/utils.js";
import { Firewall } from "../lib/adapters/index.js";
import { getAdapter } from "../lib/adapters/selector.js";
import { info, warn, err } from "../lib/logger.js";




const prompt = promptSync();
const args = process.argv.slice(2);


const command = args[0];
const target = args[1];

export function apply() {
  const ctx = loadContext();
  const firewall = new Firewall(getAdapter());
  
  if (!isAdmin()) {
    console.error(`ngf: apply: Permission denied`)
    err(`Permission denied: Admin requirement`)
    process.exit(1)
  }
  // --- IP ---
  for (const ip of ctx.ip.blocked) {
    firewall.block(ip);
  }

  for (const ip of ctx.ip.followed) {
    firewall.follow(ip);
  }

  // --- TCP ---
  for (const port of ctx.ports.tcp.blocked) {
    firewall.block(`${port}/tcp`);
  }

  for (const port of ctx.ports.tcp.followed) {
    firewall.follow(`${port}/tcp`);
  }

  // --- UDP ---
  for (const port of ctx.ports.udp.blocked) {
    firewall.block(`${port}/udp`);
  }

  for (const port of ctx.ports.udp.followed) {
    firewall.follow(`${port}/udp`);
  }
  info("applied ✓")
}

function handleRebuild(args = []) {
  const ctx = loadContext();

  const safe = args.includes("-safe");
  const dryRun = args.includes("--dry-run");

  const history = Array.isArray(ctx.history) ? ctx.history : [];

  let newCtx = createEmptyContext();

  const seen = new Set();

  console.log("\n[NGF REBUILD]");
  console.log("=============\n");

  for (const event of history) {
    if (!event) continue;

    const key = `${event.action}:${event.type}:${event.value}`;

    // 🔒 dedupe
    if (seen.has(key)) continue;
    seen.add(key);

    // 🔒 safe mode
    if (safe && !isSafe(event)) {
      console.log(`[SAFE SKIP] ${key}`);
      continue;
    }

    console.log(`APPLY ${event.action} ${event.value}`);
    newCtx = applyEvent(newCtx, event);
  }

  if (dryRun) {
    console.log("\nResult state (simulated):");
    console.log(JSON.stringify(newCtx, null, 2));
    return;
  }

  saveContext(newCtx);

  console.log("\n[NGF] rebuild complete ✓");
}

function handleUndo() {
  const ctx = loadContext();

  if (!isAdmin()) {
    console.error("ngf: undo: Permission denied");
    err("Permission denied: Admin requirement");
    process.exit(1);
  }

  const last = ctx.history[ctx.history.length - 1];

  if (!last) {
    console.warn("[NGF] nothing to undo");
    return;
  }

  const firewall = new Firewall(getAdapter())

  if (last.action === "block") {
    firewall.follow(last.value);
  } else if (last.action === "follow") {
    firewall.block(last.value);
  }

  ctx.history.pop();
  saveContext(ctx);

  console.log(`[NGF] undo: ${last.value}`);
}
function handleHistory(args) {
  const ctx = loadContext();
  const history = ctx.history || [];

  const sub = args[1];

  // CLEAN
  if (sub === "clean") {
    ctx.history = [];
    saveContext(ctx);
    console.log("[NGF] history cleared");
    return;
  }

  // JSON
  if (args.includes("--json")) {
    console.log(JSON.stringify(history, null, 2));
    return;
  }

  // DEFAULT: show all history
  if (history.length === 0) {
    console.log("[NGF] history is empty");
    return;
  }

  console.log("\nNGF History");
  console.log("===========");

  history
    .slice()
    .reverse()
    .forEach((h, i) => {
      const date = new Date(h.timestamp).toLocaleString();
      console.log(
        `${i + 1}. ${h.action.toUpperCase()} ${h.value} (${h.type}) @ ${date}`
      );
    });
}

const safeArr = (arr) => Array.isArray(arr) ? arr : [];

function handleStatus() {
  const ctx = normalizeContext(loadContext());
  const isJson = process.argv.includes("--json");

  const ipBlocked = ctx.ip.blocked.length;
  const ipFollowed = ctx.ip.followed.length;

  const tcpBlocked = ctx.ports.tcp.blocked.length;
  const tcpFollowed = ctx.ports.tcp.followed.length;

  const udpBlocked = ctx.ports.udp.blocked.length;
  const udpFollowed = ctx.ports.udp.followed.length;

  const totalRules =
    ipBlocked + ipFollowed +
    tcpBlocked + tcpFollowed +
    udpBlocked + udpFollowed;

  const data = {
    totalRules,
    ip: { blocked: ipBlocked, followed: ipFollowed },
    tcp: { blocked: tcpBlocked, followed: tcpFollowed },
    udp: { blocked: udpBlocked, followed: udpFollowed },
    system: "OK"
  };

  // machine mode
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  }

  console.log("\nNGF STATUS");
  console.log("==========");

  console.log(`Rules total: ${totalRules}`);

  console.log("\nIP:");
  console.log(`  blocked : ${ipBlocked}`);
  console.log(`  followed: ${ipFollowed}`);

  console.log("\nTCP:");
  console.log(`  blocked : ${tcpBlocked}`);
  console.log(`  followed: ${tcpFollowed}`);

  console.log("\nUDP:");
  console.log(`  blocked : ${udpBlocked}`);
  console.log(`  followed: ${udpFollowed}`);

  console.log("\nSystem: OK ✓");

  process.exit(0);
}

function handleDoctor() {
  const ctx = loadContext();

  console.log("\nNGF Doctor Report");
  console.log("=================\n");

  let issues = 0;

  // 1. Check structure
  if (!ctx.ports || !ctx.ip) {
    console.log("[ERROR] Invalid context structure");
    issues++;
  } else {
    console.log("[OK] Context structure valid");
  }

  // 2. Check duplicates
  const checkDup = (arr, label) => {
    const safe = safeArr(arr);

    const set = new Set(safe);

    if (set.size !== safe.length) {
        console.warn(`[WARN] duplicates found in ${label}`);
        warn(`duplicates found in ${label}`)
        issues++;
    } else {
        console.log(`[OK] no duplicates in ${label}`);
    }
  };

  checkDup(ctx.ip.blocked, "ip.blocked");
  checkDup(ctx.ip.followed, "ip.followed");

  checkDup(ctx.ports.tcp.blocked, "tcp.blocked");
  checkDup(ctx.ports.tcp.followed, "tcp.followed");

  checkDup(ctx.ports.udp.blocked, "udp.blocked");
  checkDup(ctx.ports.udp.followed, "udp.followed");

  // 3. Conflict detection
  const findConflict = (a, b, label) => {
    const conflict = a.filter(x => b.includes(x));
    if (conflict.length > 0) {
      console.warn(`[WARN] conflict in ${label}:`, conflict);
      warn(`conflict in ${label}`)
      issues++;
    } else {
      console.log(`[OK] no conflicts in ${label}`);
    }
  };

  findConflict(ctx.ip.blocked, ctx.ip.followed, "ip");
  findConflict(ctx.ports.tcp.blocked, ctx.ports.tcp.followed, "tcp");
  findConflict(ctx.ports.udp.blocked, ctx.ports.udp.followed, "udp");

  // 4. Summary
  console.log("\nSummary:");
  console.log(`Issues found: ${issues}`);

  if (issues === 0) {
    console.log("System healthy ✓");
  } else {
    console.log("System needs attention ⚠");
  }

  process.exit(0);
}

function handleDashboard() {
  const ctx = loadContext();

  console.log("\nNGF Dashboard\n");

  console.log("IP Blocked:", ctx.ip.blocked);
  console.log("IP Followed:", ctx.ip.followed);

  console.log("TCP Blocked:", ctx.ports.tcp.blocked);
  console.log("TCP Followed:", ctx.ports.tcp.followed);

  console.log("UDP Blocked:", ctx.ports.udp.blocked);
  console.log("UDP Followed:", ctx.ports.udp.followed);

  process.exit(0);
}

function handleBlock(target) {
  const parsed = parseInput(target);
  const ctx = loadContext();

  if (!isAdmin()) {
    console.error("ngf: block: Permission denied");
    err("Permission denied: Admin requirement");
    process.exit(1);
  }

  // APPLY
  if (parsed.type === "ip" || parsed.type === "cidr") {
    ctx.ip.followed = ctx.ip.followed.filter(x => x !== parsed.value);

    if (!ctx.ip.blocked.includes(parsed.value)) {
      ctx.ip.blocked.push(parsed.value);
    }
  }

  else if (parsed.type === "port") {
    const p = parsed.protocol;

    ctx.ports[p].followed = ctx.ports[p].followed.filter(x => x !== parsed.port);

    if (!ctx.ports[p].blocked.includes(parsed.port)) {
      ctx.ports[p].blocked.push(parsed.port);
    }
  }

  ctx.history = ctx.history || [];
  ctx.history.push({
    action: "block",
    type: parsed.type,
    value: parsed.value,
    timestamp: Date.now()
  });

  saveContext(ctx);

  console.log(`[NGF] blocked ${target}`);
}

function handleFollow(target) {
  const parsed = parseInput(target);
  const ctx = loadContext();

  if (!isAdmin()) {
    console.error("ngf: follow: Permission denied");
    err("Permission denied: Admin requirement");
    process.exit(1);
  }

  if (parsed.type === "ip" || parsed.type === "cidr") {
    ctx.ip.blocked = ctx.ip.blocked.filter(x => x !== parsed.value);

    if (!ctx.ip.followed.includes(parsed.value)) {
      ctx.ip.followed.push(parsed.value);
    }

    ctx.history = ctx.history || [];
    ctx.history.push({
      action: "follow",
      type: parsed.type,
      value: parsed.value,
      timestamp: Date.now()
    });

    console.log(`[NGF] followed ${parsed.value}`);
  }

  else if (parsed.type === "port") {
    const p = parsed.protocol;

    ctx.ports[p].blocked = ctx.ports[p].blocked.filter(x => x !== parsed.port);

    if (!ctx.ports[p].followed.includes(parsed.port)) {
      ctx.ports[p].followed.push(parsed.port);
    }

    ctx.history = ctx.history || [];
    ctx.history.push({
      action: "follow",
      type: "port",
      value: `${parsed.port}/${p}`,
      timestamp: Date.now()
    });

    console.log(`[NGF] followed ${p} ${parsed.port}`);
  }

  saveContext(ctx);
}

function handleRemove(target) {
  const parsed = parseInput(target);
  const ctx = loadContext();
  
  if (!isAdmin()) {
    console.error("ngf: rm: Permission denied");
    err("Permission denied: Admin requirement");
    process.exit(1);
  }
  
  if (parsed.type === "ip" || parsed.type === "cidr") {
    ctx.ip.blocked = ctx.ip.blocked.filter(x => x !== parsed.value);
    ctx.ip.followed = ctx.ip.followed.filter(x => x !== parsed.value);

    console.log(`[NGF] removed ${parsed.value}`);
  }

  else if (parsed.type === "port") {
    const p = parsed.protocol;

    ctx.ports[p].blocked = ctx.ports[p].blocked.filter(x => x !== parsed.port);
    ctx.ports[p].followed = ctx.ports[p].followed.filter(x => x !== parsed.port);

    console.log(`[NGF] removed ${p} ${parsed.port}`);
  }

  saveContext(ctx);
  process.exit(0);
}

function showHelp() {
  console.log(`NGF - Next Generative Firewall

USAGE:
  ngf <command> [target]

COMMANDS:
  block <target>     Block port or IP
  follow <target>    Allow (follow) port or IP
  rm <target>        Remove rule
  <no commands>      Show full firewall dashboardc c
  apply              apply changes
  rebuild            rebuild context
  --help             Show help menu

TARGET FORMAT:
  <port>/<protocol>  e.g. 8888/tcp, 53/udp
  <ip>               e.g. 192.168.1.1
  <cidr>             e.g. 10.0.0.0/24

EXAMPLES:
  ngf block 8888/tcp
  ngf block 53/udp
  ngf block 8.8.8.8
  ngf block 10.0.0.0/24
  ngf follow 443/tcp
  ngf rm 8888/tcp
  ngf

STATE:
  ~/.ngf/context.json or Windows C:\\Users\\<user>\\.ngf\\context.json 
`);
}


switch (command) {
  case "--help":
    showHelp();
    break;

  case "block":
    handleBlock(target);
    break;

  case "follow":
    handleFollow(target);
    break;

  case "rm":
    handleRemove(target);
    break;

  case "doctor":
    handleDoctor();
    break;

  case "status":
    handleStatus();
    break;

  case "history":
    handleHistory(args);
    break;
  case "undo":
    handleUndo();
    break;
  case "rebuild":
    handleRebuild(args);
    break;
  // case "diff":
  //   handleDiff(args);
  //   break;
  case "apply":
    apply();
    break;
  case undefined:
    handleDashboard();
    break;

  default:
    console.error(`[NGF] unknown command: ${command}`);
    process.exit(1);
}
