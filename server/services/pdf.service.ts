// server/pdf/PDFService.ts
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { Quote, QuoteItem, Client } from "@shared/schema";

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
    preparedBy?: string;
    abstract?: string;
}

export class PDFService {
    // Page geometry
    private static readonly PAGE_WIDTH = 595.28; // A4
    private static readonly PAGE_HEIGHT = 841.89;
    private static readonly MARGIN_LEFT = 40;
    private static readonly MARGIN_RIGHT = 40;
    private static readonly MARGIN_TOP = 130;
    private static readonly MARGIN_BOTTOM = 80;
    private static readonly CONTENT_WIDTH =
        PDFService.PAGE_WIDTH - PDFService.MARGIN_LEFT - PDFService.MARGIN_RIGHT;

    // Palette (close to your existing)
    private static readonly PRIMARY = "#1e3a8a";     // header/table header
    private static readonly PRIMARY_LIGHT = "#1e40af";
    private static readonly TEXT = "#0f172a";
    private static readonly MUTED = "#475569";
    private static readonly BORDER = "#cbd5e1";
    private static readonly BG_SOFT = "#f8fafc";
    private static readonly BG_ALT = "#fafbfc";
    private static readonly ACCENT_LINE = "#3b82f6";

    // ===== PUBLIC APIS =========================================================
    static generateQuotePDF(data: QuoteWithDetails): PDFKit.PDFDocument {
        // console.log("=== PDF Generation Debug ===");
        // console.log("Quote:", {
        //     quoteNumber: data.quote?.quoteNumber,
        //     status: data.quote?.status,
        //     quoteDate: data.quote?.quoteDate,
        //     validityDays: data.quote?.validityDays,
        //     subtotal: data.quote?.subtotal,
        //     total: data.quote?.total,
        //     notes: data.quote?.notes ? "Present" : "Missing",
        //     termsAndConditions: data.quote?.termsAndConditions ? "Present" : "Missing",
        // });
        // console.log("Client:", {
        //     name: data.client?.name,
        //     email: data.client?.email,
        //     phone: data.client?.phone,
        //     billingAddress: data.client?.billingAddress ? "Present" : "Missing",
        //     shippingAddress: data.client?.shippingAddress ? "Present" : "Missing",
        //     gstin: data.client?.gstin,
        // });
        // console.log("Items count:", data.items?.length || 0);
        // console.log("Company:", {
        //     companyName: data.companyName,
        //     companyAddress: data.companyAddress ? "Present" : "Missing",
        //     companyPhone: data.companyPhone,
        //     companyEmail: data.companyEmail,
        // });
        // console.log("============================");

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

        // (1) COVER PAGE (Template’s Abstract page)
        this.drawCoverPage(doc, data);

        // (2) MAIN PAGES
        this.drawHeader(doc, data, "COMMERCIAL PROPOSAL");
        this.drawTopInfoCompact(doc, data);      // Company/Quote No/Date/Terms/Validity
        this.drawClientTwoColumn(doc, data);     // Bill To | Ship To
        this.drawProductsSection(doc, data);     // Items table
        this.drawNotesAndSignatory(doc, data);   // Notes + Authorized Signatory
        this.drawTermsTable(doc, data);          // T&C in table form (SN | Parameters | Details)
        this.drawAnnexureFromBOM(doc, data);     // Annexure 1 (Detailed BOM), if present

        // (3) FOOTERS on every page
        const range = doc.bufferedPageRange();
        const total = range.count;
        for (let i = 0; i < total; i++) {
            doc.switchToPage(i);
            this.drawFooter(doc, data, i + 1, total, "COMMERCIAL PROPOSAL");
        }

        doc.end();
        return doc;
    }


