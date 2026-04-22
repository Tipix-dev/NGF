import { exec } from "child_process";
import crypto from 'crypto'

function ruleName(ip) {
  return `NGF_${ip}`;
}

export const windows = {
  block(ip) {
    exec(`netsh advfirewall firewall add rule name="${ruleName(ip)}" dir=in action=block remoteip=${ip}`);
  },

  follow(ip) {
    exec(`netsh advfirewall firewall delete rule name="${ruleName(ip)}" remoteip=${ip}`);
  },

  remove(ip) {
    exec(`netsh advfirewall firewall delete rule name="${ruleName(ip)}" remoteip=${ip}`);
  }
};