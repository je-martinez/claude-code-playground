const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

interface SlackMessage {
  channel: string;
  text: string;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: { type: string; text: string }[];
}

export async function sendSlackMessage(
  channel: string,
  text: string,
  blocks?: SlackBlock[],
): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    throw new Error("SLACK_WEBHOOK_URL environment variable is not set");
  }

  const payload: SlackMessage = { channel, text };
  if (blocks) {
    payload.blocks = blocks;
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Slack API error: ${response.status} ${response.statusText}`,
    );
  }
}

export function formatStalePendingOrdersMessage(
  orders: {
    order_number: string;
    customer_name: string;
    phone: string | null;
    days_pending: number;
    total_amount: number;
  }[],
): { text: string; blocks: SlackBlock[] } {
  const text = `${orders.length} order(s) have been pending for more than 3 days and need follow-up.`;

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `⚠️ ${orders.length} Stale Pending Order(s)`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "The following orders have been pending for more than 3 days:",
      },
    },
  ];

  for (const order of orders) {
    const phone = order.phone || "No phone on file";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `*Order:* ${order.order_number}`,
          `*Customer:* ${order.customer_name}`,
          `*Phone:* ${phone}`,
          `*Days Pending:* ${Math.floor(order.days_pending)}`,
          `*Total:* $${order.total_amount.toFixed(2)}`,
        ].join("\n"),
      },
    });
    blocks.push({ type: "divider" } as SlackBlock);
  }

  return { text, blocks };
}
