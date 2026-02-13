import PDFDocument from "pdfkit";
import { formatCurrency, CurrencyCode } from "./currency";

interface InvoiceForPdf {
    invoiceNumber: string;
    customerName: string;
    issueDate: Date;
    dueDate: Date;
    status: string;
    total: number;
    amountPaid: number;
    balanceDue: number;
    currency: string;
    taxRate: number;
    taxAmount: number;
    lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
    }>;
    payments: Array<{
        amount: number;
        paymentDate: Date;
        note: string | null;
    }>;
}

export async function generateInvoicePdf(invoice: InvoiceForPdf): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk: Buffer) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);

        const currency = invoice.currency as CurrencyCode;

        // ── Header ────────────────────────────────────────────────────────
        doc
            .fontSize(28)
            .font("Helvetica-Bold")
            .fillColor("#1a1a2e")
            .text("INVOICE", 50, 50);

        doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor("#666")
            .text(`Invoice #: ${invoice.invoiceNumber}`, 50, 90)
            .text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 50, 105)
            .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 50, 120);

        // Status badge
        const statusColors: Record<string, string> = {
            PAID: "#10b981",
            DRAFT: "#f59e0b",
            OVERDUE: "#ef4444",
        };
        const statusColor = statusColors[invoice.status] || "#6b7280";
        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor(statusColor)
            .text(invoice.status, 450, 50, { align: "right" });

        // Customer
        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor("#1a1a2e")
            .text("Bill To:", 50, 155)
            .fontSize(11)
            .font("Helvetica")
            .fillColor("#333")
            .text(invoice.customerName, 50, 172);

        // ── Line Items Table ──────────────────────────────────────────────
        let y = 210;

        // Table header
        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor("#fff");

        doc.rect(50, y, 495, 22).fill("#1a1a2e");

        doc
            .fillColor("#fff")
            .text("Description", 55, y + 6, { width: 220 })
            .text("Qty", 280, y + 6, { width: 60, align: "center" })
            .text("Unit Price", 340, y + 6, { width: 90, align: "right" })
            .text("Total", 440, y + 6, { width: 100, align: "right" });

        y += 22;

        // Table rows
        doc.font("Helvetica").fontSize(9).fillColor("#333");

        invoice.lineItems.forEach((item, index) => {
            if (index % 2 === 0) {
                doc.rect(50, y, 495, 20).fill("#f8f9fa");
            }

            doc
                .fillColor("#333")
                .text(item.description, 55, y + 5, { width: 220 })
                .text(item.quantity.toString(), 280, y + 5, { width: 60, align: "center" })
                .text(formatCurrency(item.unitPrice, currency), 340, y + 5, { width: 90, align: "right" })
                .text(formatCurrency(item.lineTotal, currency), 440, y + 5, { width: 100, align: "right" });

            y += 20;
        });

        // ── Totals ────────────────────────────────────────────────────────
        y += 15;
        doc.moveTo(350, y).lineTo(545, y).stroke("#e5e7eb");
        y += 10;

        const subtotal = invoice.lineItems.reduce((sum, li) => sum + li.lineTotal, 0);

        doc.fontSize(10).font("Helvetica");

        // Subtotal
        doc
            .fillColor("#666")
            .text("Subtotal:", 350, y, { width: 100, align: "right" })
            .text(formatCurrency(subtotal, currency), 460, y, { width: 85, align: "right" });
        y += 18;

        // Tax
        if (invoice.taxRate > 0) {
            doc
                .text(`Tax (${invoice.taxRate}%):`, 350, y, { width: 100, align: "right" })
                .text(formatCurrency(invoice.taxAmount, currency), 460, y, { width: 85, align: "right" });
            y += 18;
        }

        // Total
        doc.font("Helvetica-Bold").fillColor("#1a1a2e");
        doc
            .text("Total:", 350, y, { width: 100, align: "right" })
            .text(formatCurrency(invoice.total, currency), 460, y, { width: 85, align: "right" });
        y += 18;

        // Amount Paid
        doc.font("Helvetica").fillColor("#10b981");
        doc
            .text("Amount Paid:", 350, y, { width: 100, align: "right" })
            .text(`-${formatCurrency(invoice.amountPaid, currency)}`, 460, y, { width: 85, align: "right" });
        y += 18;

        // Balance Due
        doc.font("Helvetica-Bold").fillColor(invoice.balanceDue > 0 ? "#ef4444" : "#10b981");
        doc
            .text("Balance Due:", 350, y, { width: 100, align: "right" })
            .text(formatCurrency(invoice.balanceDue, currency), 460, y, { width: 85, align: "right" });

        // ── Payments ──────────────────────────────────────────────────────
        if (invoice.payments.length > 0) {
            y += 40;
            doc
                .fontSize(12)
                .font("Helvetica-Bold")
                .fillColor("#1a1a2e")
                .text("Payment History", 50, y);
            y += 20;

            doc.fontSize(9).font("Helvetica").fillColor("#666");
            invoice.payments.forEach((payment) => {
                doc
                    .fillColor("#333")
                    .text(new Date(payment.paymentDate).toLocaleDateString(), 55, y)
                    .text(formatCurrency(payment.amount, currency), 200, y)
                    .text(payment.note || "-", 320, y);
                y += 16;
            });
        }

        // ── Footer ────────────────────────────────────────────────────────
        doc
            .fontSize(8)
            .font("Helvetica")
            .fillColor("#999")
            .text(
                "This is a computer-generated invoice. Thank you for your business.",
                50,
                750,
                { align: "center", width: 495 }
            );

        doc.end();
    });
}
