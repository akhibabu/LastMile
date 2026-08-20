import type { NotificationEventType, NotificationStatus, OrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { createEmailService } from "./email/index.js";
import { renderOrderEmail } from "./email/templates.js";
import { loadEnv } from "../config/env.js";

const STATUS_EVENT_MAP: Partial<Record<OrderStatus, NotificationEventType>> = {
  CREATED: "ORDER_CREATED",
  ASSIGNED: "ORDER_ASSIGNED",
  PICKED_UP: "ORDER_PICKED_UP",
  IN_TRANSIT: "ORDER_IN_TRANSIT",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  FAILED: "ORDER_FAILED",
  RESCHEDULED: "ORDER_RESCHEDULED",
  CANCELLED: "ORDER_CANCELLED",
};

export class NotificationService {
  private readonly email = createEmailService();

  async sendStatusNotification(orderId: string, status: OrderStatus, extra?: string) {
    const eventType = STATUS_EVENT_MAP[status];
    if (!eventType) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) return;

    const env = loadEnv();
    const rendered = renderOrderEmail(eventType, {
      appName: env.FROM_NAME || "LastMile",
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      pickup: order.pickupAddress,
      drop: order.dropAddress,
      extra,
    });

    await this.dispatch({
      userId: order.customerId,
      orderId: order.id,
      eventType,
      recipient: order.customer.email,
      subject: rendered.subject,
      body: rendered.text,
      html: rendered.html,
    });
  }

  async dispatch(input: {
    userId: string;
    orderId?: string | null;
    eventType: NotificationEventType;
    recipient: string;
    subject: string;
    body: string;
    html?: string;
    notificationId?: string;
  }) {
    const record = input.notificationId
      ? await prisma.notification.update({
          where: { id: input.notificationId },
          data: {
            status: "PENDING",
            errorMessage: null,
          },
        })
      : await prisma.notification.create({
          data: {
            userId: input.userId,
            orderId: input.orderId ?? null,
            channel: "EMAIL",
            eventType: input.eventType,
            recipient: input.recipient,
            subject: input.subject,
            body: input.body,
            status: "PENDING",
          },
        });

    let result;
    try {
      result = await this.email.send({
        to: input.recipient,
        subject: input.subject,
        text: input.body,
        html: input.html,
      });
    } catch (error) {
      result = {
        ok: false,
        provider: "unknown",
        error: error instanceof Error ? error.message : "Unknown email error",
        devMode: false,
      };
    }

    const status: NotificationStatus = result.ok ? (result.devMode ? "LOGGED" : "SENT") : "FAILED";
    const updated = await prisma.notification.update({
      where: { id: record.id },
      data: {
        status,
        providerMessageId: result.messageId,
        errorMessage: result.error ?? null,
        sentAt: status === "SENT" ? new Date() : null,
      },
    });

    if (status === "SENT") {
      logger.info({ notificationId: record.id, eventType: input.eventType, status }, "notification sent");
    } else if (status === "LOGGED") {
      logger.info({ notificationId: record.id, eventType: input.eventType, status }, "notification logged in development");
    } else {
      logger.error({ notificationId: record.id, error: result.error }, "notification failure");
    }

    return updated;
  }

  async retry(notificationId: string) {
    const record = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!record) throw new NotFoundError("Notification not found");
    if (record.status !== "FAILED") {
      throw new AppError("Only failed notifications can be retried", 422, "NOTIFICATION_NOT_RETRYABLE");
    }

    return this.dispatch({
      userId: record.userId,
      orderId: record.orderId,
      eventType: record.eventType,
      recipient: record.recipient,
      subject: record.subject ?? "LastMile delivery update",
      body: record.body,
      notificationId: record.id,
    });
  }

  async listForUser(userId: string, role: string) {
    if (role === "ADMIN") {
      return prisma.notification.findMany({
        include: { user: { select: { name: true, email: true } }, order: { select: { orderNumber: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
    }
    return prisma.notification.findMany({
      where: { userId },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}

export const notificationService = new NotificationService();
