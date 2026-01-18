export class Queue {
  constructor() {
    this.waiting = []; // [{playerId, socketId, exerciseId}]
    this.inQueue = new Set();
  }

  size() {
    return this.waiting.length;
  }

  isQueued(playerId) {
    return this.inQueue.has(playerId);
  }

  addWaiting(entry) {
    this.waiting.push(entry);
    this.inQueue.add(entry.playerId);
  }

  popWaiting() {
    while (this.waiting.length > 0) {
      const e = this.waiting.shift();
      if (e && this.inQueue.has(e.playerId)) {
        this.inQueue.delete(e.playerId);
        return e;
      }
    }
    return null;
  }

  remove(playerId) {
    if (!this.inQueue.has(playerId)) return;
    this.inQueue.delete(playerId);
    this.waiting = this.waiting.filter((e) => e.playerId !== playerId);
  }
}
