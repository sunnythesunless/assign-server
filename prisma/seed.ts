import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // Create demo user
    const hashedPassword = await bcrypt.hash("password123", 12);
    const user = await prisma.user.upsert({
        where: { email: "demo@invoice.app" },
        update: {},
        create: {
            email: "demo@invoice.app",
            password: hashedPassword,
            name: "John Doe",
        },
    });

    // Create invoices with line items and payments
    const invoicesData = [
        {
            invoiceNumber: "INV-20260101-0001",
            customerName: "Acme Corporation",
            issueDate: new Date("2026-01-01"),
            dueDate: new Date("2026-02-01"),
            currency: "USD",
            taxRate: 10,
            status: "PAID",
            userId: user.id,
            lineItems: [
                { description: "Website Redesign", quantity: 1, unitPrice: 5000 },
                { description: "SEO Optimization", quantity: 3, unitPrice: 800 },
                { description: "Content Creation", quantity: 10, unitPrice: 150 },
            ],
            payments: [
                { amount: 3000, paymentDate: new Date("2026-01-15"), note: "First installment" },
                { amount: 5900, paymentDate: new Date("2026-01-28"), note: "Final payment" },
            ],
        },
        {
            invoiceNumber: "INV-20260115-0002",
            customerName: "TechStart Inc.",
            issueDate: new Date("2026-01-15"),
            dueDate: new Date("2026-03-15"),
            currency: "USD",
            taxRate: 8,
            status: "DRAFT",
            userId: user.id,
            lineItems: [
                { description: "Mobile App Development", quantity: 1, unitPrice: 12000 },
                { description: "API Integration", quantity: 5, unitPrice: 600 },
                { description: "QA Testing", quantity: 40, unitPrice: 75 },
            ],
            payments: [
                { amount: 5000, paymentDate: new Date("2026-01-20"), note: "Advance payment" },
            ],
        },
        {
            invoiceNumber: "INV-20260201-0003",
            customerName: "Global Retail Ltd.",
            issueDate: new Date("2026-02-01"),
            dueDate: new Date("2026-02-10"),
            currency: "EUR",
            taxRate: 15,
            status: "OVERDUE",
            userId: user.id,
            lineItems: [
                { description: "E-Commerce Platform Setup", quantity: 1, unitPrice: 8000 },
                { description: "Payment Gateway Integration", quantity: 2, unitPrice: 1500 },
                { description: "Inventory Management Module", quantity: 1, unitPrice: 3500 },
            ],
            payments: [],
        },
        {
            invoiceNumber: "INV-20260210-0004",
            customerName: "Creative Studio",
            issueDate: new Date("2026-02-10"),
            dueDate: new Date("2026-04-10"),
            currency: "GBP",
            taxRate: 20,
            status: "DRAFT",
            userId: user.id,
            lineItems: [
                { description: "Brand Identity Design", quantity: 1, unitPrice: 3000 },
                { description: "Social Media Package", quantity: 3, unitPrice: 500 },
                { description: "Print Collateral", quantity: 5, unitPrice: 200 },
            ],
            payments: [],
        },
        {
            invoiceNumber: "INV-20260212-0005",
            customerName: "HealthTech Solutions",
            issueDate: new Date("2026-02-12"),
            dueDate: new Date("2026-03-12"),
            currency: "INR",
            taxRate: 18,
            status: "DRAFT",
            userId: user.id,
            lineItems: [
                { description: "Telemedicine Platform", quantity: 1, unitPrice: 250000 },
                { description: "Patient Portal", quantity: 1, unitPrice: 150000 },
                { description: "Training Sessions", quantity: 10, unitPrice: 5000 },
            ],
            payments: [
                { amount: 100000, paymentDate: new Date("2026-02-13"), note: "Booking advance" },
            ],
        },
    ];

    for (const data of invoicesData) {
        const { lineItems, payments, ...invoiceData } = data;

        // Calculate totals
        const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
        const taxAmount = subtotal * (invoiceData.taxRate / 100);
        const total = subtotal + taxAmount;
        const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const balanceDue = total - amountPaid;

        const invoice = await prisma.invoice.upsert({
            where: { invoiceNumber: invoiceData.invoiceNumber },
            update: {},
            create: {
                ...invoiceData,
                total,
                taxAmount,
                amountPaid,
                balanceDue,
                lineItems: {
                    create: lineItems.map((li) => ({
                        ...li,
                        lineTotal: li.quantity * li.unitPrice,
                    })),
                },
                payments: {
                    create: payments,
                },
            },
        });

        console.log(`  ✅ Invoice ${invoice.invoiceNumber} created`);
    }

    console.log("🎉 Seeding complete!");
}

main()
    .catch((e) => {
        console.error("❌ Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
