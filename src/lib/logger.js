import fs from "fs";
import os from "os";
import path from "path";

export function getLogFile() {
  const dir = path.join(os.homedir(), ".ngf");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return path.join(dir, "events.log");
}

function write(level, msg) {
  const file = getLogFile();

  fs.appendFileSync(
    file,
    `${new Date().toISOString()} [${level}]: ${msg}\n`
  );
}

export function info(msg) {
  write("INFO", msg);
}

export function warn(msg) {
  write("WARN", msg);
}

export function err(msg) {
  write("ERR", msg);
}