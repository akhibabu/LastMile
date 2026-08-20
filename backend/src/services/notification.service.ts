import type { NotificationEventType, OrderStatus } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { createEmailProvider } from "./email/index.js";

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

function buildCopy(eventType: NotificationEventType, orderNumber: string, extra?: string) {
  const messages: Record<NotificationEventType, { subject: string; body: string }> = {
    ORDER_CREATED: {
      subject: `Order ${orderNumber} confirmed`,
      body: `Your delivery ${orderNumber} has been created and is awaiting assignment.`,
    },
    ORDER_ASSIGNED: {
      subject: `Order ${orderNumber} assigned`,
      body: `A delivery agent has been assigned to ${orderNumber}.`,
    },
    ORDER_PICKED_UP: {
      subject: `Order ${orderNumber} picked up`,
      body: `Your package ${orderNumber} has been picked up.`,
    },
    ORDER_IN_TRANSIT: {
      subject: `Order ${orderNumber} in transit`,
      body: `Your package ${orderNumber} is on the way.`,
    },
    ORDER_OUT_FOR_DELIVERY: {
      subject: `Order ${orderNumber} out for delivery`,
      body: `Your package ${orderNumber} is out for delivery today.`,
    },
    ORDER_DELIVERED: {
      subject: `Order ${orderNumber} delivered`,
      body: `Your package ${orderNumber} has been delivered.`,
    },
    ORDER_FAILED: {
      subject: `Delivery failed for ${orderNumber}`,
      body: `The delivery attempt for ${orderNumber} failed.${extra ? ` Reason: ${extra}` : ""} You can reschedule from your dashboard.`,
    },
    ORDER_RESCHEDULED: {
      subject: `Order ${orderNumber} rescheduled`,
      body: `Your delivery ${orderNumber} has been rescheduled.${extra ? ` ${extra}` : ""}`,
    },
    ORDER_CANCELLED: {
      subject: `Order ${orderNumber} cancelled`,
      body: `Your order ${orderNumber} has been cancelled.`,
    },
  };
  return messages[eventType];
}

export class NotificationService {
  private readonly email = createEmailProvider();

  async sendStatusNotification(orderId: string, status: OrderStatus, extra?: string) {
    const eventType = STATUS_EVENT_MAP[status];
    if (!eventType) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) return;

    const copy = buildCopy(eventType, order.orderNumber, extra);
    await this.dispatch({
      userId: order.customerId,
      orderId: order.id,
      eventType,
      recipient: order.customer.email,
      subject: copy.subject,
      body: copy.body,
    });
  }

  async dispatch(input: {
    userId: string;
    orderId?: string | null;
    eventType: NotificationEventType;
    recipient: string;
    subject: string;
    body: string;
  }) {
    const record = await prisma.notification.create({
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

    const result = await this.email.send({
      to: input.recipient,
      subject: input.subject,
      text: input.body,
    });

    const status = result.ok ? (result.devMode ? "LOGGED" : "SENT") : "FAILED";
    await prisma.notification.update({
      where: { id: record.id },
      data: {
        status,
        providerMessageId: result.messageId,
        errorMessage: result.error,
      },
    });

    if (result.ok) {
      logger.info(
        { notificationId: record.id, eventType: input.eventType, status },
        "notification sent",
      );
    } else {
      logger.error(
        { notificationId: record.id, error: result.error },
        "notification failure",
      );
    }

    return { ...record, status, providerMessageId: result.messageId };
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
