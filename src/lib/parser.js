export function parseInput(value) {
  // PORT/PROTOCOL (8888/tcp)
  const portProtoMatch = value.match(/^(\d{1,5})\/(tcp|udp)$/i);
  if (portProtoMatch) {
    return {
      type: "port",
      port: Number(portProtoMatch[1]),
      protocol: portProtoMatch[2].toLowerCase()
    };
  }

  // IP (192.168.1.1)
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
    return {
      type: "ip",
      value
    };
  }

  // CIDR (192.168.1.0/24)
  if (/^(\d{1,3}\.){3}\d{1,3}\/\d+$/.test(value)) {
    return {
      type: "cidr",
      value
    };
  }

  return { type: "unknown", raw: value };
}