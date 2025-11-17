import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Quote, QuoteItem, Client } from "@shared/schema";
import path from "path";
import fs from "fs";

interface QuoteWithDetails {
    quote: Quote;
    client: Client;
    items: QuoteItem[];
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    companyGSTIN?: string;
}

type InvoicePdfData = QuoteWithDetails & {
    invoiceNumber: string;
    dueDate: Date;
};

export class PDFService {
    // Page dimensions and margins
    private static readonly PAGE_WIDTH = 595.28; // A4 width in points
    private static readonly PAGE_HEIGHT = 841.89; // A4 height in points
    private static readonly MARGIN_LEFT = 40;
    private static readonly MARGIN_RIGHT = 40;
    private static readonly MARGIN_TOP = 140; // Extra space for header with logo
    private static readonly MARGIN_BOTTOM = 100; // Reserved for footer
    private static readonly CONTENT_WIDTH =
        PDFService.PAGE_WIDTH - PDFService.MARGIN_LEFT - PDFService.MARGIN_RIGHT;

    // Colors - Professional commercial proposal theme
    private static readonly PRIMARY_COLOR = "#1e3a8a"; // Darker blue for professionalism
    private static readonly SECONDARY_COLOR = "#475569"; // Slate gray
    private static readonly ACCENT_COLOR = "#0f172a"; // Dark slate
    private static readonly LIGHT_GRAY = "#f8fafc"; // Very light gray
    private static readonly BORDER_COLOR = "#cbd5e1"; // Light slate border
    private static readonly HEADER_BG = "#1e40af"; // Blue header background

    /**
     * QUOTE PDF
     */
    static generateQuotePDF(data: QuoteWithDetails): PDFKit.PDFDocument {
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

        // FIRST PAGE HEADER
        this.drawHeader(doc, data, "COMMERCIAL PROPOSAL");

        // MAIN BODY
        this.drawDocumentInfo(doc, data);
        this.drawClientSection(doc, data);
        this.drawLineItemsTable(doc, data, "COMMERCIAL PROPOSAL");
        this.drawTotalsSection(doc, data.quote);

        if (data.quote.notes) {
            this.drawNotesSection(doc, data.quote.notes);
        }

        if (data.quote.termsAndConditions) {
            this.drawTermsAndConditions(doc, data.quote.termsAndConditions);
        }

        this.drawAdvancedSections(doc, data, "COMMERCIAL PROPOSAL");

        // FOOTERS FOR ALL PAGES (after all content is drawn)
        const pageRange = doc.bufferedPageRange();
        const pageCount = pageRange.count;

        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            this.drawFooter(doc, data, i + 1, pageCount, "COMMERCIAL PROPOSAL");
        }

