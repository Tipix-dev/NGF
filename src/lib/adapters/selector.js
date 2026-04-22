import os from "os";
import { linux } from "./linux.js";
import { windows } from "./windows.js";
import { mac } from "./mac.js";

export function getAdapter() {
  switch (os.platform()) {
    case "linux": return linux;
    case "win32": return windows;
    case "darwin": return mac;
    default: throw new Error("Unsupported OS");
  }
}