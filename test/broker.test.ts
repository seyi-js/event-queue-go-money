import { describe, expect, it } from "vitest";
import { Broker, Publisher, Subscriber } from "../src/index.js";

function collector<T>() {
  const received: T[] = [];
  return { received, handler: (m: { payload: T }) => received.push(m.payload) };
}

describe("Broker", () => {
  it("runs the sequence from the brief: 20 message logs in total", () => {
    const broker = new Broker<string>();
    const publisher = new Publisher(broker);
    const s1 = collector<string>();
    const s2 = collector<string>();

    for (let i = 1; i <= 5; i++) publisher.publish(`m${i}`);
    new Subscriber("s1", broker, s1.handler).subscribe();
    for (let i = 6; i <= 10; i++) publisher.publish(`m${i}`);
    new Subscriber("s2", broker, s2.handler).subscribe();

    const expected = Array.from({ length: 10 }, (_, i) => `m${i + 1}`);
    expect(s1.received).toEqual(expected);
    expect(s2.received).toEqual(expected);
    expect(s1.received.length + s2.received.length).toBe(20);
  });

  it("replays from offset 0 for a late subscriber", () => {
    const broker = new Broker<string>();
    broker.append("a");
    broker.append("b");
    const c = collector<string>();
    new Subscriber("late", broker, c.handler).subscribe();
    expect(c.received).toEqual(["a", "b"]);
  });

  it("treats a second subscribe as a no-op", () => {
    const broker = new Broker<string>();
    const c = collector<string>();
    const sub = new Subscriber("s", broker, c.handler);
    broker.append("a");

    expect(sub.subscribe()).toBe(true);
    expect(sub.subscribe()).toBe(false);
    broker.append("b");

    expect(c.received).toEqual(["a", "b"]);
    expect(sub.position).toBe(2);
  });

  it("ignores a different instance with the same id", () => {
    const broker = new Broker<string>();
    const c = collector<string>();
    new Subscriber("dup", broker, c.handler).subscribe();
    expect(new Subscriber("dup", broker, c.handler).subscribe()).toBe(false);
    broker.append("x");
    expect(c.received).toEqual(["x"]);
  });

  it("delivers messages in publish order", () => {
    const broker = new Broker<number>();
    const c = collector<number>();
    new Subscriber("s", broker, c.handler).subscribe();
    for (let i = 0; i < 100; i++) broker.append(i);
    expect(c.received).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it("keeps an independent read position per subscriber", () => {
    const broker = new Broker<string>();
    broker.append("a");
    const s1 = new Subscriber("s1", broker, () => {});
    s1.subscribe();
    broker.append("b");
    const s2 = new Subscriber("s2", broker, () => {});
    expect(s1.position).toBe(2);
    expect(s2.position).toBe(0);
    s2.subscribe();
    expect(s2.position).toBe(2);
  });

  it("does not deliver to a subscriber that has not subscribed", () => {
    const broker = new Broker<string>();
    const c = collector<string>();
    new Subscriber("idle", broker, c.handler);
    broker.append("a");
    expect(c.received).toEqual([]);
  });

  it("delivers exactly once when a handler publishes", () => {
    const broker = new Broker<string>();
    const publisher = new Publisher(broker);
    const seen: string[] = [];
    new Subscriber("echo", broker, (m) => {
      seen.push(m.payload);
      if (m.payload === "ping") publisher.publish("pong");
    }).subscribe();
    publisher.publish("ping");
    expect(seen).toEqual(["ping", "pong"]);
  });

  it("supports non-string message types", () => {
    type Event = { type: "created"; id: number } | { type: "deleted"; id: number };
    const broker = new Broker<Event>();
    const c = collector<Event>();
    new Subscriber<Event>("s", broker, c.handler).subscribe();
    broker.append({ type: "created", id: 1 });
    broker.append({ type: "deleted", id: 1 });
    expect(c.received.map((e) => e.type)).toEqual(["created", "deleted"]);
  });

  it("rejects invalid read offsets", () => {
    const broker = new Broker<string>();
    expect(() => broker.read(-1)).toThrow(RangeError);
  });
});
