import { run } from '../utils.js';

export const linux = {
  block(ip) {
    run(`iptables -A INPUT -s ${ip} -j DROP || true`);
  },

  follow(ip) {
    run(`iptables -D INPUT -s ${ip} -j DROP || true`);
  },

  remove(ip) {
    run(`iptables -D INPUT -s ${ip} -j DROP || true`);
  }
};