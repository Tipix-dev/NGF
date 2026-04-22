#!/usr/bin/env node
import { getLogFile } from "../lib/logger.js";
import { exec } from "child_process";
import fs from "fs";

const args = process.argv.slice(2);

const command = args[0];
const target = args[1];

function handleClear() {
  const file = getLogFile();

  if (process.platform === "win32") {
    exec(
  `powershell -NoProfile -Command "Set-Content -LiteralPath '${file.replace(/'/g, "''")}' -Value ''"`
);
  } else {
    exec(`sh -c ': > "${file}"'`);
  }
}

function handleList() {
  const file = getLogFile();

  if (!fs.existsSync(file)) {
    console.log("[glog] no logs found");
    return;
  }

  const content = fs.readFileSync(file, "utf-8");

  if (!content.trim()) {
    console.log("[glog] log is empty");
    return;
  }

  console.log(content);
}

switch (command) {
    case "clear":
    case "clean":
        handleClear();
        break; 
    case "list":
        handleList();
        break;
    default:
        console.error("glog: unknown command")
        process.exit(1)
}