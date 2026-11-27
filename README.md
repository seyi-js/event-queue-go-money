# Event Queue

An in-memory message broker using the publish-subscribe pattern, written in TypeScript.

## Run

```bash
npm install
npm run demo       # runs the sequence from the brief (20 message logs)
npm run demo:trace # same, with broker/subscriber flow tracing (TRACE=1)
npm test           # unit tests (vitest)
npm run typecheck  # tsc --noEmit
```

Requires Node 18 or later.

## Structure

| File                  | Role                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| `src/broker.ts`       | `Broker<T>`: append-only log, subscriber registry, `append` / `read` / `register`   |
| `src/publisher.ts`    | `Publisher<T>`: writes messages to the broker                                       |
| `src/subscriber.ts`   | `Subscriber<T>`: subscribes once, keeps its own offset, processes messages in order |
| `src/types.ts`        | `Message<T>`, `Handler<T>`, `Consumer`                                              |
| `src/demo.ts`         | The example sequence from the brief, plus a non-string payload example              |
| `test/broker.test.ts` | Tests for each requirement                                                          |

## Design decisions

**Append-only log with an offset per subscriber.** "Subscribers must consume messages only once" could be read as a queue that removes messages when they're read. But multiple subscribers read from the same broker, and each keeps its own read position. That only works if the broker keeps every message and each subscriber tracks an offset into the log. "Only once" therefore means each subscriber processes each message exactly once, with no duplicates. It does not mean only one subscriber ever gets a message.

**New subscribers start at offset 0.** In the example sequence, Subscriber1 subscribes after 5 messages and Subscriber2 subscribes after 10, yet both must print all 10. So a subscriber catches up from the start of the log when it subscribes.

**Push with catch-up.** `subscribe()` registers the subscriber and drains the log from its offset. After that, the broker calls `drain()` on each registered subscriber whenever a message is published. Delivery is driven by the subscriber's offset, so a message can't be delivered twice or out of order. A re-entry guard covers handlers that publish messages themselves.

**Subscribing twice does nothing.** Subscribers are registered by `id`. A second `subscribe()` returns `false` and does not reset the offset or register again. A different instance with the same id is also rejected.

**Ordering.** There is one log, offsets only ever increase, and each subscriber processes messages in sequence. So messages are always handled in the order they were published.

**Multiple message types.** `Broker<T>` is generic. You can use strings, objects or discriminated unions; see the `OrderEvent` example in `src/demo.ts`.
