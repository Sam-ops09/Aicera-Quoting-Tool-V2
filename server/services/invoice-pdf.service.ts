// server/services/invoice-pdf.service.ts
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { Quote, QuoteItem, Client } from "@shared/schema";

interface InvoicePdfData {
    quote: Quote;
    client: Client;
    items: QuoteItem[];
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    companyGSTIN?: string;
    preparedBy?: string;
    invoiceNumber: string;
    dueDate: Date;
    paidAmount?: string | number;
    paymentStatus?: string;
}

/**
 * Optimized InvoicePDFService for A4 format
 * - Compact layout with efficient space usage
 * - All content fits within A4 boundaries
 * - Responsive scaling for varying content lengths
 */
export class InvoicePDFService {
    // A4 dimensions (595.28 x 841.89 points)
    private static readonly PAGE_WIDTH = 595.28;
    private static readonly PAGE_HEIGHT = 841.89;
    private static readonly MARGIN_LEFT = 35;
    private static readonly MARGIN_RIGHT = 35;
    private static readonly MARGIN_TOP = 35;
    private static readonly MARGIN_BOTTOM = 70;
    private static readonly CONTENT_WIDTH =
        InvoicePDFService.PAGE_WIDTH -
        InvoicePDFService.MARGIN_LEFT -
        InvoicePDFService.MARGIN_RIGHT;

    // Compact color palette
    private static readonly PRIMARY = "#1e3a8a";
    private static readonly TEXT = "#0f172a";
    private static readonly MUTED = "#475569";
    private static readonly BORDER = "#cbd5e1";
    private static readonly BG_SOFT = "#f8fafc";
    private static readonly BG_ALT = "#fafbfc";
    private static readonly ACCENT_LINE = "#3b82f6";
    private static readonly CURRENCY_PREFIX = "Rs. ";

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    static generateInvoicePDF(data: InvoicePdfData): PDFKit.PDFDocument {
        const doc = new PDFDocument({
            size: "A4",
            margins: {
                top: this.MARGIN_TOP,
                bottom: this.MARGIN_BOTTOM,
                left: this.MARGIN_LEFT,
                right: this.MARGIN_RIGHT,
            },
            bufferPages: true,
        });

        this.drawCompactHeader(doc, data);
        this.drawInvoiceInfoCompact(doc, data);
        this.drawClientInfoCompact(doc, data);
        this.drawProductsTable(doc, data);
        this.drawCompactTotals(doc, data);
        this.drawPaymentAndNotes(doc, data);

        // Footer on all pages
        const range = doc.bufferedPageRange();
        const total = range.count;
        for (let i = 0; i < total; i++) {
            doc.switchToPage(i);
            this.drawFooter(doc, data, i + 1, total);
        }

        doc.end();
        return doc;
    }