        doc.end();
        return doc;
    }

    /**
     * INVOICE PDF
     */
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

        // Header
        this.drawHeader(doc, data, "INVOICE");

        // Invoice specific info block
        this.drawInvoiceInfo(doc, data);

        // Client block
        this.drawClientSection(doc, data);

        // Line items
        this.drawLineItemsTable(doc, data, "INVOICE");

        // Totals
        this.drawTotalsSection(doc, data.quote);

        // Notes (optional)
        if (data.quote.notes) {
            this.drawNotesSection(doc, data.quote.notes);
        }

        // Footer for all pages
        const pageRange = doc.bufferedPageRange();
        const pageCount = pageRange.count;

        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            this.drawFooter(doc, data, i + 1, pageCount, "INVOICE");
        }

        doc.end();
        return doc;
    }

    // ---------------------------------------------------------------------------
    // UTIL: Add new page + header
    // ---------------------------------------------------------------------------
    private static addPageWithHeader(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails,
        title: string
    ) {
        doc.addPage();
        this.drawHeader(doc, data, title);
    }

    // ---------------------------------------------------------------------------
    // HEADER / FOOTER
    // ---------------------------------------------------------------------------
    private static drawHeader(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails,
        title: string
    ) {
        const headerHeight = 140;
        const clientCompanyName = data.client?.name || "Client";

        // Clean white background header
        doc
            .rect(0, 0, this.PAGE_WIDTH, headerHeight)
            .fill("#FFFFFF");

        // Row 1: Logo (left) and Company Info (right)
        const row1Y = 20;
        
        // Add AICERA Logo on the left
        try {
            let logoPath = path.join(process.cwd(), "client", "public", "logo.png");
            
            if (!fs.existsSync(logoPath)) {
                logoPath = path.join(process.cwd(), "client", "public", "AICERA_Logo.png");
            }
            
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, this.MARGIN_LEFT, row1Y, {
                    fit: [60, 60],
                    align: 'left',
                    valign: 'top'
                });
            } else {
                doc
                    .fontSize(16)
                    .font("Helvetica-Bold")
                    .fillColor(this.PRIMARY_COLOR)
                    .text("AICERA", this.MARGIN_LEFT, row1Y + 20);
            }
        } catch (error) {
            console.error("Failed to load logo:", error);
            doc
                .fontSize(16)
                .font("Helvetica-Bold")
                .fillColor(this.PRIMARY_COLOR)
                .text("AICERA", this.MARGIN_LEFT, row1Y + 20);
        }

        // Company Info (right aligned, top right)
        const companyName = data.companyName || "AICERA";
        const companyInfoWidth = 220;
        const companyInfoX = this.PAGE_WIDTH - this.MARGIN_RIGHT - companyInfoWidth;
        let companyInfoY = row1Y;

        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text(companyName, companyInfoX, companyInfoY, {
                width: companyInfoWidth,
                align: "right",
            });

        companyInfoY += 11;
        if (data.companyAddress) {
            const addressLines = data.companyAddress.split("\n").filter((line) => line.trim());
            const compactAddress = addressLines.slice(0, 2).join(", ");
            doc
                .fontSize(7)
                .font("Helvetica")
                .fillColor(this.SECONDARY_COLOR)
                .text(compactAddress, companyInfoX, companyInfoY, {
                    width: companyInfoWidth,
                    align: "right",
                    lineGap: 1,
                });
            companyInfoY += 16;
        }

        if (data.companyPhone) {
            doc
                .fontSize(7)
                .font("Helvetica")
                .fillColor(this.SECONDARY_COLOR)
                .text(`Phone: ${data.companyPhone}`, companyInfoX, companyInfoY, {
                    width: companyInfoWidth,
                    align: "right",
                });
            companyInfoY += 9;
        }

        if (data.companyEmail) {
            doc
                .fontSize(7)
                .font("Helvetica")
                .fillColor(this.SECONDARY_COLOR)
                .text(`Email: ${data.companyEmail}`, companyInfoX, companyInfoY, {
                    width: companyInfoWidth,
                    align: "right",
                });
        }

        // Row 2: Title Section (starts after logo row)
        const titleY = 85;
        
        doc
            .fontSize(20)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text(title, this.MARGIN_LEFT, titleY, {
                width: this.CONTENT_WIDTH,
                align: "center",
            });

        // Prepared for label
        doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor(this.SECONDARY_COLOR)
            .text("Prepared for", this.MARGIN_LEFT, titleY + 25, {
                width: this.CONTENT_WIDTH,
                align: "center",
            });

        // Client company name
        doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .fillColor(this.ACCENT_COLOR)
            .text(clientCompanyName, this.MARGIN_LEFT, titleY + 38, {
                width: this.CONTENT_WIDTH,
                align: "center",
            });

        // Separator line
        doc
            .strokeColor("#3b82f6")
            .lineWidth(2)
            .moveTo(this.MARGIN_LEFT, headerHeight - 5)
            .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, headerHeight - 5)
            .stroke();

        // Content Y start
        doc.y = headerHeight + 15;
    }

    private static drawFooter(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails,
        pageNumber: number,
        totalPages: number,
        title: string
    ) {
        const footerHeight = 85;
        const footerY = this.PAGE_HEIGHT - footerHeight - 5;

        // Temporarily disable bottom margin so footer text doesn't trigger a new page
        const originalBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        // Footer background
        doc
            .rect(0, footerY, this.PAGE_WIDTH, footerHeight)
            .fill("#f8fafc");

        // Top border line (thicker blue line)
        doc
            .strokeColor("#3b82f6")
            .lineWidth(2)
            .moveTo(0, footerY)
            .lineTo(this.PAGE_WIDTH, footerY)
            .stroke();

        const companyName = data.companyName || "AICERA";
        const footerTitle = `${companyName} | ${title}`;

        // Center title
        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text(footerTitle, this.MARGIN_LEFT, footerY + 8, {
                width: this.CONTENT_WIDTH,
                align: "center",
            });

        // Company info section (left side, compact)
        let infoY = footerY + 26;
        doc
            .fontSize(7)
            .font("Helvetica")
            .fillColor(this.SECONDARY_COLOR);

        if (data.companyAddress) {
            const addressLines = data.companyAddress
                .split("\n")
                .filter((line) => line.trim());
            const compactAddress = addressLines.slice(0, 2).join(", ");
            doc.text(compactAddress, this.MARGIN_LEFT, infoY, {
                width: this.CONTENT_WIDTH * 0.5,
                lineGap: 1,
            });
            infoY += 18;
        }

        // Contact info (right side, compact)
        const contactX = this.PAGE_WIDTH - this.MARGIN_RIGHT - 160;
        let contactY = footerY + 26;

        if (data.companyPhone) {
            doc.text(`Ph: ${data.companyPhone}`, contactX, contactY, {
                width: 160,
                align: "right",
            });
            contactY += 9;
        }
        if (data.companyEmail) {
            doc.text(`Email: ${data.companyEmail}`, contactX, contactY, {
                width: 160,
                align: "right",
            });
            contactY += 9;
        }
        if (data.companyWebsite) {
            doc.text(`Web: ${data.companyWebsite}`, contactX, contactY, {
                width: 160,
                align: "right",
            });
            contactY += 9;
        }
        if (data.companyGSTIN) {
            doc.text(`GSTIN: ${data.companyGSTIN}`, contactX, contactY, {
                width: 160,
                align: "right",
            });
        }

        // Page number (bottom right)
        doc
            .fontSize(8)
            .font("Helvetica")
            .fillColor(this.SECONDARY_COLOR)
            .text(
                `Page ${pageNumber} of ${totalPages}`,
                this.MARGIN_LEFT,
                footerY + footerHeight - 12,
                {
                    width: this.CONTENT_WIDTH,
                    align: "right",
                }
            );

        // Restore margin
        doc.page.margins.bottom = originalBottomMargin;
    }

    // ---------------------------------------------------------------------------
    // TOP BLOCKS
    // ---------------------------------------------------------------------------
    private static drawDocumentInfo(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        const startY = doc.y;
        const labelWidth = 110;
        const valueX = this.MARGIN_LEFT + labelWidth;

        let y = startY;

        // Quote Number
        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(this.SECONDARY_COLOR)
            .text("Quote No.:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
        doc
            .font("Helvetica")
            .fillColor("#000000")
            .text(data.quote.quoteNumber, valueX, y, { continued: false });

        y += 15;

        // Date
        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(this.SECONDARY_COLOR)
            .text("Date:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
        doc
            .font("Helvetica")
            .fillColor("#000000")
            .text(
                new Date(data.quote.quoteDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }),
                valueX,
                y
            );

        y += 15;

        // Payment Terms
        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(this.SECONDARY_COLOR)
            .text("Payment Terms:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
        doc
            .font("Helvetica")
            .fillColor("#000000")
            .text("30 days from the date of Invoice", valueX, y);

        y += 15;

        // Quote Validity
        const validUntil =
            data.quote.validUntil ||
            new Date(
                new Date(data.quote.quoteDate).getTime() +
                (data.quote.validityDays || 30) * 24 * 60 * 60 * 1000
            );

        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(this.SECONDARY_COLOR)
            .text("Quote Validity:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
        doc
            .font("Helvetica")
            .fillColor("#000000")
            .text(
                `${data.quote.validityDays || 30} days from the quote date`,
                valueX,
                y
            );

        doc.y = y + 20;
    }

    private static drawClientSection(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        const startY = doc.y;
        const labelWidth = 110;
        const valueX = this.MARGIN_LEFT + labelWidth;

        // Bill To section
        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text("Bill To:", this.MARGIN_LEFT, startY);

        let y = startY + 20;

        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(this.ACCENT_COLOR)
            .text("Name:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
        doc
            .font("Helvetica")
            .fillColor("#000000")
            .text(data.client.name, valueX, y);

        y += 15;

        if (data.client.billingAddress) {
            doc
                .fontSize(10)
                .font("Helvetica-Bold")
                .fillColor(this.ACCENT_COLOR)
                .text("Address:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
            doc
                .fontSize(10)
                .font("Helvetica")
                .fillColor("#000000")
                .text(data.client.billingAddress, valueX, y, {
                    width: this.CONTENT_WIDTH - labelWidth - 10,
                    lineGap: 2,
                });
            y = doc.y + 10;
        }

        if (data.client.phone) {
            doc
                .fontSize(10)
                .font("Helvetica-Bold")
                .fillColor(this.ACCENT_COLOR)
                .text("Phone No.:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
            doc
                .font("Helvetica")
                .fillColor("#000000")
                .text(data.client.phone, valueX, y);
            y += 15;
        }

        if (data.client.email) {
            doc
                .fontSize(10)
                .font("Helvetica-Bold")
                .fillColor(this.ACCENT_COLOR)
                .text("Email ID:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
            doc
                .font("Helvetica")
                .fillColor("#1e40af")
                .text(data.client.email, valueX, y);
            y += 15;
        }

        if (data.client.gstin) {
            doc
                .fontSize(10)
                .font("Helvetica-Bold")
                .fillColor(this.ACCENT_COLOR)
                .text("GSTIN:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
            doc
                .font("Helvetica")
                .fillColor("#000000")
                .text(data.client.gstin, valueX, y);
            y += 15;
        }

        // Attention person
        const attentionPerson = data.quote.attentionTo || data.client.contactPerson;
        if (attentionPerson) {
            doc
                .fontSize(10)
                .font("Helvetica-Bold")
                .fillColor(this.ACCENT_COLOR)
                .text("Attn to:", this.MARGIN_LEFT, y, { width: labelWidth, align: "left" });
            doc
                .font("Helvetica")
                .fillColor("#000000")
                .text(attentionPerson, valueX, y);
            y += 20;
        }

        // Ship To section (same as Bill To for this template)
        const shipToX = this.MARGIN_LEFT + this.CONTENT_WIDTH * 0.5;
        const shipToValueX = shipToX + labelWidth;

        doc
            .fontSize(12)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text("Ship To:", shipToX, startY);

        y = startY + 20;

        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(this.ACCENT_COLOR)
            .text("Name:", shipToX, y, { width: labelWidth, align: "left" });
        doc
            .font("Helvetica")
            .fillColor("#000000")
            .text(data.client.name, shipToValueX, y);

        y += 15;

        if (data.client.billingAddress) {
            doc
                .fontSize(10)
                .font("Helvetica-Bold")
                .fillColor(this.ACCENT_COLOR)
                .text("Address:", shipToX, y, { width: labelWidth, align: "left" });
            doc
                .fontSize(10)
                .font("Helvetica")
                .fillColor("#000000")
                .text(data.client.billingAddress, shipToValueX, y, {
                    width: this.CONTENT_WIDTH * 0.5 - labelWidth - 10,
                    lineGap: 2,
                });
        }

        doc.y = Math.max(doc.y, y) + 30;
    }

    private static drawInvoiceInfo(
        doc: InstanceType<typeof PDFDocument>,
        data: InvoicePdfData
    ) {
        const startY = doc.y;
        const boxHeight = 85;
        const labelWidth = 110;

        doc
            .rect(this.MARGIN_LEFT, startY, this.CONTENT_WIDTH, boxHeight)
            .fillAndStroke("#f8fafc", "#cbd5e1");

        doc
            .rect(this.MARGIN_LEFT, startY, this.CONTENT_WIDTH, 28)
            .fill("#dbeafe");

        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text("INVOICE DETAILS", this.MARGIN_LEFT + 15, startY + 9);

        const leftColX = this.MARGIN_LEFT + 15;
        const leftValueX = leftColX + labelWidth;
        const rightColX = this.MARGIN_LEFT + this.CONTENT_WIDTH * 0.52;
        const rightValueX = rightColX + labelWidth;

        let y = startY + 40;

        doc.fontSize(9).font("Helvetica-Bold").fillColor(this.SECONDARY_COLOR);
        doc.text("Invoice Number:", leftColX, y, { width: labelWidth, align: "left" });
        doc.font("Helvetica").fillColor("#000000");
        doc.text(data.invoiceNumber, leftValueX, y);

        y += 17;

        doc.fontSize(9).font("Helvetica-Bold").fillColor(this.SECONDARY_COLOR);
        doc.text("Invoice Date:", leftColX, y, { width: labelWidth, align: "left" });
        doc.font("Helvetica").fillColor("#000000");
        doc.text(
            new Date(data.quote.quoteDate).toLocaleDateString(),
            leftValueX,
            y
        );

        // Right column
        y = startY + 40;
        doc.fontSize(9).font("Helvetica-Bold").fillColor(this.SECONDARY_COLOR);
        doc.text("Due Date:", rightColX, y, { width: labelWidth, align: "left" });
        doc.font("Helvetica").fillColor("#000000");
        doc.text(
            data.dueDate.toLocaleDateString(),
            rightValueX,
            y
        );

        y += 17;
        doc.fontSize(9).font("Helvetica-Bold").fillColor(this.SECONDARY_COLOR);
        doc.text("Quote Number:", rightColX, y, { width: labelWidth, align: "left" });
        doc.font("Helvetica").fillColor("#000000");
        doc.text(data.quote.quoteNumber, rightValueX, y);

        doc.y = startY + boxHeight + 20;
    }

    // ---------------------------------------------------------------------------
    // LINE ITEMS TABLE
    // ---------------------------------------------------------------------------

    private static drawProductsTableHeader(
        doc: InstanceType<typeof PDFDocument>
    ) {
        const tableTop = doc.y;
        const headerHeight = 28;

        // Header background
        doc
            .rect(this.MARGIN_LEFT, tableTop, this.CONTENT_WIDTH, headerHeight)
            .fill(this.PRIMARY_COLOR);

        // Column positions
        const col1X = this.MARGIN_LEFT + 10; // S.No
        const col1W = 35;
        const col2X = col1X + col1W; // Description
        const col2W = this.CONTENT_WIDTH - 235;
        const col3X = col2X + col2W; // Qty
        const col3W = 50;
        const col4X = col3X + col3W; // Unit Price
        const col4W = 75;
        const col5X = col4X + col4W; // Amount
        const col5W = 75;

        // Header text
        doc
            .fontSize(9.5)
            .font("Helvetica-Bold")
            .fillColor("#FFFFFF");

        doc.text("S.No", col1X, tableTop + 9, { width: col1W, align: "center" });
        doc.text("Description", col2X + 5, tableTop + 9, {
            width: col2W - 10,
            align: "left",
        });
        doc.text("Qty", col3X, tableTop + 9, { width: col3W, align: "center" });
        doc.text("Unit Price", col4X, tableTop + 9, {
            width: col4W,
            align: "right",
        });
        doc.text("Subtotal", col5X, tableTop + 9, {
            width: col5W,
            align: "right",
        });

        return {
            startY: tableTop + headerHeight,
            col1X,
            col1W,
            col2X,
            col2W,
            col3X,
            col3W,
            col4X,
            col4W,
            col5X,
            col5W,
        };
    }

    private static drawLineItemsTable(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails,
        headerTitle: string
    ) {
        const items = data.items;

        doc.moveDown(0.5);
        const startY = doc.y;

        // Section title
        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text("PRODUCTS & SERVICES", this.MARGIN_LEFT, startY);

        doc.moveDown(0.5);

        let headerInfo = this.drawProductsTableHeader(doc);
        let y = headerInfo.startY;

        doc.fillColor("#000000").font("Helvetica");

        items.forEach((item, index) => {
            // Need new page?
            if (y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 80) {
                this.addPageWithHeader(doc, data, headerTitle);

                doc.moveDown(0.5);
                doc
                    .fontSize(11)
                    .font("Helvetica-Bold")
                    .fillColor(this.PRIMARY_COLOR)
                    .text("PRODUCTS & SERVICES (contd.)", this.MARGIN_LEFT, doc.y);

                doc.moveDown(0.5);
                headerInfo = this.drawProductsTableHeader(doc);
                y = headerInfo.startY;
                doc.fillColor("#000000").font("Helvetica");
            }

            const minRowHeight = 22;
            const descHeight = doc.heightOfString(item.description, {
                width: headerInfo.col2W - 15,
            });
            const actualRowHeight = Math.max(minRowHeight, descHeight + 10);

            // Alternating row background
            if (index % 2 === 0) {
                doc
                    .rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, actualRowHeight)
                    .fill("#fafbfc");
            } else {
                doc
                    .rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, actualRowHeight)
                    .fill("#ffffff");
            }

            // Row border
            doc
                .strokeColor("#e2e8f0")
                .lineWidth(0.5)
                .moveTo(this.MARGIN_LEFT, y + actualRowHeight)
                .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, y + actualRowHeight)
                .stroke();

            doc.fillColor("#000000").fontSize(9).font("Helvetica");

            const textY = y + (actualRowHeight - 12) / 2;

            // S.No
            doc.text(String(index + 1), headerInfo.col1X, textY, {
                width: headerInfo.col1W,
                align: "center",
            });

            // Description
            doc.text(item.description, headerInfo.col2X + 5, y + 6, {
                width: headerInfo.col2W - 15,
                align: "left",
            });

            // Qty
            doc.text(String(item.quantity), headerInfo.col3X, textY, {
                width: headerInfo.col3W,
                align: "center",
            });

            // Unit Price
            doc.text(
                `₹${Number(item.unitPrice).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`,
                headerInfo.col4X,
                textY,
                { width: headerInfo.col4W, align: "right" }
            );

            // Amount
            doc.text(
                `₹${Number(item.subtotal).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}`,
                headerInfo.col5X,
                textY,
                { width: headerInfo.col5W, align: "right" }
            );

            y += actualRowHeight;
        });

        // Bottom border of table
        doc
            .strokeColor(this.PRIMARY_COLOR)
            .lineWidth(1.5)
            .moveTo(this.MARGIN_LEFT, y)
            .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, y)
            .stroke();

        doc.y = y + 20;
    }

    // ---------------------------------------------------------------------------
    // TOTALS
    // ---------------------------------------------------------------------------
    private static drawTotalsSection(
        doc: InstanceType<typeof PDFDocument>,
        quote: Quote
    ) {
        doc.moveDown(0.5);
        const startY = doc.y;

        const boxWidth = 270;
        const boxX = this.PAGE_WIDTH - this.MARGIN_RIGHT - boxWidth;

        let lineCount = 2; // subtotal + total
        if (Number(quote.discount) > 0) lineCount++;
        if (Number(quote.shippingCharges) > 0) lineCount++;
        if (Number(quote.cgst) > 0) lineCount++;
        if (Number(quote.sgst) > 0) lineCount++;
        if (Number(quote.igst) > 0) lineCount++;

        const boxHeight = lineCount * 19 + 58;

        // Shadow
        doc.rect(boxX + 2, startY + 2, boxWidth, boxHeight).fill("#d1d5db");

        // Main
        doc.rect(boxX, startY, boxWidth, boxHeight).fillAndStroke("#ffffff", "#cbd5e1");

        // Title bar
        doc.rect(boxX, startY, boxWidth, 26).fill("#dbeafe");

        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text("FINANCIAL SUMMARY", boxX + 15, startY + 8);

        doc.fillColor("#000000");

        let y = startY + 38;
        const labelX = boxX + 15;
        const valueX = boxX + boxWidth - 20;

        const formatCurrency = (v: number) =>
            `₹${Number(v).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`;

        doc.fontSize(9.5).font("Helvetica");
        doc.fillColor(this.SECONDARY_COLOR).text("Subtotal:", labelX, y);
        doc.fillColor("#000000");
        doc.text(formatCurrency(Number(quote.subtotal)), valueX - 100, y, {
            width: 100,
            align: "right",
        });
        y += 19;

        if (Number(quote.discount) > 0) {
            doc.fillColor(this.SECONDARY_COLOR).text("Discount:", labelX, y);
            doc.fillColor("#dc2626");
            doc.text(`-${formatCurrency(Number(quote.discount))}`, valueX - 100, y, {
                width: 100,
                align: "right",
            });
            y += 19;
        }

        if (Number(quote.shippingCharges) > 0) {
            doc.fillColor(this.SECONDARY_COLOR).text("Shipping & Handling:", labelX, y);
            doc.fillColor("#000000");
            doc.text(formatCurrency(Number(quote.shippingCharges)), valueX - 100, y, {
                width: 100,
                align: "right",
            });
            y += 19;
        }

        doc.fontSize(8.5);

        if (Number(quote.cgst) > 0) {
            doc.fillColor(this.SECONDARY_COLOR).text("CGST (9%):", labelX + 10, y);
            doc.fillColor("#000000");
            doc.text(formatCurrency(Number(quote.cgst)), valueX - 100, y, {
                width: 100,
                align: "right",
            });
            y += 17;
        }

        if (Number(quote.sgst) > 0) {
            doc.fillColor(this.SECONDARY_COLOR).text("SGST (9%):", labelX + 10, y);
            doc.fillColor("#000000");
            doc.text(formatCurrency(Number(quote.sgst)), valueX - 100, y, {
                width: 100,
                align: "right",
            });
            y += 17;
        }

        if (Number(quote.igst) > 0) {
            doc.fillColor(this.SECONDARY_COLOR).text("IGST (18%):", labelX + 10, y);
            doc.fillColor("#000000");
            doc.text(formatCurrency(Number(quote.igst)), valueX - 100, y, {
                width: 100,
                align: "right",
            });
            y += 17;
        }

        y += 5;
        doc.rect(boxX, y - 4, boxWidth, 30).fill(this.PRIMARY_COLOR);

        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .fillColor("#FFFFFF")
            .text("TOTAL AMOUNT:", labelX, y + 8);

        doc.fontSize(12);
        doc.text(formatCurrency(Number(quote.total)), valueX - 120, y + 7, {
            width: 120,
            align: "right",
        });

        doc.y = startY + boxHeight + 20;
    }

    // ---------------------------------------------------------------------------
    // NOTES / TERMS
    // ---------------------------------------------------------------------------
    private static drawNotesSection(
        doc: InstanceType<typeof PDFDocument>,
        notes: string
    ) {
        if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 120) {
            doc.addPage();
            // header is already drawn on this page by earlier logic
        }

        doc.moveDown(0.8);
        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text("NOTES", this.MARGIN_LEFT, doc.y);

        doc.moveDown(0.4);

        doc.fontSize(9).font("Helvetica");
        const notesHeight =
            doc.heightOfString(notes, {
                width: this.CONTENT_WIDTH - 20,
            }) + 20;

        doc
            .rect(this.MARGIN_LEFT, doc.y, this.CONTENT_WIDTH, notesHeight)
            .fillAndStroke("#fffbeb", "#fbbf24");

        doc
            .fontSize(9)
            .font("Helvetica")
            .fillColor("#78350f")
            .text(notes, this.MARGIN_LEFT + 10, doc.y + 10, {
                width: this.CONTENT_WIDTH - 20,
                align: "left",
                lineGap: 3,
            });

        doc.y = doc.y + notesHeight + 15;
    }

    private static drawTermsAndConditions(
        doc: InstanceType<typeof PDFDocument>,
        terms: string
    ) {
        if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 180) {
            doc.addPage();
        }

        doc.moveDown(0.8);
        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .fillColor(this.PRIMARY_COLOR)
            .text("TERMS & CONDITIONS", this.MARGIN_LEFT, doc.y);

        doc.moveDown(0.4);

        const termLines = terms.split("\n").filter((line) => line.trim());

        doc.fontSize(8.5).font("Helvetica");
        let termsHeight = 20;

        termLines.forEach((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            const displayText = trimmedLine.match(/^[\d•\-*]/)
                ? trimmedLine
                : `• ${trimmedLine}`;
            termsHeight +=
                doc.heightOfString(displayText, {
                    width: this.CONTENT_WIDTH - 20,
                }) + 6;
        });

        doc
            .rect(this.MARGIN_LEFT, doc.y, this.CONTENT_WIDTH, termsHeight)
            .fillAndStroke("#f8fafc", "#cbd5e1");

        doc.fontSize(8.5).font("Helvetica").fillColor("#1e293b");

        let currentY = doc.y + 10;
        termLines.forEach((line) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            const displayLine = trimmedLine.match(/^[\d•\-*]/)
                ? trimmedLine
                : `• ${trimmedLine}`;

            doc.text(displayLine, this.MARGIN_LEFT + 10, currentY, {
                width: this.CONTENT_WIDTH - 20,
                align: "left",
                lineGap: 2,
            });

            currentY +=
                doc.heightOfString(displayLine, {
                    width: this.CONTENT_WIDTH - 20,
                }) + 4;
        });

        doc.y = doc.y + termsHeight + 15;
    }

    // ---------------------------------------------------------------------------
    // ADVANCED SECTIONS (BOM, SLA, TIMELINE)
    // ---------------------------------------------------------------------------
    private static drawAdvancedSections(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails,
        headerTitle: string
    ) {
        const quote = data.quote;

        // Ensure some space at bottom before adding advanced sections
        if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 150) {
            this.addPageWithHeader(doc, data, headerTitle);
        }

        // ---------------------- BOM ----------------------
        if (quote.bomSection) {
            try {
                const bomData = JSON.parse(quote.bomSection);
                if (bomData && bomData.length > 0) {
                    doc.moveDown(0.8);

                    doc
                        .fontSize(11)
                        .font("Helvetica-Bold")
                        .fillColor(this.PRIMARY_COLOR)
                        .text("BILL OF MATERIALS (BOM)", this.MARGIN_LEFT, doc.y);

                    doc.moveDown(0.5);

                    bomData.forEach((item: any, index: number) => {
                        if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 120) {
                            this.addPageWithHeader(doc, data, headerTitle);
                            doc.moveDown(0.5);
                        }

                        const itemStartY = doc.y;
                        const itemHeight = 80;

                        doc
                            .rect(this.MARGIN_LEFT, itemStartY, this.CONTENT_WIDTH, itemHeight)
                            .fillAndStroke("#f8fafc", "#cbd5e1");

                        doc
                            .fontSize(10)
                            .font("Helvetica-Bold")
                            .fillColor(this.ACCENT_COLOR)
                            .text(
                                `Item ${index + 1}: ${item.partNumber || ""}`,
                                this.MARGIN_LEFT + 10,
                                itemStartY + 8
                            );

                        let y = itemStartY + 25;
                        doc.fontSize(9).font("Helvetica").fillColor("#000000");

                        if (item.description) {
                            doc.text(`Description: ${item.description}`, this.MARGIN_LEFT + 10, y, {
                                width: this.CONTENT_WIDTH - 20,
                            });
                            y = doc.y + 3;
                        }

                        if (item.manufacturer) {
                            doc.text(
                                `Manufacturer: ${item.manufacturer}`,
                                this.MARGIN_LEFT + 10,
                                y
                            );
                            y += 12;
                        }

                        if (item.quantity) {
                            doc.text(
                                `Quantity: ${item.quantity} ${
                                    item.unitOfMeasure || "units"
                                }`,
                                this.MARGIN_LEFT + 10,
                                y
                            );
                            y += 12;
                        }

                        if (item.specifications) {
                            doc.text(
                                `Specifications: ${item.specifications}`,
                                this.MARGIN_LEFT + 10,
                                y,
                                {
                                    width: this.CONTENT_WIDTH - 20,
                                }
                            );
                        }

                        doc.y = itemStartY + itemHeight + 8;
                    });
                }
            } catch (e) {
                console.error("Failed to parse BOM section:", e);
            }
        }

        // ---------------------- SLA ----------------------
        if (quote.slaSection) {
            try {
                const slaData = JSON.parse(quote.slaSection);
                if (slaData && (slaData.overview || slaData.metrics?.length > 0)) {
                    if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 150) {
                        this.addPageWithHeader(doc, data, headerTitle);
                    }

                    doc.moveDown(0.8);
                    doc
                        .fontSize(11)
                        .font("Helvetica-Bold")
                        .fillColor(this.PRIMARY_COLOR)
                        .text("SERVICE LEVEL AGREEMENT (SLA)", this.MARGIN_LEFT, doc.y);

                    doc.moveDown(0.5);

                    if (slaData.overview) {
                        doc
                            .fontSize(9)
                            .font("Helvetica")
                            .fillColor("#000000")
                            .text(slaData.overview, this.MARGIN_LEFT, doc.y, {
                                width: this.CONTENT_WIDTH,
                                lineGap: 2,
                            });
                        doc.moveDown(0.5);
                    }

                    if (
                        slaData.responseTime ||
                        slaData.resolutionTime ||
                        slaData.availability ||
                        slaData.supportHours
                    ) {
                        const boxStartY = doc.y;
                        const boxHeight = 70;

                        doc
                            .rect(this.MARGIN_LEFT, boxStartY, this.CONTENT_WIDTH, boxHeight)
                            .fillAndStroke("#ecfdf5", "#10b981");

                        let y = boxStartY + 10;
                        doc.fontSize(9).font("Helvetica").fillColor("#065f46");

                        if (slaData.responseTime) {
                            doc.text(
                                `✓ Response Time: ${slaData.responseTime}`,
                                this.MARGIN_LEFT + 10,
                                y
                            );
                            y += 15;
                        }
                        if (slaData.resolutionTime) {
                            doc.text(
                                `✓ Resolution Time: ${slaData.resolutionTime}`,
                                this.MARGIN_LEFT + 10,
                                y
                            );
                            y += 15;
                        }
                        if (slaData.availability) {
                            doc.text(
                                `✓ System Availability: ${slaData.availability}`,
                                this.MARGIN_LEFT + 10,
                                y
                            );
                            y += 15;
                        }
                        if (slaData.supportHours) {
                            doc.text(
                                `✓ Support Hours: ${slaData.supportHours}`,
                                this.MARGIN_LEFT + 10,
                                y
                            );
                        }

                        doc.y = boxStartY + boxHeight + 10;
                    }

                    if (slaData.metrics && slaData.metrics.length > 0) {
                        doc.moveDown(0.3);
                        doc
                            .fontSize(10)
                            .font("Helvetica-Bold")
                            .fillColor(this.SECONDARY_COLOR)
                            .text("Performance Metrics:", this.MARGIN_LEFT, doc.y);

                        doc.moveDown(0.3);

                        slaData.metrics.forEach((metric: any) => {
                            if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 80) {
                                this.addPageWithHeader(doc, data, headerTitle);
                            }

                            doc
                                .fontSize(9)
                                .font("Helvetica-Bold")
                                .fillColor("#000000");
                            doc.text(
                                `• ${metric.name} - Target: ${metric.target}`,
                                this.MARGIN_LEFT + 5,
                                doc.y
                            );

                            if (metric.description) {
                                doc.font("Helvetica").fillColor(this.SECONDARY_COLOR);
                                doc.text(metric.description, this.MARGIN_LEFT + 15, doc.y + 2, {
                                    width: this.CONTENT_WIDTH - 20,
                                });
                            }

                            doc.moveDown(0.3);
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to parse SLA section:", e);
            }
        }

        // ---------------------- TIMELINE ----------------------
        if (quote.timelineSection) {
            try {
                const timelineData = JSON.parse(quote.timelineSection);
                if (
                    timelineData &&
                    (timelineData.projectOverview || timelineData.milestones?.length > 0)
                ) {
                    if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 150) {
                        this.addPageWithHeader(doc, data, headerTitle);
                    }

                    doc.moveDown(0.8);
                    doc
                        .fontSize(11)
                        .font("Helvetica-Bold")
                        .fillColor(this.PRIMARY_COLOR)
                        .text("PROJECT TIMELINE", this.MARGIN_LEFT, doc.y);

                    doc.moveDown(0.5);

                    if (timelineData.projectOverview) {
                        doc
                            .fontSize(9)
                            .font("Helvetica")
                            .fillColor("#000000")
                            .text(timelineData.projectOverview, this.MARGIN_LEFT, doc.y, {
                                width: this.CONTENT_WIDTH,
                                lineGap: 2,
                            });
                        doc.moveDown(0.4);
                    }

                    if (timelineData.startDate || timelineData.endDate) {
                        const dateBoxY = doc.y;
                        doc
                            .rect(this.MARGIN_LEFT, dateBoxY, this.CONTENT_WIDTH, 35)
                            .fillAndStroke("#dbeafe", "#3b82f6");

                        doc
                            .fontSize(9)
                            .font("Helvetica-Bold")
                            .fillColor(this.PRIMARY_COLOR);

                        let y = dateBoxY + 10;

                        if (timelineData.startDate) {
                            doc.text(
                                `Project Start: ${new Date(
                                    timelineData.startDate
                                ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}`,
                                this.MARGIN_LEFT + 10,
                                y
                            );
                            y += 14;
                        }

                        if (timelineData.endDate) {
                            doc.text(
                                `Project End: ${new Date(
                                    timelineData.endDate
                                ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}`,
                                this.MARGIN_LEFT + 10,
                                y
                            );
                        }

                        doc.y = dateBoxY + 45;
                    }

                    if (timelineData.milestones && timelineData.milestones.length > 0) {
                        doc.moveDown(0.3);

                        timelineData.milestones.forEach((milestone: any, index: number) => {
                            if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 80) {
                                this.addPageWithHeader(doc, data, headerTitle);
                            }

                            const milestoneY = doc.y;
                            const milestoneHeight = 60;

                            let statusColor = "#cbd5e1";
                            let statusBg = "#f8fafc";
                            if (milestone.status === "Completed") {
                                statusColor = "#10b981";
                                statusBg = "#ecfdf5";
                            } else if (milestone.status === "In Progress") {
                                statusColor = "#f59e0b";
                                statusBg = "#fffbeb";
                            } else if (milestone.status === "Pending") {
                                statusColor = "#3b82f6";
                                statusBg = "#eff6ff";
                            }

                            doc
                                .rect(
                                    this.MARGIN_LEFT,
                                    milestoneY,
                                    this.CONTENT_WIDTH,
                                    milestoneHeight
                                )
                                .fillAndStroke(statusBg, statusColor);

                            doc
                                .fontSize(10)
                                .font("Helvetica-Bold")
                                .fillColor(this.ACCENT_COLOR)
                                .text(
                                    `${index + 1}. ${milestone.name}`,
                                    this.MARGIN_LEFT + 10,
                                    milestoneY + 8
                                );

                            // Status badge
                            doc.fontSize(8).fillColor(statusColor);
                            doc.text(
                                `[${milestone.status || "Not Started"}]`,
                                this.MARGIN_LEFT + 10,
                                milestoneY + 24
                            );

                            let y = milestoneY + 24;
                            doc.fontSize(8.5).font("Helvetica").fillColor("#000000");

                            if (milestone.startDate || milestone.endDate || milestone.duration) {
                                let dateStr = "";
                                if (milestone.startDate) {
                                    dateStr += `Start: ${new Date(
                                        milestone.startDate
                                    ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    })}`;
                                }
                                if (milestone.endDate) {
                                    dateStr += ` | End: ${new Date(
                                        milestone.endDate
                                    ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    })}`;
                                }
                                if (milestone.duration) {
                                    dateStr += ` | Duration: ${milestone.duration}`;
                                }
                                doc.text(dateStr, this.MARGIN_LEFT + 80, y);
                            }

                            if (milestone.description) {
                                doc.text(
                                    milestone.description,
                                    this.MARGIN_LEFT + 10,
                                    y + 12,
                                    {
                                        width: this.CONTENT_WIDTH - 20,
                                    }
                                );
                            }

                            doc.y = milestoneY + milestoneHeight + 8;
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to parse Timeline section:", e);
            }
        }
    }
}