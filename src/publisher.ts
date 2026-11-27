import type { Broker } from "./broker.js";
import type { Message } from "./types.js";

export class Publisher<T = string> {
  constructor(private readonly broker: Broker<T>) {}

  publish(payload: T): Message<T> {
    return this.broker.append(payload);
  }
}