    // ===== COVER ===============================================================
    private static drawCoverPage(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        this.drawWaveHeader(doc);

        try {
            let logoPath = path.join(process.cwd(), "client", "public", "AICERA_Logo.png");
            if (!fs.existsSync(logoPath)) {
                logoPath = path.join(process.cwd(), "client", "public", "logo.png");
            }
            if (fs.existsSync(logoPath)) {
                const logoY = 180;
                doc.image(logoPath, this.PAGE_WIDTH / 2 - 80, logoY, {
                    fit: [160, 160],
                    align: 'center'
                });
            }
        } catch (e) {
            console.error("Logo error:", e);
        }

        const companyNameY = 360;
        doc.fontSize(48).font("Helvetica-Bold").fillColor("#1a202c")
            .text(data.companyName?.toLowerCase() || "aicera", 0, companyNameY, {
                width: this.PAGE_WIDTH,
                align: "center",
            });

        const titleY = 450;
        doc.fontSize(22).font("Helvetica-Oblique").fillColor("#374151")
            .text("Commercial Proposal", 0, titleY, {
                width: this.PAGE_WIDTH,
                align: "center",
            });

        doc.fontSize(18).font("Helvetica-Oblique").fillColor("#374151")
            .text("For", 0, titleY + 35, {
                width: this.PAGE_WIDTH,
                align: "center",
            });

        doc.fontSize(22).font("Helvetica-Oblique").fillColor("#374151")
            .text(data.client.name, 0, titleY + 65, {
                width: this.PAGE_WIDTH,
                align: "center",
            });

        const abstractY = 600;
        const bottomY = this.PAGE_HEIGHT - 100;
        const authorText = `Author: ${data.preparedBy || data.companyName || "AICERA Systems"}`;
        const maxAbstractHeight = bottomY - (abstractY + 30) - 20;

        doc.fontSize(14).font("Helvetica-Bold").fillColor("#1f2937")
            .text("Abstract", 0, abstractY, {
                width: this.PAGE_WIDTH,
                align: "center",
            });

        const abstractText = data.abstract ||
            `This commercial proposal outlines a comprehensive solution designed to address the specific needs of ${data.client.name} in enhancing their operations and achieving strategic objectives. Our approach leverages industry-leading technologies, innovative methodologies, and customized services to deliver measurable value and sustainable growth.`;

        doc.fontSize(10).font("Helvetica").fillColor("#374151");

        const abstractOptions = {
            width: this.CONTENT_WIDTH - 40,
            align: "justify" as const,
            lineGap: 4
        };

        let finalAbstractText = abstractText;
        let abstractHeight = doc.heightOfString(finalAbstractText, abstractOptions);

        while (abstractHeight > maxAbstractHeight && finalAbstractText.length > 0) {
            finalAbstractText = finalAbstractText.slice(0, -1);
            abstractHeight = doc.heightOfString(finalAbstractText + "...", abstractOptions);
        }

        if (finalAbstractText.length < abstractText.length) {
            finalAbstractText = finalAbstractText.trim() + "...";
        }

        const beforePageCount = doc.bufferedPageRange().count;
        const currentY = doc.y;

        doc.text(finalAbstractText, this.MARGIN_LEFT + 20, abstractY + 30, abstractOptions);

        const afterPageCount = doc.bufferedPageRange().count;

        if (afterPageCount > beforePageCount) {
            doc.switchToPage(0);
        }

        doc.y = bottomY;
        doc.fontSize(11).font("Helvetica").fillColor("#6b7280")
            .text(authorText, this.MARGIN_LEFT, bottomY, {
                width: this.CONTENT_WIDTH,
                align: "right"
            });

        if (afterPageCount === beforePageCount) {
            doc.addPage();
        }
    }

    private static drawWaveHeader(doc: InstanceType<typeof PDFDocument>) {
        doc.save();

        const waveColors = [
            { color: "#3b5998", opacity: 0.9 },
            { color: "#5677b8", opacity: 0.8 },
            { color: "#7191cc", opacity: 0.7 },
        ];

        waveColors.forEach((wave, index) => {
            const yOffset = index * 30;
            const height = 120 - yOffset;

            doc.fillColor(wave.color).fillOpacity(wave.opacity);

            doc.moveTo(0, yOffset);

            for (let x = 0; x <= this.PAGE_WIDTH; x += this.PAGE_WIDTH / 3) {
                const cp1x = x + this.PAGE_WIDTH / 6;
                const cp1y = yOffset + height * 0.3 + Math.sin(x / 50 + index) * 20;
                const cp2x = x + this.PAGE_WIDTH / 3;
                const cp2y = yOffset + height * 0.6 + Math.cos(x / 50 + index) * 20;
                const endX = x + this.PAGE_WIDTH / 2;
                const endY = yOffset + height * 0.8;

                doc.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            }

            doc.lineTo(this.PAGE_WIDTH, 0)
               .lineTo(0, 0)
               .closePath()
               .fill();
        });

        doc.restore();
    }

