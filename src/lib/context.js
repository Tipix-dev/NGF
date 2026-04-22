import fs from "fs";
import os from "os";
import path from "path";


function getHome() {
  if (process.env.SUDO_USER) {
    return os.platform() === "darwin"
      ? `/Users/${process.env.SUDO_USER}`
      : `/home/${process.env.SUDO_USER}`;
  } else {
    return os.homedir();
  }

  
}
const DIR = path.join(getHome(), ".ngf");
const FILE = path.join(DIR, "context.json");

function normalize(ctx) {
  return {
    history: ctx.history ?? [],

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


function ensure() {
  if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR, { recursive: true });
  }

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({
      history: [],
      ports: {
          tcp: { blocked: [], followed: [] },
          udp: { blocked: [], followed: [] }
      },
      ip: {
          blocked: [],
          ignored: [],
          followed: []
      }
    }, null, 2));
  }
}
export function loadContext() {
  ensure();

  const raw = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  const ctx = normalize(raw);

  if (JSON.stringify(raw) !== JSON.stringify(ctx)) {
    fs.writeFileSync(FILE, JSON.stringify(ctx, null, 2));
  }

  return ctx;
}

export function saveContext(ctx) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(ctx, null, 2));
}

export function createEmptyContext() {
  return {
    history: [],
    ports: {
      tcp: { blocked: [], followed: [] },
      udp: { blocked: [], followed: [] }
    },
    ip: {
      blocked: [],
      followed: [],
      ignored: []
    }
  };
}