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
