import { run } from '../utils.js';

export const mac = {
  block(ip) {
    run(`pfctl -t ngf -T add ${ip}`);
  },

  follow(ip) {
    run(`pfctl -t ngf -T delete ${ip}`);
  },

  remove(ip) {
    run(`pfctl -t ngf -T delete ${ip}`);
  }
};