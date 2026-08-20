import type { Request, Response } from "express";
import { orderService } from "../services/order.service.js";
import { created, success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ForbiddenError } from "../utils/errors.js";
import { param } from "../utils/params.js";

export const previewPrice = asyncHandler(async (req: Request, res: Response) => {
  const quote = await orderService.preview(req.body);
  return success(res, quote, "Price preview generated");
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const actor = req.user!;
  const { customerId: requestedCustomerId, ...payload } = req.body as {
    customerId?: string;
  } & Record<string, unknown>;

  let customerId = actor.id;
  if (actor.role === "ADMIN") {
    if (!requestedCustomerId) {
      throw new ForbiddenError("Select a customer when creating an order as admin");
    }
    customerId = requestedCustomerId;
  } else if (actor.role !== "CUSTOMER") {
    throw new ForbiddenError("Only customers and admins can create orders");
  } else {
    customerId = actor.id;
  }

  const order = await orderService.create({
    ...(payload as Omit<Parameters<typeof orderService.create>[0], "customerId" | "actorId">),
    customerId,
    actorId: actor.id,
  });
  return created(res, order, "Order created");
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.list(req.user!, {
    status: req.query.status as never,
    zoneId: req.query.zoneId as string | undefined,
    agentId: req.query.agentId as string | undefined,
    orderType: req.query.orderType as never,
    paymentType: req.query.paymentType as never,
    customerId: req.query.customerId as string | undefined,
  });
  return success(res, orders);
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getById(param(req, "id"), req.user!);
  return success(res, order);
});

export const assignOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.assign(param(req, "id"), req.body.agentId, req.user!.id);
  return success(res, result, "Agent assigned");
});

export const autoAssignOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.autoAssign(param(req, "id"), req.user!.id);
  return success(res, result, "Nearest agent assigned");
});

export const unassignOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.unassign(param(req, "id"), req.user!.id);
  return success(res, order, "Agent unassigned");
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const actor = req.user!;
  const order = await orderService.updateStatus({
    orderId: param(req, "id"),
    nextStatus: req.body.status,
    actorId: actor.id,
    actorRole: actor.role as "ADMIN" | "AGENT" | "CUSTOMER",
    note: req.body.note,
    reason: req.body.reason,
    override: Boolean(req.body.override) && actor.role === "ADMIN",
  });
  return success(res, order, "Status updated");
});

export const rescheduleOrder = asyncHandler(async (req: Request, res: Response) => {
  const actor = req.user!;
  const result = await orderService.reschedule({
    orderId: param(req, "id"),
    actorId: actor.id,
    actorRole: actor.role as "ADMIN" | "AGENT" | "CUSTOMER",
    scheduledDeliveryDate: new Date(req.body.scheduledDeliveryDate),
    note: req.body.note,
  });
  return success(res, result, "Delivery rescheduled");
});

export const getTracking = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getById(param(req, "id"), req.user!);
  return success(res, {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    scheduledDeliveryDate: order.scheduledDeliveryDate,
    assignedAgent: order.assignedAgent,
    pickupAddress: order.pickupAddress,
    dropAddress: order.dropAddress,
    timeline: order.statusHistory,
    attempts: order.attempts,
  });
});

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await orderService.dashboard(req.user!);
  return success(res, data);
});
