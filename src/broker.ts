import { trace } from "./trace.js";
import type { Consumer, Message } from "./types.js";

/**
 * In-memory message broker backed by an append-only log.
 *
 * Messages are never removed when read. Each subscriber keeps its own read
 * position (offset), so many subscribers can read the same log independently
 * and each sees every message exactly once, in publish order.
 */
export class Broker<T = string> {
  private readonly log: Message<T>[] = [];
  private readonly consumers = new Map<string, Consumer>();

  append(payload: T): Message<T> {
    const message: Message<T> = Object.freeze({
      offset: this.log.length,
      payload,
      publishedAt: new Date(),
    });
    this.log.push(message);
    trace("broker", `append offset=${message.offset} → log size ${this.log.length}, notifying ${this.consumers.size} subscriber(s)`);
    for (const consumer of this.consumers.values()) consumer.drain();
    return message;
  }

  read(fromOffset: number, max = Infinity): readonly Message<T>[] {
    if (!Number.isInteger(fromOffset) || fromOffset < 0) {
      throw new RangeError(`Invalid offset: ${fromOffset}`);
    }
    const end = max === Infinity ? undefined : fromOffset + max;
    return this.log.slice(fromOffset, end);
  }

  /** Register a subscriber. Returns false if it was already registered. */
  register(consumer: Consumer): boolean {
    if (this.consumers.has(consumer.id)) {
      trace("broker", `register ${consumer.id} → already registered, no-op`);
      return false;
    }
    this.consumers.set(consumer.id, consumer);
    trace("broker", `register ${consumer.id} → ok (${this.consumers.size} subscriber(s))`);
    return true;
  }

  isRegistered(id: string): boolean {
    return this.consumers.has(id);
  }

  get size(): number {
    return this.log.length;
  }
}
