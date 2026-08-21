import type { Request, Response } from "express";
import { notificationService } from "../services/notification.service.js";
import { success } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { param } from "../utils/params.js";
import { prisma } from "../config/prisma.js";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await notificationService.listForUser(req.user!.id, req.user!.role));
});

export const retryNotification = asyncHandler(async (req: Request, res: Response) => {
  return success(res, await notificationService.retry(param(req, "id")), "Notification retry queued");
});

export const sendTestEmail = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.sendTestEmail(req.body.email);
  return success(res, result, result.sent ? "Test email sent" : "Test email failed");
});

export const listCustomers = asyncHandler(async (_req: Request, res: Response) => {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, name: true, email: true, phone: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return success(res, customers);
});
