import type { NotificationEventType } from "@prisma/client";

export interface OrderEmailContext {
  appName: string;
  customerName: string;
  orderNumber: string;
  pickup: string;
  drop: string;
  extra?: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const EVENT_COPY: Record<NotificationEventType, { headline: string; status: string }> = {
  ORDER_CREATED: {
    headline: "Your shipment has been created and is awaiting assignment.",
    status: "CREATED",
  },
  ORDER_ASSIGNED: {
    headline: "A delivery agent has been assigned to your shipment.",
    status: "ASSIGNED",
  },
  ORDER_PICKED_UP: {
    headline: "Your shipment has been picked up.",
    status: "PICKED UP",
  },
  ORDER_IN_TRANSIT: {
    headline: "Your shipment is currently in transit.",
    status: "IN TRANSIT",
  },
  ORDER_OUT_FOR_DELIVERY: {
    headline: "Your shipment is currently out for delivery.",
    status: "OUT FOR DELIVERY",
  },
  ORDER_DELIVERED: {
    headline: "Your shipment has been delivered.",
    status: "DELIVERED",
  },
  ORDER_FAILED: {
    headline: "The latest delivery attempt was unsuccessful. You can reschedule from your dashboard.",
    status: "FAILED",
  },
  ORDER_RESCHEDULED: {
    headline: "Your delivery has been rescheduled.",
    status: "RESCHEDULED",
  },
  ORDER_CANCELLED: {
    headline: "Your order has been cancelled.",
    status: "CANCELLED",
  },
};

export function statusLabel(eventType: NotificationEventType): string {
  return EVENT_COPY[eventType].status;
}

export function renderOrderEmail(eventType: NotificationEventType, context: OrderEmailContext): RenderedEmail {
  const copy = EVENT_COPY[eventType];
  const subject = `Your delivery #${context.orderNumber} is ${copy.status.toLowerCase()}`;
  const extraLine = context.extra ? `\n${context.extra}\n` : "";

  const text = [
    `Hello ${context.customerName},`,
    "",
    copy.headline,
    extraLine,
    `Order:`,
    `#${context.orderNumber}`,
    "",
    `Pickup:`,
    context.pickup,
    "",
    `Drop:`,
    context.drop,
    "",
    `Current status:`,
    copy.status,
    "",
    `Thank you,`,
    context.appName,
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#15202b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e3e8ee;border-radius:10px;padding:28px;">
            <tr>
              <td>
                <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#5b6773;">${escapeHtml(context.appName)}</p>
                <h1 style="margin:0 0 16px;font-size:22px;">Your delivery #${escapeHtml(context.orderNumber)}</h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">Hello ${escapeHtml(context.customerName)},</p>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">${escapeHtml(copy.headline)}</p>
                ${context.extra ? `<p style="margin:0 0 20px;font-size:15px;color:#5b6773;">${escapeHtml(context.extra)}</p>` : ""}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;border-radius:8px;padding:16px;">
                  <tr><td style="padding:6px 0;font-size:13px;color:#5b6773;">Order</td><td style="padding:6px 0;font-size:14px;font-weight:600;">#${escapeHtml(context.orderNumber)}</td></tr>
                  <tr><td style="padding:6px 0;font-size:13px;color:#5b6773;">Pickup</td><td style="padding:6px 0;font-size:14px;">${escapeHtml(context.pickup)}</td></tr>
                  <tr><td style="padding:6px 0;font-size:13px;color:#5b6773;">Drop</td><td style="padding:6px 0;font-size:14px;">${escapeHtml(context.drop)}</td></tr>
                  <tr><td style="padding:6px 0;font-size:13px;color:#5b6773;">Current status</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${escapeHtml(copy.status)}</td></tr>
                </table>
                <p style="margin:24px 0 0;font-size:14px;color:#5b6773;">Thank you,<br>${escapeHtml(context.appName)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
