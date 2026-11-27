import { Broker, Publisher, Subscriber, type Message } from "./index.js";

let logCount = 0;
const logger = (name: string) => (m: Message<string>) => {
  logCount++;
  console.log(`[${name}] offset=${m.offset} payload="${m.payload}"`);
};

const broker = new Broker<string>();
const publisher = new Publisher(broker);

for (let i = 1; i <= 5; i++) publisher.publish(`message-${i}`);

const subscriber1 = new Subscriber("subscriber-1", broker, logger("Subscriber1"));
subscriber1.subscribe();
subscriber1.subscribe(); // second subscribe is a no-op

for (let i = 6; i <= 10; i++) publisher.publish(`message-${i}`);

const subscriber2 = new Subscriber("subscriber-2", broker, logger("Subscriber2"));
subscriber2.subscribe();

console.log(`\nTotal message logs: ${logCount} (expected 20)`);

type OrderEvent =
  | { type: "OrderPlaced"; orderId: string; amount: number }
  | { type: "OrderCancelled"; orderId: string };

const orders = new Broker<OrderEvent>();
new Publisher(orders).publish({ type: "OrderPlaced", orderId: "o-1", amount: 42 });
orders.append({ type: "OrderCancelled", orderId: "o-1" });
new Subscriber<OrderEvent>("audit", orders, (m) =>
  console.log(`[Audit] offset=${m.offset}`, m.payload),
).subscribe();
