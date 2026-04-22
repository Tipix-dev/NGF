export class Firewall {
  constructor(adapter) {
    this.adapter = adapter;
  }

  block(ip) {
    this.adapter.block(ip);
  }

  follow(ip) {
    this.adapter.follow(ip);
  }

  remove(ip) {
    this.adapter.remove(ip);
  }
}