import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import prisma from "../../config/database";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { AuthRequest, optionalAuth } from "../../middleware/auth.middleware";
import { generateInvoicePdf } from "../../utils/pdf";

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────────────

const addPaymentSchema = z.object({
    amount: z.number().positive("Amount must be greater than 0"),
    note: z.string().max(500).optional(),
});

// ── Helper: check overdue status ────────────────────────────────────────────

function checkOverdueStatus(invoice: { dueDate: Date; status: string }): string {
    if (invoice.status === "PAID") return "PAID";
    if (new Date(invoice.dueDate) < new Date() && invoice.status !== "PAID") return "OVERDUE";
    return invoice.status;
}

// ── GET /api/invoices — List invoices ───────────────────────────────────────

router.get("/", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, archived, page = "1", limit = "10" } = req.query;

        const where: any = {};
        if (status && typeof status === "string") where.status = status;
        if (archived === "true") where.isArchived = true;
        else if (archived === "false") where.isArchived = false;
        else where.isArchived = false; // default: hide archived

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
        const skip = (pageNum - 1) * limitNum;

        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                include: {
                    lineItems: true,
                    payments: { orderBy: { paymentDate: "desc" } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limitNum,
            }),
            prisma.invoice.count({ where }),
        ]);

        // Auto-detect overdue status
        const enrichedInvoices = invoices.map((inv) => ({
            ...inv,
            status: checkOverdueStatus(inv),
        }));

        res.json({
            success: true,
            data: {
                invoices: enrichedInvoices,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/invoices/:id — Get invoice details ─────────────────────────────

router.get("/:id", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new ValidationError("Invalid invoice ID");

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                lineItems: true,
                payments: { orderBy: { paymentDate: "desc" } },
                user: { select: { id: true, name: true, email: true } },
            },
        });

        if (!invoice) throw new NotFoundError("Invoice");

        // Auto-detect overdue
        const status = checkOverdueStatus(invoice);
        if (status !== invoice.status) {
            await prisma.invoice.update({ where: { id }, data: { status } });
        }

        res.json({
            success: true,
            data: {
                ...invoice,
                status,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/invoices/:id/payments — Add payment ───────────────────────────

router.post("/:id/payments", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new ValidationError("Invalid invoice ID");

        const parsed = addPaymentSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new ValidationError(parsed.error.errors.map((e) => e.message).join(", "));
        }

        const { amount, note } = parsed.data;

        // Fetch the invoice
        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundError("Invoice");

        if (invoice.status === "PAID") {
            throw new ValidationError("Invoice is already fully paid");
        }

        if (invoice.isArchived) {
            throw new ValidationError("Cannot add payment to an archived invoice");
        }

        // Business rule: amount ≤ balanceDue (no overpayment)
        if (amount > invoice.balanceDue) {
            throw new ValidationError(
                `Payment amount (${amount}) exceeds balance due (${invoice.balanceDue})`
            );
        }

        // Create payment and update invoice atomically
        const newAmountPaid = invoice.amountPaid + amount;
        const newBalanceDue = invoice.total - newAmountPaid;
        const newStatus = newBalanceDue <= 0 ? "PAID" : invoice.status === "OVERDUE" ? "OVERDUE" : "DRAFT";

        const [payment, updatedInvoice] = await prisma.$transaction([
            prisma.payment.create({
                data: {
                    invoiceId: id,
                    amount,
                    note: note || null,
                },
            }),
            prisma.invoice.update({
                where: { id },
                data: {
                    amountPaid: newAmountPaid,
                    balanceDue: newBalanceDue,
                    status: newStatus,
                },
                include: {
                    lineItems: true,
                    payments: { orderBy: { paymentDate: "desc" } },
                },
            }),
        ]);

        res.status(201).json({
            success: true,
            data: {
                payment,
                invoice: updatedInvoice,
            },
        });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/invoices/:id/archive — Archive invoice ────────────────────────

router.post("/:id/archive", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new ValidationError("Invalid invoice ID");

        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundError("Invoice");

        if (invoice.isArchived) {
            throw new ValidationError("Invoice is already archived");
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: { isArchived: true },
        });

        res.json({
            success: true,
            data: updated,
            message: "Invoice archived successfully",
        });
    } catch (err) {
        next(err);
    }
});

// ── POST /api/invoices/:id/restore — Restore invoice ────────────────────────

router.post("/:id/restore", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new ValidationError("Invalid invoice ID");

        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundError("Invoice");

        if (!invoice.isArchived) {
            throw new ValidationError("Invoice is not archived");
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: { isArchived: false },
        });

        res.json({
            success: true,
            data: updated,
            message: "Invoice restored successfully",
        });
    } catch (err) {
        next(err);
    }
});

// ── GET /api/invoices/:id/pdf — Generate PDF ────────────────────────────────

router.get("/:id/pdf", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) throw new ValidationError("Invalid invoice ID");

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                lineItems: true,
                payments: { orderBy: { paymentDate: "desc" } },
            },
        });

        if (!invoice) throw new NotFoundError("Invoice");

        const pdfBuffer = await generateInvoicePdf(invoice);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${invoice.invoiceNumber}.pdf"`
        );
        res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
});

export default router;
