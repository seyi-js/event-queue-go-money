import type { Broker } from "./broker.js";
import { trace } from "./trace.js";
import type { Consumer, Handler } from "./types.js";

/**
 * Reads messages from a broker and keeps its own read position.
 *
 * On subscribe it catches up from the start of the log (offset 0), then the
 * broker notifies it whenever a new message is published. Because delivery is
 * driven by the offset, every message is processed exactly once and in order.
 */
export class Subscriber<T = string> implements Consumer {
  private offset = 0;
  private draining = false;

  constructor(
    readonly id: string,
    private readonly broker: Broker<T>,
    private readonly handler: Handler<T>,
  ) {}

  /** Subscribe to the broker. Subscribing more than once is a no-op. */
  subscribe(): boolean {
    if (!this.broker.register(this)) return false;
    this.drain();
    return true;
  }

  drain(): void {
    // Guard against re-entry, e.g. a handler that publishes a message.
    // The outer loop picks up anything appended meanwhile.
    if (this.draining) {
      trace(this.id, "drain → already draining, skipped (outer loop will catch up)");
      return;
    }
    this.draining = true;
    try {
      let batch = this.broker.read(this.offset);
      trace(this.id, `drain from offset=${this.offset} → ${batch.length} new message(s)`);
      while (batch.length > 0) {
        for (const message of batch) {
          this.handler(message);
          this.offset = message.offset + 1;
        }
        batch = this.broker.read(this.offset);
        if (batch.length > 0) trace(this.id, `read again from offset=${this.offset} → ${batch.length} more`);
      }
      trace(this.id, `drain done, offset now ${this.offset}`);
    } finally {
      this.draining = false;
    }
  }

  get position(): number {
    return this.offset;
  }

  get isSubscribed(): boolean {
    return this.broker.isRegistered(this.id);
  }
}
