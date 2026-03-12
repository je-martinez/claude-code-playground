import { open } from "sqlite";
import sqlite3 from "sqlite3";

import { createSchema } from "./schema";
import { getPendingOrders } from "./queries/order_queries";
import { sendSlackMessage, formatStalePendingOrdersMessage } from "./slack";

async function main() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  await createSchema(db, false);

  const staleOrders = await getPendingOrders(db, 3);

  if (staleOrders.length > 0) {
    const { text, blocks } = formatStalePendingOrdersMessage(staleOrders);
    await sendSlackMessage("#order-alerts", text, blocks);
    console.log(`Sent alert for ${staleOrders.length} stale pending order(s).`);
  } else {
    console.log("No stale pending orders found.");
  }
}

main();