    // ===== HEADER / FOOTER =====================================================
    private static drawHeader(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails,
        title: string
    ) {
        const headerH = 120;
        const logoSize = 50;
        const topMargin = 25;

        doc.rect(0, 0, this.PAGE_WIDTH, headerH).fill("#FFFFFF");

        try {
            let logoPath = path.join(process.cwd(), "client", "public", "AICERA_Logo.png");
            if (!fs.existsSync(logoPath)) {
                logoPath = path.join(process.cwd(), "client", "public", "logo.png");
            }
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, this.MARGIN_LEFT, topMargin, {
                    fit: [logoSize, logoSize]
                });
            } else {
                doc.fontSize(14).font("Helvetica-Bold").fillColor(this.PRIMARY)
                    .text(data.companyName || "AICERA", this.MARGIN_LEFT, topMargin + 15);
            }
        } catch {
            doc.fontSize(14).font("Helvetica-Bold").fillColor(this.PRIMARY)
                .text(data.companyName || "AICERA", this.MARGIN_LEFT, topMargin + 15);
        }

        const companyInfoW = 280;
        const companyInfoX = this.PAGE_WIDTH - this.MARGIN_RIGHT - companyInfoW;
        let yy = topMargin;

        doc.fontSize(11).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text(data.companyName || "AICERA Systems Private Limited", companyInfoX, yy, {
                width: companyInfoW,
                align: "right",
            });

        yy += 14;
        if (data.companyAddress) {
            const addressLines = data.companyAddress.split("\n").filter(Boolean);
            const compactAddress = addressLines.slice(0, 2).join(", ");
            doc.fontSize(8).font("Helvetica").fillColor(this.MUTED)
                .text(compactAddress, companyInfoX, yy, {
                    width: companyInfoW,
                    align: "right",
                    lineGap: 1
                });
            yy += 18;
        } else {
            yy += 10;
        }

        const contactLine: string[] = [];
        if (data.companyPhone) contactLine.push(`Ph: ${data.companyPhone}`);
        if (data.companyEmail) contactLine.push(`Email: ${data.companyEmail}`);

        if (contactLine.length > 0) {
            doc.fontSize(7).font("Helvetica").fillColor(this.MUTED)
                .text(contactLine.join(" | "), companyInfoX, yy, {
                    width: companyInfoW,
                    align: "right"
                });
        }

        const titleY = 80;
        doc.fontSize(18).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text(title, this.MARGIN_LEFT, titleY, {
                width: this.CONTENT_WIDTH,
                align: "center"
            });

        doc.strokeColor(this.ACCENT_LINE).lineWidth(2)
            .moveTo(this.MARGIN_LEFT, headerH - 3)
            .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, headerH - 3)
            .stroke();

        doc.y = headerH + 10;
    }

    private static drawFooter(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails,
        page: number,
        total: number,
        title: string
    ) {
        const footerH = 70;
        const footerY = this.PAGE_HEIGHT - footerH;

        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        doc.rect(0, footerY, this.PAGE_WIDTH, footerH).fill("#f8fafc");

        doc.strokeColor(this.ACCENT_LINE).lineWidth(2)
            .moveTo(0, footerY)
            .lineTo(this.PAGE_WIDTH, footerY)
            .stroke();

        let y = footerY + 12;

        const footerTitle = `${data.companyName || "AICERA Systems Private Limited"}`;
        doc.fontSize(10).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text(footerTitle, 0, y, { width: this.PAGE_WIDTH, align: "center" });

        y += 14;

        const addressParts: string[] = [];
        if (data.companyAddress) {
            const addressLines = data.companyAddress.split("\n").filter(Boolean);
            if (addressLines.length > 0) {
                addressParts.push(addressLines.join(", "));
            }
        }

        if (addressParts.length > 0) {
            doc.fontSize(7).font("Helvetica").fillColor(this.MUTED)
                .text(addressParts[0], this.MARGIN_LEFT, y, {
                    width: this.CONTENT_WIDTH,
                    align: "center",
                    lineGap: 1
                });
            y += 10;
        }

        const contactParts: string[] = [];
        if (data.companyPhone) contactParts.push(`Phone: ${data.companyPhone}`);
        if (data.companyEmail) contactParts.push(`Email: ${data.companyEmail}`);
        if (data.companyWebsite) contactParts.push(`Web: ${data.companyWebsite}`);

        if (contactParts.length > 0) {
            doc.fontSize(7).font("Helvetica").fillColor(this.MUTED)
                .text(contactParts.join(" | "), 0, y, {
                    width: this.PAGE_WIDTH,
                    align: "center"
                });
            y += 9;
        }

        if (data.companyGSTIN) {
            doc.fontSize(7).font("Helvetica").fillColor(this.MUTED)
                .text(`GSTIN: ${data.companyGSTIN}`, 0, y, {
                    width: this.PAGE_WIDTH,
                    align: "center"
                });
        }

        doc.fontSize(8).font("Helvetica").fillColor(this.MUTED)
            .text(`Page ${page} of ${total}`, this.MARGIN_LEFT, footerY + footerH - 10, {
                width: this.CONTENT_WIDTH,
                align: "center",
            });

        doc.page.margins.bottom = oldBottom;
    }

    // ===== TOP INFO + CLIENT ===================================================
    private static drawTopInfoCompact(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        // Compact block like the template’s first info grid
        const y0 = doc.y;
        const labelW = 120;
        const valueX = this.MARGIN_LEFT + labelW + 5;
        let y = y0;

        const row = (label: string, value: string) => {
            doc.fontSize(10).font("Helvetica-Bold").fillColor(this.MUTED)
                .text(label, this.MARGIN_LEFT, y);
            doc.font("Helvetica").fillColor(this.TEXT)
                .text(value || "—", valueX, y);
            y += 18;
        };

        row("Company Name:", data.companyName || "AICERA");
        row("Quote No.:", data.quote.quoteNumber || "—");
        if (data.quote.referenceNumber) {
            row("Reference No.:", data.quote.referenceNumber);
        }
        row("Date:", new Date(data.quote.quoteDate).toLocaleDateString("en-IN", {
            year: "numeric", month: "short", day: "numeric",
        }));
        row("Payment Terms:", "30 days from the date of Invoice");

        const validityText = data.quote.validUntil
            ? `Valid until ${new Date(data.quote.validUntil).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}`
            : `${data.quote.validityDays || 15} days from the quote date`;
        row("Quote Validity:", validityText);

        doc.moveDown(0.8);
    }

    private static drawClientTwoColumn(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        const startY = doc.y;
        const labelW = 120;

        // Left (Bill To)
        doc.fontSize(12).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text("Bill To:", this.MARGIN_LEFT, startY);

        let ly = startY + 22;
        const vX = this.MARGIN_LEFT + labelW + 5;

        const put = (lab: string, val?: string, color?: string) => {
            doc.fontSize(10).font("Helvetica-Bold").fillColor(this.TEXT)
                .text(lab, this.MARGIN_LEFT, ly);
            doc.font("Helvetica").fillColor(color || this.TEXT)
                .text(val || "—", vX, ly, { width: this.CONTENT_WIDTH * 0.46 - labelW, lineGap: 2 });
            ly += 18;
        };

        put("Name:", data.client.name);
        if (data.client.billingAddress) {
            doc.fontSize(10).font("Helvetica-Bold").fillColor(this.TEXT)
                .text("Address:", this.MARGIN_LEFT, ly);
            const h = doc.heightOfString(data.client.billingAddress, {
                width: this.CONTENT_WIDTH * 0.46 - labelW, lineGap: 2,
            });
            doc.font("Helvetica").fillColor(this.TEXT)
                .text(data.client.billingAddress, vX, ly, {
                    width: this.CONTENT_WIDTH * 0.46 - labelW, lineGap: 2,
                });
            ly += h + 12;
        }
        put("Phone No.:", data.client.phone || undefined);
        put("Email ID:", data.client.email || undefined, this.PRIMARY_LIGHT);
        put("GSTIN:", (data.client as any).gstin || undefined);
        const attn = data.quote.attentionTo || (data.client as any).contactPerson;
        if (attn) put("Attn to:", attn);

        // Right (Ship To)
        const rightX = this.MARGIN_LEFT + this.CONTENT_WIDTH * 0.52;
        const rvX = rightX + labelW + 5;
        doc.fontSize(12).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text("Ship To:", rightX, startY);

        let ry = startY + 22;

        const putR = (lab: string, val?: string, color?: string) => {
            doc.fontSize(10).font("Helvetica-Bold").fillColor(this.TEXT)
                .text(lab, rightX, ry);
            doc.font("Helvetica").fillColor(color || this.TEXT)
                .text(val || "—", rvX, ry, { width: this.CONTENT_WIDTH * 0.46 - labelW, lineGap: 2 });
            ry += 18;
        };

        putR("Name:", data.client.name);
        const shipAddress = data.client.shippingAddress || data.client.billingAddress;
        if (shipAddress) {
            doc.fontSize(10).font("Helvetica-Bold").fillColor(this.TEXT)
                .text("Address:", rightX, ry);
            const h = doc.heightOfString(shipAddress, {
                width: this.CONTENT_WIDTH * 0.46 - labelW, lineGap: 2,
            });
            doc.font("Helvetica").fillColor(this.TEXT)
                .text(shipAddress, rvX, ry, {
                    width: this.CONTENT_WIDTH * 0.46 - labelW, lineGap: 2,
                });
            ry += h + 12;
        }

        doc.y = Math.max(ly, ry) + 10;
    }

    // ===== PRODUCTS TABLE (Template columns) ===================================
    private static drawProductsSection(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        // Section title
        doc.fontSize(11).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text("PRODUCTS & SERVICES", this.MARGIN_LEFT, doc.y);

        doc.moveDown(0.5);
        const hdr = this.drawProductsHeader(doc);
        let y = hdr.startY;

        const items = data.items || [];

        if (items.length === 0) {
            const noItemsY = hdr.startY + 20;
            doc.fontSize(10).font("Helvetica-Oblique").fillColor(this.MUTED)
                .text("No items added to this quote.", this.MARGIN_LEFT, noItemsY, {
                    width: this.CONTENT_WIDTH,
                    align: "center"
                });
            doc.y = noItemsY + 40;
            return;
        }

        doc.fillColor(this.TEXT).font("Helvetica").fontSize(9);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 60) {
                this.addPageWithHeader(doc, data, "COMMERCIAL PROPOSAL");
                doc.fontSize(11).font("Helvetica-Bold").fillColor(this.PRIMARY)
                    .text("PRODUCTS & SERVICES (contd.)", this.MARGIN_LEFT, doc.y);
                doc.moveDown(0.5);
                const again = this.drawProductsHeader(doc);
                y = again.startY;
                Object.assign(hdr, again);
                doc.fillColor(this.TEXT).font("Helvetica").fontSize(9);
            }

            // Row height (wrap description)
            const minH = 28;
            const descH = doc.heightOfString(item.description, { width: hdr.col2W - 16, lineGap: 2 });
            const rowH = Math.max(minH, descH + 16);

            // Row background
            doc.rect(this.MARGIN_LEFT, y, this.CONTENT_WIDTH, rowH)
                .fill(i % 2 === 0 ? this.BG_ALT : "#FFFFFF");

            // Bottom line
            doc.strokeColor("#e2e8f0").lineWidth(0.5)
                .moveTo(this.MARGIN_LEFT, y + rowH)
                .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, y + rowH)
                .stroke();

            const centerY = y + (rowH - 9) / 2;

            doc.fillColor(this.TEXT);
            doc.text(String(i + 1), hdr.col1X, centerY, { width: hdr.col1W, align: "center" });

            doc.text(item.description, hdr.col2X + 8, y + 8, {
                width: hdr.col2W - 16, align: "left", lineGap: 2,
            });

            doc.text(String(item.quantity), hdr.col3X, centerY, { width: hdr.col3W, align: "center" });

            const unitTxt = this.currency(item.unitPrice);
            doc.text(unitTxt, hdr.col4X + 5, centerY, { width: hdr.col4W - 10, align: "right" });

            const subTxt = this.currency(item.subtotal);
            doc.text(subTxt, hdr.col5X + 5, centerY, { width: hdr.col5W - 10, align: "right" });

            y += rowH;
        }

        // Table bottom rule
        doc.strokeColor(this.PRIMARY).lineWidth(1.5)
            .moveTo(this.MARGIN_LEFT, y)
            .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, y)
            .stroke();

        // Totals box (right)
        doc.y = y + 18;
        this.drawTotalsBox(doc, data.quote);
    }

    private static drawProductsHeader(doc: InstanceType<typeof PDFDocument>) {
        const top = doc.y;
        const headerH = 32;

        doc.rect(this.MARGIN_LEFT, top, this.CONTENT_WIDTH, headerH).fill(this.PRIMARY);

        const col1X = this.MARGIN_LEFT + 5;
        const col1W = 35;
        const col2X = col1X + col1W;
        const col2W = 250;
        const col3X = col2X + col2W;
        const col3W = 50;
        const col4X = col3X + col3W;
        const col4W = 90;
        const col5X = col4X + col4W;
        const col5W = this.CONTENT_WIDTH - (col1W + col2W + col3W + col4W) - 5;

        const ty = top + 11;
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF");

        doc.text("SN", col1X, ty, { width: col1W, align: "center" });
        doc.text("Product Description", col2X + 8, ty, { width: col2W - 16, align: "left" });
        doc.text("Qty", col3X, ty, { width: col3W, align: "center" });
        doc.text("Unit Price", col4X + 5, ty, { width: col4W - 10, align: "right" });
        doc.text("Subtotal", col5X + 5, ty, { width: col5W - 10, align: "right" });

        return {
            startY: top + headerH,
            col1X, col1W,
            col2X, col2W,
            col3X, col3W,
            col4X, col4W,
            col5X, col5W,
            tableTop: top,
            headerH,
        };
    }

    // ===== NOTES + SIGNATORY ===================================================
    private static drawNotesAndSignatory(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 120) {
            this.addPageWithHeader(doc, data, "COMMERCIAL PROPOSAL");
        }

        const sectionY = doc.y + 6;

        // Left: Notes box title
        doc.fontSize(11).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text("Special notes and instructions", this.MARGIN_LEFT, sectionY);

        const notesText = data.quote.notes || "—";
        const notesTop = sectionY + 18;
        const notesW = this.CONTENT_WIDTH * 0.58;
        const notesH = Math.max(
            100,
            doc.heightOfString(notesText, { width: notesW - 20, lineGap: 3 }) + 20
        );

        // Box
        doc.rect(this.MARGIN_LEFT, notesTop, notesW, notesH).fillAndStroke("#fffbeb", "#fbbf24");
        doc.fontSize(9).font("Helvetica").fillColor("#78350f")
            .text(notesText, this.MARGIN_LEFT + 10, notesTop + 10, { width: notesW - 20, lineGap: 3 });

        // Right: Signatory
        const rightX = this.MARGIN_LEFT + notesW + 16;
        const rightW = this.CONTENT_WIDTH - (notesW + 16);
        const company = data.companyName || "AICERA Systems Private Limited";

        doc.fontSize(11).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text(`For ${company},`, rightX, sectionY, { width: rightW });

        const sigTop = notesTop;
        const sigH = Math.max(100, notesH);
        doc.rect(rightX, sigTop, rightW, sigH).fillAndStroke("#ffffff", this.BORDER);

        // signature line
        const lineY = sigTop + sigH - 28;
        doc.strokeColor(this.TEXT).lineWidth(0.8)
            .moveTo(rightX + 20, lineY)
            .lineTo(rightX + rightW - 20, lineY)
            .stroke();

        doc.fontSize(10).font("Helvetica").fillColor(this.TEXT)
            .text("Authorized Signatory", rightX + 20, lineY + 6);

        doc.y = Math.max(notesTop + notesH, sigTop + sigH) + 18;
    }

    // ===== TERMS & CONDITIONS (table like the template) ========================
    private static drawTermsTable(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        // Parse terms string into rows {param, details}
        const rows = this.parseTerms(data.quote.termsAndConditions || "");

        if (rows.length === 0) return;

        if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 150) {
            this.addPageWithHeader(doc, data, "COMMERCIAL PROPOSAL");
        }

        doc.fontSize(11).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text("Terms & Conditions", this.MARGIN_LEFT, doc.y);

        doc.moveDown(0.5);

        // Table header
        const top = doc.y;
        const headerH = 28;
        const w = this.CONTENT_WIDTH;

        // Columns: SN | Parameters | Details
        const col1W = 35, col2W = 160, col3W = w - (col1W + col2W);
        const col1X = this.MARGIN_LEFT;
        const col2X = col1X + col1W;
        const col3X = col2X + col2W;

        doc.rect(this.MARGIN_LEFT, top, w, headerH).fill(this.PRIMARY);
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF");
        doc.text("SN", col1X, top + 9, { width: col1W, align: "center" });
        doc.text("Parameters", col2X + 6, top + 9, { width: col2W - 12, align: "left" });
        doc.text("Details", col3X + 6, top + 9, { width: col3W - 12, align: "left" });

        let y = top + headerH;

        rows.forEach((r, i) => {
            // new page if needed
            if (y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 60) {
                this.addPageWithHeader(doc, data, "COMMERCIAL PROPOSAL");
                // re-draw header
                doc.rect(this.MARGIN_LEFT, doc.y, w, headerH).fill(this.PRIMARY);
                doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF");
                doc.text("SN", col1X, doc.y + 9, { width: col1W, align: "center" });
                doc.text("Parameters", col2X + 6, doc.y + 9, { width: col2W - 12, align: "left" });
                doc.text("Details", col3X + 6, doc.y + 9, { width: col3W - 12, align: "left" });
                y = doc.y + headerH;
            }

            const detailsH = Math.max(
                24,
                doc.heightOfString(r.details || "—", { width: col3W - 12, lineGap: 2 }) + 12
            );

            // row bg
            doc.rect(this.MARGIN_LEFT, y, w, detailsH).fill(i % 2 === 0 ? this.BG_ALT : "#FFFFFF");
            // borders
            doc.strokeColor(this.BORDER).lineWidth(0.5)
                .moveTo(this.MARGIN_LEFT, y + detailsH)
                .lineTo(this.MARGIN_LEFT + w, y + detailsH)
                .stroke();

            // text
            doc.fontSize(9).font("Helvetica").fillColor(this.TEXT);
            doc.text(String(i + 1), col1X, y + 7, { width: col1W, align: "center" });
            doc.text(r.param || "—", col2X + 6, y + 7, { width: col2W - 12, align: "left" });
            doc.text(r.details || "—", col3X + 6, y + 7, { width: col3W - 12, align: "left", lineGap: 2 });

            y += detailsH;
        });

        doc.y = y + 16;
    }

    private static parseTerms(terms: string): Array<{ param: string; details: string }> {
        // Accept lines like:
        // "Taxes: Taxes will be charged extra ..."
        // "Delivery - 3-4 weeks from PO"
        // Or bullet lines "• Payment: 100% against delivery"
        const rows: Array<{ param: string; details: string }> = [];
        const lines = (terms || "")
            .split("\n").map(l => l.trim()).filter(Boolean);

        for (const line of lines) {
            const clean = line.replace(/^[-*•\d.\)]\s*/, "");
            let param = "", details = "";

            if (clean.includes(":")) {
                const [p, ...rest] = clean.split(":");
                param = p.trim();
                details = rest.join(":").trim();
            } else if (clean.includes(" - ")) {
                const [p, ...rest] = clean.split(" - ");
                param = p.trim();
                details = rest.join(" - ").trim();
            } else {
                // fallback: first word as param
                const idx = clean.indexOf(" ");
                if (idx > -1) {
                    param = clean.slice(0, idx).trim();
                    details = clean.slice(idx + 1).trim();
                } else {
                    param = clean;
                    details = "";
                }
            }

            rows.push({ param, details });
        }
        return rows;
    }

    // ===== ANNEXURE 1 (Detailed BOM) ==========================================
    private static drawAnnexureFromBOM(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails
    ) {
        const raw = (data.quote as any).bomSection;
        if (!raw) return;

        let bom: any[] = [];
        try { bom = JSON.parse(raw) } catch { /* ignore */ }
        if (!Array.isArray(bom) || bom.length === 0) return;

        if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 140) {
            this.addPageWithHeader(doc, data, "COMMERCIAL PROPOSAL");
        }

        // Annexure title
        doc.fontSize(12).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text("Annexure 1", this.MARGIN_LEFT, doc.y);

        doc.moveDown(0.5);

        // Group by product (expects array of parts; if each entry already is one product, just list)
        bom.forEach((entry: any, idx: number) => {
            if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 120) {
                this.addPageWithHeader(doc, data, "COMMERCIAL PROPOSAL");
            }

            const heading =
                entry?.title ||
                entry?.partNumber ||
                entry?.product ||
                `Item ${idx + 1}`;

            doc.fontSize(11).font("Helvetica-Bold").fillColor(this.TEXT)
                .text(heading, this.MARGIN_LEFT, doc.y);

            doc.moveDown(0.3);

            const boxY = doc.y;
            const hMin = 90;
            // Compose a compact module table (Module | Description | Qty) like the template’s blocks
            const w = this.CONTENT_WIDTH;
            const col1W = 120, col2W = w - (col1W + 60), col3W = 60;
            const col1X = this.MARGIN_LEFT, col2X = col1X + col1W, col3X = col2X + col2W;

            // header
            const headerH = 26;
            doc.rect(this.MARGIN_LEFT, boxY, w, headerH).fill(this.PRIMARY);
            doc.fontSize(10).font("Helvetica-Bold").fillColor("#FFFFFF");
            doc.text("Module", col1X + 6, boxY + 8, { width: col1W - 12 });
            doc.text("Description", col2X + 6, boxY + 8, { width: col2W - 12 });
            doc.text("Qty", col3X, boxY + 8, { width: col3W, align: "center" });

            let y = boxY + headerH;

            const rows: Array<{ module: string; description: string; qty: string | number }> =
                entry?.components || entry?.rows || [];

            // Fallback: if not structured, list common fields
            if (!Array.isArray(rows) || rows.length === 0) {
                const guess = [
                    { module: "Base", description: entry?.description || entry?.title || "", qty: entry?.quantity || 1 },
                    ...(entry?.specifications ? [{ module: "Specifications", description: entry.specifications, qty: "" }] : []),
                ];
                rows.splice(0, 0, ...guess);
            }

            doc.fontSize(9).font("Helvetica").fillColor(this.TEXT);
            rows.forEach((r, i2) => {
                const rowH = Math.max(
                    24,
                    doc.heightOfString(String(r?.description || ""), { width: col2W - 12, lineGap: 2 }) + 12
                );
                // bg
                doc.rect(this.MARGIN_LEFT, y, w, rowH).fill(i2 % 2 === 0 ? this.BG_ALT : "#FFFFFF");
                // border
                doc.strokeColor(this.BORDER).lineWidth(0.5)
                    .moveTo(this.MARGIN_LEFT, y + rowH)
                    .lineTo(this.MARGIN_LEFT + w, y + rowH)
                    .stroke();

                doc.fillColor(this.TEXT);
                doc.text(String(r?.module || "—"), col1X + 6, y + 7, { width: col1W - 12 });
                doc.text(String(r?.description || "—"), col2X + 6, y + 7, { width: col2W - 12, lineGap: 2 });
                doc.text(String(r?.qty ?? "—"), col3X, y + 7, { width: col3W, align: "center" });

                y += rowH;
            });

            doc.y = Math.max(y, boxY + hMin) + 16;
        });
    }

    // ===== TOTALS BOX (right-aligned block) ====================================
    private static drawTotalsBox(
        doc: InstanceType<typeof PDFDocument>, quote: Quote
    ) {
        const x = this.PAGE_WIDTH - this.MARGIN_RIGHT - 280;
        const w = 280;

        // compute lines
        const lines: Array<{ label: string; value: number; color?: string }> = [
            { label: "Subtotal:", value: Number(quote.subtotal) || 0 },
        ];
        if (Number(quote.discount) > 0) lines.push({ label: "Discount:", value: -Number(quote.discount), color: "#dc2626" });
        if (Number(quote.shippingCharges) > 0) lines.push({ label: "Shipping & Handling:", value: Number(quote.shippingCharges) });
        if (Number(quote.cgst) > 0) lines.push({ label: "CGST (9%):", value: Number(quote.cgst) });
        if (Number(quote.sgst) > 0) lines.push({ label: "SGST (9%):", value: Number(quote.sgst) });
        if (Number(quote.igst) > 0) lines.push({ label: "IGST (18%):", value: Number(quote.igst) });

        const boxH = lines.length * 20 + 60;

        // Shadow + box
        doc.rect(x + 2, doc.y + 2, w, boxH).fill("#d1d5db");
        const boxTop = doc.y;
        doc.rect(x, boxTop, w, boxH).fillAndStroke("#ffffff", this.BORDER);

        // Title
        doc.rect(x, boxTop, w, 28).fill("#dbeafe");
        doc.fontSize(10).font("Helvetica-Bold").fillColor(this.PRIMARY)
            .text("FINANCIAL SUMMARY", x + 15, boxTop + 9);

        // Lines
        let y = boxTop + 40;
        const labelX = x + 15;
        const valueW = 120;
        const valueX = x + w - 15 - valueW;

        doc.fontSize(9.5).font("Helvetica");
        lines.forEach((ln) => {
            doc.fillColor(this.MUTED).text(ln.label, labelX, y);
            doc.fillColor(ln.color || this.TEXT)
                .text(this.currency(ln.value), valueX, y, { width: valueW, align: "right" });
            y += 20;
        });

        // Total band
        y += 5;
        doc.rect(x, y - 4, w, 32).fill(this.PRIMARY);
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#FFFFFF")
            .text("TOTAL AMOUNT:", labelX, y + 9);
        doc.fontSize(12).font("Helvetica").fillColor("#FFFFFF")
            .text(this.currency(Number(quote.total) || 0), valueX - 10, y + 8, { width: valueW + 10, align: "right" });

        doc.y = boxTop + boxH + 20;
    }


    // ===== UTILITIES ===========================================================
    private static addPageWithHeader(
        doc: InstanceType<typeof PDFDocument>,
        data: QuoteWithDetails,
        title: string
    ) {
        doc.addPage();
        this.drawHeader(doc, data, title);
    }

    private static currency(v: number | string): string {
        const n = Number(v) || 0;
        return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}