    // ========================================================================
    // COMPACT HEADER (80pt height)
    // ========================================================================
    private static drawCompactHeader(
        doc: InstanceType<typeof PDFDocument>,
        data: InvoicePdfData
    ) {
        const headerH = 80;
        const logoSize = 40;
        const topMargin = 15;

        doc.save();

        // Clean header background
        doc.rect(0, 0, this.PAGE_WIDTH, headerH).fill("#FFFFFF");

        // Logo
        try {
            let logoPath = path.join(process.cwd(), "client", "public", "AICERA_Logo.png");
            if (!fs.existsSync(logoPath)) {
                logoPath = path.join(process.cwd(), "client", "public", "logo.png");
            }
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, this.MARGIN_LEFT, topMargin, { fit: [logoSize, logoSize] });
            } else {
                doc
                    .fontSize(12)
                    .font("Helvetica-Bold")
                    .fillColor(this.PRIMARY)
                    .text(data.companyName || "AICERA", this.MARGIN_LEFT, topMargin + 12);
            }
        } catch {
            doc
                .fontSize(12)
                .font("Helvetica-Bold")
                .fillColor(this.PRIMARY)
                .text(data.companyName || "AICERA", this.MARGIN_LEFT, topMargin + 12);
        }

        // Company info (compact, right-aligned)
        const companyInfoW = 240;
        const companyInfoX = this.PAGE_WIDTH - this.MARGIN_RIGHT - companyInfoW;
        let yy = topMargin;

        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY)
            .text(data.companyName || "AICERA Systems", companyInfoX, yy, {
                width: companyInfoW,
                align: "right",
                lineBreak: false,
                ellipsis: true,
            });
        yy += 12;

        if (data.companyAddress) {
            const addressLines = data.companyAddress.split("\n").filter(Boolean);
            const compactAddress = addressLines.slice(0, 2).join(", ");
            doc
                .fontSize(7)
                .font("Helvetica")
                .fillColor(this.MUTED)
                .text(compactAddress, companyInfoX, yy, {
                    width: companyInfoW,
                    align: "right",
                    height: 14,
                });
            yy += 14;
        }

        const contactLine: string[] = [];
        if (data.companyPhone) contactLine.push(`Ph: ${data.companyPhone}`);
        if (data.companyEmail) contactLine.push(data.companyEmail);

        if (contactLine.length > 0) {
            doc
                .fontSize(6.5)
                .font("Helvetica")
                .fillColor(this.MUTED)
                .text(contactLine.join(" | "), companyInfoX, yy, {
                    width: companyInfoW,
                    align: "right",
                    lineBreak: false,
                });
        }

        // INVOICE title (centered)
        const titleY = 55;
        doc
            .fontSize(16)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY)
            .text("INVOICE", this.MARGIN_LEFT, titleY, {
                width: this.CONTENT_WIDTH,
                align: "center",
            });

        // Accent line
        doc
            .strokeColor(this.ACCENT_LINE)
            .lineWidth(1.5)
            .moveTo(this.MARGIN_LEFT, headerH - 2)
            .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, headerH - 2)
            .stroke();

        doc.restore();
        doc.y = headerH + 8;
    }

    // ========================================================================
    // COMPACT INVOICE INFO (Single line layout - 55pt height)
    // ========================================================================
    private static drawInvoiceInfoCompact(
        doc: InstanceType<typeof PDFDocument>,
        data: InvoicePdfData
    ) {
        const startY = doc.y;
        const boxH = 55;

        doc.save();
        doc.rect(this.MARGIN_LEFT, startY, this.CONTENT_WIDTH, boxH);
        doc.fillAndStroke(this.BG_SOFT, this.BORDER);

        // Header
        doc.rect(this.MARGIN_LEFT, startY, this.CONTENT_WIDTH, 22).fill("#dbeafe");
        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY)
            .text("INVOICE DETAILS", this.MARGIN_LEFT + 12, startY + 7);

        // Four columns in one row
        const colWidth = this.CONTENT_WIDTH / 4;
        let x = this.MARGIN_LEFT + 10;
        const y = startY + 30;

        doc.fontSize(7).font("Helvetica-Bold").fillColor(this.MUTED);

        // Invoice Number
        doc.text("Invoice Number", x, y);
        doc.font("Helvetica").fillColor(this.TEXT).text(data.invoiceNumber, x, y + 10, {
            width: colWidth - 15,
            lineBreak: false,
            ellipsis: true,
        });

        // Invoice Date
        x += colWidth;
        doc.font("Helvetica-Bold").fillColor(this.MUTED).text("Invoice Date", x, y);
        doc
            .font("Helvetica")
            .fillColor(this.TEXT)
            .text(new Date(data.quote.quoteDate).toLocaleDateString("en-IN"), x, y + 10);

        // Due Date
        x += colWidth;
        doc.font("Helvetica-Bold").fillColor(this.MUTED).text("Due Date", x, y);
        doc
            .font("Helvetica")
            .fillColor(this.TEXT)
            .text(data.dueDate.toLocaleDateString("en-IN"), x, y + 10);

        // Quote Number
        x += colWidth;
        doc.font("Helvetica-Bold").fillColor(this.MUTED).text("Quote Number", x, y);
        doc.font("Helvetica").fillColor(this.TEXT).text(data.quote.quoteNumber, x, y + 10, {
            width: colWidth - 15,
            lineBreak: false,
            ellipsis: true,
        });

        doc.restore();
        doc.y = startY + boxH + 12;
    }

    // ========================================================================
    // COMPACT CLIENT INFO (85pt height)
    // ========================================================================
    private static drawClientInfoCompact(
        doc: InstanceType<typeof PDFDocument>,
        data: InvoicePdfData
    ) {
        const startY = doc.y;
        const gap = 8;
        const colW = (this.CONTENT_WIDTH - gap) / 2;
        const leftX = this.MARGIN_LEFT;
        const rightX = this.MARGIN_LEFT + colW + gap;
        const boxH = 85;

        doc.save();

        // BILL TO
        doc.rect(leftX, startY, colW, boxH).fillAndStroke(this.BG_SOFT, this.BORDER);
        doc.rect(leftX, startY, colW, 20).fill("#dbeafe");
        doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY)
            .text("BILL TO", leftX + 10, startY + 6);

        let y = startY + 26;
        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(this.TEXT)
            .text(data.client.name, leftX + 10, y, {
                width: colW - 20,
                lineBreak: false,
                ellipsis: true,
            });
        y += 12;

        if (data.client.billingAddress) {
            doc
                .fontSize(7)
                .font("Helvetica")
                .fillColor(this.MUTED)
                .text(data.client.billingAddress, leftX + 10, y, {
                    width: colW - 20,
                    height: 28,
                    lineGap: 1,
                    ellipsis: true,
                });
            y += 30;
        }

        if ((data.client as any).gstin) {
            doc
                .fontSize(7)
                .text(`GSTIN: ${(data.client as any).gstin}`, leftX + 10, y, {
                    width: colW - 20,
                    lineBreak: false,
                });
        }

        // SHIP TO
        doc.rect(rightX, startY, colW, boxH).fillAndStroke(this.BG_SOFT, this.BORDER);
        doc.rect(rightX, startY, colW, 20).fill("#dbeafe");
        doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY)
            .text("SHIP TO", rightX + 10, startY + 6);

        y = startY + 26;
        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(this.TEXT)
            .text(data.client.name, rightX + 10, y, {
                width: colW - 20,
                lineBreak: false,
                ellipsis: true,
            });
        y += 12;

        const shipAddr = (data.client as any).shippingAddress || data.client.billingAddress;
        if (shipAddr) {
            doc
                .fontSize(7)
                .font("Helvetica")
                .fillColor(this.MUTED)
                .text(shipAddr, rightX + 10, y, {
                    width: colW - 20,
                    height: 28,
                    lineGap: 1,
                    ellipsis: true,
                });
        }

        doc.restore();
        doc.y = startY + boxH + 12;
    }

    // ========================================================================
    // PRODUCTS TABLE (Compact with smart pagination)
    // ========================================================================
    private static drawProductsTable(
        doc: InstanceType<typeof PDFDocument>,
        data: InvoicePdfData
    ) {
        const headerH = 24;
        const minRowH = 18;

        // Optimized column widths for A4
        const col = {
            sn: 30,
            desc: 210,
            qty: 40,
            unit: 45,
            rate: 70,
            amount: this.CONTENT_WIDTH - (30 + 210 + 40 + 45 + 70),
        } as const;

        const x0 = this.MARGIN_LEFT;
        const cx = {
            sn: x0,
            desc: x0 + col.sn,
            qty: x0 + col.sn + col.desc,
            unit: x0 + col.sn + col.desc + col.qty,
            rate: x0 + col.sn + col.desc + col.qty + col.unit,
            amount: x0 + col.sn + col.desc + col.qty + col.unit + col.rate,
            rightEdge: x0 + this.CONTENT_WIDTH,
        } as const;

        const drawTableHeader = (yPos: number) => {
            doc.save();
            doc.rect(x0, yPos, this.CONTENT_WIDTH, headerH).fill(this.PRIMARY);

            doc.fontSize(8).font("Helvetica-Bold").fillColor("#FFFFFF");
            doc.text("S.N.", cx.sn + 2, yPos + 8, { width: col.sn - 4, align: "center" });
            doc.text("DESCRIPTION", cx.desc + 4, yPos + 8, { width: col.desc - 8 });
            doc.text("QTY", cx.qty + 2, yPos + 8, { width: col.qty - 4, align: "center" });
            doc.text("UNIT", cx.unit + 2, yPos + 8, { width: col.unit - 4, align: "center" });
            doc.text("RATE", cx.rate + 2, yPos + 8, { width: col.rate - 4, align: "right" });
            doc.text("AMOUNT", cx.amount + 2, yPos + 8, { width: col.amount - 4, align: "right" });

            // Vertical lines
            doc.strokeColor(this.BORDER).lineWidth(0.5);
            [cx.sn, cx.desc, cx.qty, cx.unit, cx.rate, cx.amount, cx.rightEdge].forEach((x) => {
                doc.moveTo(x, yPos).lineTo(x, yPos + headerH).stroke();
            });
            doc.restore();
        };

        const tableTop = doc.y;
        drawTableHeader(tableTop);
        let y = tableTop + headerH;

        data.items.forEach((it, idx) => {
            const desc = (it as any).description ?? "";
            const qty = Number((it as any).quantity ?? 0);
            const unit = (it as any).unit ?? "pcs";
            const rate = Number((it as any).unitPrice ?? 0);
            const amount = qty * rate;

            const descHeight = doc.heightOfString(desc, {
                width: col.desc - 8,
                align: "left",
            });
            const rowH = Math.max(minRowH, Math.ceil(descHeight) + 8);

            // Check space (leave room for totals: ~180pt)
            if (y + rowH + 180 > this.PAGE_HEIGHT - this.MARGIN_BOTTOM) {
                doc.addPage();
                this.drawCompactHeader(doc, data);
                y = doc.y;
                drawTableHeader(y);
                y += headerH;
            }

            // Alternating background
            if (idx % 2 === 0) {
                doc.save();
                doc.rect(x0, y, this.CONTENT_WIDTH, rowH).fill(this.BG_ALT);
                doc.restore();
            }

            doc.fontSize(7.5).font("Helvetica").fillColor(this.TEXT);

            doc.text(String(idx + 1), cx.sn + 2, y + 5, { width: col.sn - 4, align: "center" });
            doc.text(desc, cx.desc + 4, y + 5, {
                width: col.desc - 8,
                height: rowH - 8,
            });
            doc.text(String(qty), cx.qty + 2, y + 5, { width: col.qty - 4, align: "center" });
            doc.text(String(unit), cx.unit + 2, y + 5, { width: col.unit - 4, align: "center" });
            doc.text(this.currency(rate), cx.rate + 2, y + 5, { width: col.rate - 4, align: "right" });
            doc.text(this.currency(amount), cx.amount + 2, y + 5, {
                width: col.amount - 4,
                align: "right",
            });

            // Row separator
            doc.save();
            doc.strokeColor(this.BORDER).lineWidth(0.5);
            doc.moveTo(x0, y + rowH).lineTo(cx.rightEdge, y + rowH).stroke();
            doc.restore();

            y += rowH;
        });

        doc.y = y + 10;
    }

    // ========================================================================
    // COMPACT TOTALS (Right-aligned, ~120pt height)
    // ========================================================================
    private static drawCompactTotals(
        doc: InstanceType<typeof PDFDocument>,
        data: InvoicePdfData
    ) {
        const quote = data.quote as any;
        const x = this.PAGE_WIDTH - this.MARGIN_RIGHT - 240;
        const w = 240;

        const lines: Array<{ label: string; value: number; color?: string }> = [
            { label: "Subtotal:", value: Number(quote.subtotal) || 0 },
        ];

        if (Number(quote.discount) > 0) {
            lines.push({ label: "Discount:", value: -Number(quote.discount), color: "#dc2626" });
        }
        if (Number(quote.shippingCharges) > 0) {
            lines.push({ label: "Shipping:", value: Number(quote.shippingCharges) });
        }
        if (Number(quote.cgst) > 0) {
            lines.push({ label: "CGST (9%):", value: Number(quote.cgst) });
        }
        if (Number(quote.sgst) > 0) {
            lines.push({ label: "SGST (9%):", value: Number(quote.sgst) });
        }
        if (Number(quote.igst) > 0) {
            lines.push({ label: "IGST (18%):", value: Number(quote.igst) });
        }

        const boxH = lines.length * 16 + 50;
        const boxTop = doc.y;

        doc.save();
        doc.rect(x, boxTop, w, boxH).fillAndStroke("#ffffff", this.BORDER);
        doc.rect(x, boxTop, w, 22).fill("#dbeafe");
        doc.fontSize(8).font("Helvetica-Bold").fillColor(this.PRIMARY).text("SUMMARY", x + 12, boxTop + 7);

        let y = boxTop + 32;
        const labelX = x + 12;
        const valueW = 100;
        const valueX = x + w - 12 - valueW;

        doc.fontSize(8).font("Helvetica");

        lines.forEach((ln) => {
            doc.fillColor(this.MUTED).text(ln.label, labelX, y);
            doc.fillColor(ln.color || this.TEXT).text(this.currency(ln.value), valueX, y, {
                width: valueW,
                align: "right",
            });
            y += 16;
        });

        // Total band
        y += 3;
        doc.rect(x, y - 3, w, 26).fill(this.PRIMARY);
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#FFFFFF").text("TOTAL:", labelX, y + 7);
        doc
            .fontSize(10)
            .fillColor("#FFFFFF")
            .text(this.currency(Number(quote.total) || 0), valueX - 8, y + 6, { width: valueW + 8, align: "right" });

        doc.restore();
        doc.y = boxTop + boxH + 12;
    }

    // ========================================================================
    // PAYMENT INFO & NOTES (Combined, ~90pt height)
    // ========================================================================
    private static drawPaymentAndNotes(
        doc: InstanceType<typeof PDFDocument>,
        data: InvoicePdfData
    ) {
        const startY = doc.y;
        const leftW = this.CONTENT_WIDTH * 0.55;
        const rightW = this.CONTENT_WIDTH * 0.4;
        const gap = this.CONTENT_WIDTH - leftW - rightW;
        const boxH = 75;

        doc.save();

        // Notes section (left)
        if ((data.quote as any).notes) {
            doc
                .fontSize(8)
                .font("Helvetica-Bold")
                .fillColor(this.PRIMARY)
                .text("PAYMENT TERMS:", this.MARGIN_LEFT, startY);

            doc
                .fontSize(7)
                .font("Helvetica")
                .fillColor(this.TEXT)
                .text((data.quote as any).notes, this.MARGIN_LEFT, startY + 12, {
                    width: leftW,
                    height: 50,
                    lineGap: 1,
                });
        }

        // Payment status (right)
        const boxX = this.PAGE_WIDTH - this.MARGIN_RIGHT - rightW;
        doc.rect(boxX, startY, rightW, boxH).fillAndStroke(this.BG_SOFT, this.BORDER);
        doc.rect(boxX, startY, rightW, 20).fill("#dbeafe");
        doc.fontSize(8).font("Helvetica-Bold").fillColor(this.PRIMARY).text("PAYMENT STATUS", boxX + 10, startY + 6);

        let y = startY + 30;
        const labelX = boxX + 10;
        const valueX = boxX + 90;

        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(this.MUTED).text("Status:", labelX, y);

        const rawStatus = data.paymentStatus || "pending";
        const status = rawStatus.toLowerCase();
        const statusColor = status === "paid" ? "#10b981" : status === "partial" ? "#f59e0b" : "#ef4444";

        doc.font("Helvetica-Bold").fillColor(statusColor).text(status.toUpperCase(), valueX, y);
        y += 16;

        doc.font("Helvetica-Bold").fillColor(this.MUTED).text("Paid:", labelX, y);
        doc.font("Helvetica").fillColor(this.TEXT).text(this.currency(Number(data.paidAmount) || 0), valueX, y);

        // Signature section
        y = startY + boxH + 15;
        const sigW = rightW;
        const sigX = boxX;

        doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY)
            .text("For " + (data.companyName || "AICERA Systems"), sigX, y, {
                width: sigW,
                align: "center",
            });

        doc.moveTo(sigX + 15, y + 40).lineTo(sigX + sigW - 15, y + 40).stroke();

        doc
            .fontSize(7)
            .font("Helvetica")
            .fillColor(this.TEXT)
            .text("Authorized Signatory", sigX, y + 45, {
                width: sigW,
                align: "center",
            });

        doc.restore();
        doc.y = startY + boxH + 65;
    }

    // ========================================================================
    // FOOTER (Compact, 55pt height)
    // ========================================================================
    private static drawFooter(
        doc: InstanceType<typeof PDFDocument>,
        data: InvoicePdfData,
        page: number,
        total: number
    ) {
        const footerH = 55;
        const footerY = this.PAGE_HEIGHT - footerH;

        const prevBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        doc.save();

        doc.rect(0, footerY, this.PAGE_WIDTH, footerH).fill("#f8fafc");
        doc.strokeColor(this.ACCENT_LINE).lineWidth(1.5).moveTo(0, footerY).lineTo(this.PAGE_WIDTH, footerY).stroke();

        let y = footerY + 10;

        doc
            .fontSize(8)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY)
            .text(data.companyName || "AICERA Systems", 0, y, {
                width: this.PAGE_WIDTH,
                align: "center",
                lineBreak: false,
            });
        y += 11;

        const contactParts: string[] = [];
        if (data.companyPhone) contactParts.push(`Ph: ${data.companyPhone}`);
        if (data.companyEmail) contactParts.push(data.companyEmail);

        if (contactParts.length > 0) {
            doc
                .fontSize(6.5)
                .font("Helvetica")
                .fillColor(this.MUTED)
                .text(contactParts.join(" | "), 0, y, {
                    width: this.PAGE_WIDTH,
                    align: "center",
                    height: 16,
                });
        }

        y += 18;

        doc
            .fontSize(7)
            .fillColor(this.MUTED)
            .text(`Page ${page} of ${total}`, 0, y, {
                width: this.PAGE_WIDTH,
                align: "center",
                lineBreak: false,
            });

        doc.restore();
        doc.page.margins.bottom = prevBottom;
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================
    private static currency(v: number | string): string {
        const n = Number(v) || 0;
        return (
            this.CURRENCY_PREFIX +
            n.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })
        );
    }
}