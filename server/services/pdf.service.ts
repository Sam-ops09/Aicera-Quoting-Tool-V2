import PDFDocument from "pdfkit";
import { Readable } from "stream";
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
}

export class PDFService {
  // Page dimensions and margins
  private static readonly PAGE_WIDTH = 595.28; // A4 width in points
  private static readonly PAGE_HEIGHT = 841.89; // A4 height in points
  private static readonly MARGIN_LEFT = 40;
  private static readonly MARGIN_RIGHT = 40;
  private static readonly MARGIN_TOP = 100; // Extra space for header
  private static readonly MARGIN_BOTTOM = 90; // Extra space for footer
  private static readonly CONTENT_WIDTH = this.PAGE_WIDTH - this.MARGIN_LEFT - this.MARGIN_RIGHT;

  // Colors - Professional commercial proposal theme
  private static readonly PRIMARY_COLOR = "#1e3a8a"; // Darker blue for professionalism
  private static readonly SECONDARY_COLOR = "#475569"; // Slate gray
  private static readonly ACCENT_COLOR = "#0f172a"; // Dark slate
  private static readonly LIGHT_GRAY = "#f8fafc"; // Very light gray
  private static readonly BORDER_COLOR = "#cbd5e1"; // Light slate border
  private static readonly HEADER_BG = "#1e40af"; // Blue header background

  static generateQuotePDF(data: QuoteWithDetails): Readable {
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

    const buffers: Buffer[] = [];
    doc.on("data", (buffer: Buffer) => buffers.push(buffer));

    // Draw header on first page
    this.drawHeader(doc, data, "COMMERCIAL PROPOSAL");

    // Draw document info section
    this.drawDocumentInfo(doc, data);

    // Draw client section
    this.drawClientSection(doc, data);

    // Draw line items table
    this.drawLineItemsTable(doc, data.items);

    // Draw totals section
    this.drawTotalsSection(doc, data.quote);

    // Draw notes if present
    if (data.quote.notes) {
      this.drawNotesSection(doc, data.quote.notes);
    }

    // Draw terms and conditions
    if (data.quote.termsAndConditions) {
      this.drawTermsAndConditions(doc, data.quote.termsAndConditions);
    }

    // Draw advanced sections
    this.drawAdvancedSections(doc, data.quote);

    // Add page numbers and footers to all pages
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      this.drawFooter(doc, data, i + 1, pageCount);
    }

    doc.end();
    return Readable.from(buffers);
  }

  private static drawHeader(
    doc: InstanceType<typeof PDFDocument>,
    data: QuoteWithDetails,
    title: string
  ) {
    const headerHeight = 80;
    const companyName = data.companyName || "OPTIVALUE TEK";

    // Professional header background with gradient effect
    doc
      .rect(0, 0, this.PAGE_WIDTH, headerHeight)
      .fill(this.HEADER_BG);

    // Add a subtle border at bottom of header
    doc
      .strokeColor(this.BORDER_COLOR)
      .lineWidth(0.5)
      .moveTo(0, headerHeight)
      .lineTo(this.PAGE_WIDTH, headerHeight)
      .stroke();

    // Company name - more prominent
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .fillColor("#FFFFFF")
      .text(companyName, this.MARGIN_LEFT, 25, {
        width: this.CONTENT_WIDTH * 0.6,
        align: "left",
      });

    // Document title - professional styling
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#FFFFFF")
      .text(title, this.MARGIN_LEFT + this.CONTENT_WIDTH * 0.65, 30, {
        width: this.CONTENT_WIDTH * 0.35,
        align: "right",
      });

    // Add company tagline or subtitle if available
    if (data.companyWebsite) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#E0E7FF")
        .text(data.companyWebsite, this.MARGIN_LEFT, 55, {
          width: this.CONTENT_WIDTH * 0.6,
          align: "left",
        });
    }

    // Reset position after header
    doc.y = this.MARGIN_TOP + 15;
  }

  private static drawFooter(
    doc: InstanceType<typeof PDFDocument>,
    data: QuoteWithDetails,
    pageNumber: number,
    totalPages: number
  ) {
    const footerHeight = 75;
    const footerY = this.PAGE_HEIGHT - footerHeight;

    // Footer background
    doc
      .rect(0, footerY, this.PAGE_WIDTH, footerHeight)
      .fill(this.LIGHT_GRAY);

    // Top border line
    doc
      .strokeColor(this.BORDER_COLOR)
      .lineWidth(0.5)
      .moveTo(0, footerY)
      .lineTo(this.PAGE_WIDTH, footerY)
      .stroke();

    // Company information - left side
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(this.ACCENT_COLOR)
      .text(
        data.companyName || "OPTIVALUE TEK",
        this.MARGIN_LEFT,
        footerY + 8
      );

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(this.SECONDARY_COLOR);

    let addressY = doc.y + 2;
    if (data.companyAddress) {
      const addressLines = data.companyAddress.split('\n');
      addressLines.forEach(line => {
        doc.text(line.trim(), this.MARGIN_LEFT, addressY);
        addressY = doc.y + 1;
      });
    }

    // Contact info - right side
    const contactX = this.MARGIN_LEFT + this.CONTENT_WIDTH * 0.6;
    let contactY = footerY + 8;

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(this.SECONDARY_COLOR);

    if (data.companyPhone) {
      doc.text(`Phone: ${data.companyPhone}`, contactX, contactY);
      contactY += 10;
    }
    if (data.companyEmail) {
      doc.text(`Email: ${data.companyEmail}`, contactX, contactY);
      contactY += 10;
    }
    if (data.companyWebsite) {
      doc.text(`Web: ${data.companyWebsite}`, contactX, contactY);
    }

    // GSTIN if available
    if (data.companyGSTIN) {
      doc.text(`GSTIN: ${data.companyGSTIN}`, contactX, contactY + 10);
    }

    // Page number - centered at bottom
    doc
      .fontSize(8)
      .fillColor(this.SECONDARY_COLOR)
      .text(
        `Page ${pageNumber} of ${totalPages}`,
        this.MARGIN_LEFT,
        this.PAGE_HEIGHT - 20,
        {
          width: this.CONTENT_WIDTH,
          align: "center",
        }
      );

    // Professional disclaimer
    doc
      .fontSize(7)
      .fillColor(this.SECONDARY_COLOR)
      .text(
        "This document contains confidential information. Unauthorized distribution is prohibited.",
        this.MARGIN_LEFT,
        this.PAGE_HEIGHT - 12,
        {
          width: this.CONTENT_WIDTH,
          align: "center",
        }
      );
  }

  private static drawDocumentInfo(
    doc: InstanceType<typeof PDFDocument>,
    data: QuoteWithDetails
  ) {
    const startY = doc.y;
    const boxHeight = 100;

    // Professional background with subtle styling
    doc
      .rect(this.MARGIN_LEFT, startY, this.CONTENT_WIDTH, boxHeight)
      .fillAndStroke(this.LIGHT_GRAY, this.BORDER_COLOR);

    doc.fillColor(this.ACCENT_COLOR);

    // Title
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("PROPOSAL DETAILS", this.MARGIN_LEFT + 15, startY + 10);

    // Left column - Primary details
    const leftColX = this.MARGIN_LEFT + 15;
    const rightColX = this.MARGIN_LEFT + this.CONTENT_WIDTH * 0.5;
    let y = startY + 30;

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Proposal Number:", leftColX, y);
    doc.font("Helvetica").fillColor("#000000");
    doc.text(data.quote.quoteNumber, leftColX + 120, y);

    y += 18;
    doc.font("Helvetica-Bold").fillColor(this.ACCENT_COLOR);
    doc.text("Date:", leftColX, y);
    doc.font("Helvetica").fillColor("#000000");
    doc.text(
      new Date(data.quote.quoteDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      leftColX + 120,
      y
    );

    y += 18;
    const validUntil = new Date(
      new Date(data.quote.quoteDate).getTime() +
        data.quote.validityDays * 24 * 60 * 60 * 1000
    );
    doc.font("Helvetica-Bold").fillColor(this.ACCENT_COLOR);
    doc.text("Valid Until:", leftColX, y);
    doc.font("Helvetica").fillColor("#000000");
    doc.text(
      validUntil.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      leftColX + 120,
      y
    );

    // Right column - Additional details
    y = startY + 30;
    if (data.quote.referenceNumber) {
      doc.font("Helvetica-Bold").fillColor(this.ACCENT_COLOR);
      doc.text("Reference:", rightColX + 15, y);
      doc.font("Helvetica").fillColor("#000000");
      doc.text(data.quote.referenceNumber, rightColX + 85, y);
      y += 18;
    }

    doc.font("Helvetica-Bold").fillColor(this.ACCENT_COLOR);
    doc.text("Status:", rightColX + 15, y);
    doc.font("Helvetica").fillColor("#000000");

    // Status with color coding
    const status = data.quote.status.toUpperCase();
    const statusColor = status === 'APPROVED' ? '#059669' : status === 'DRAFT' ? '#d97706' : '#dc2626';
    doc.fillColor(statusColor).text(status, rightColX + 85, y);

    doc.y = startY + boxHeight + 15;
  }

  private static drawClientSection(
    doc: InstanceType<typeof PDFDocument>,
    data: QuoteWithDetails
  ) {
    doc.moveDown(0.5);
    const startY = doc.y;
    const boxHeight = 110;

    // Section title with professional styling
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(this.PRIMARY_COLOR)
      .text("CLIENT INFORMATION", this.MARGIN_LEFT, startY);

    doc.moveDown(0.3);
    const contentY = doc.y;

    // Professional border box
    doc
      .rect(this.MARGIN_LEFT, contentY, this.CONTENT_WIDTH, boxHeight)
      .fillAndStroke(this.LIGHT_GRAY, this.BORDER_COLOR);

    // Client details - left side
    let y = contentY + 15;
    doc.fillColor("#000000");

    // Company name - prominent
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(this.ACCENT_COLOR)
      .text(data.client.name, this.MARGIN_LEFT + 15, y);

    y += 20;
    if (data.client.contactPerson) {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(this.SECONDARY_COLOR)
        .text("Attention:", this.MARGIN_LEFT + 15, y);
      doc
        .font("Helvetica")
        .fillColor("#000000")
        .text(data.client.contactPerson, this.MARGIN_LEFT + 70, y);
      y += 14;
    }

    if (data.client.email) {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(this.SECONDARY_COLOR)
        .text("Email:", this.MARGIN_LEFT + 15, y);
      doc
        .font("Helvetica")
        .fillColor("#000000")
        .text(data.client.email, this.MARGIN_LEFT + 70, y);
      y += 14;
    }

    if (data.client.phone) {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(this.SECONDARY_COLOR)
        .text("Phone:", this.MARGIN_LEFT + 15, y);
      doc
        .font("Helvetica")
        .fillColor("#000000")
        .text(data.client.phone, this.MARGIN_LEFT + 70, y);
    }

    // Right column for billing address and GSTIN
    const rightColX = this.MARGIN_LEFT + this.CONTENT_WIDTH * 0.55;
    y = contentY + 15;

    if (data.client.billingAddress) {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(this.SECONDARY_COLOR)
        .text("Billing Address:", rightColX, y);
      y += 14;
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#000000")
        .text(data.client.billingAddress, rightColX, y, {
          width: this.CONTENT_WIDTH * 0.4,
        });
      y = doc.y + 8;
    }

    if (data.client.gstin) {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(this.SECONDARY_COLOR)
        .text("GSTIN:", rightColX, y);
      doc
        .font("Helvetica")
        .fillColor("#000000")
        .text(data.client.gstin, rightColX + 45, y);
    }

    doc.y = contentY + boxHeight + 15;
  }

  private static drawLineItemsTable(
    doc: InstanceType<typeof PDFDocument>,
    items: QuoteItem[]
  ) {
    doc.moveDown(0.5);
    const startY = doc.y;

    // Section title with professional styling
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(this.PRIMARY_COLOR)
      .text("PRODUCTS & SERVICES", this.MARGIN_LEFT, startY);

    doc.moveDown(0.5);
    const tableTop = doc.y;
    const headerHeight = 30;

    // Professional table header with gradient effect
    doc
      .rect(this.MARGIN_LEFT, tableTop, this.CONTENT_WIDTH, headerHeight)
      .fill(this.PRIMARY_COLOR);

    // Subtle border for header
    doc
      .strokeColor(this.BORDER_COLOR)
      .lineWidth(0.5)
      .rect(this.MARGIN_LEFT, tableTop, this.CONTENT_WIDTH, headerHeight)
      .stroke();

    // Column positions - optimized for professional layout
    const col1X = this.MARGIN_LEFT + 8; // S.No
    const col1W = 30;
    const col2X = col1X + col1W + 5; // Description
    const col2W = this.CONTENT_WIDTH - 240;
    const col3X = col2X + col2W + 5; // Qty
    const col3W = 45;
    const col4X = col3X + col3W + 5; // Unit Price
    const col4W = 75;
    const col5X = col4X + col4W + 5; // Subtotal
    const col5W = 75;

    // Table headers with better typography
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#FFFFFF");

    doc.text("S.No", col1X, tableTop + 10, { width: col1W, align: "center" });
    doc.text("Description", col2X, tableTop + 10, { width: col2W, align: "left" });
    doc.text("Qty", col3X, tableTop + 10, { width: col3W, align: "center" });
    doc.text("Unit Price", col4X, tableTop + 10, { width: col4W, align: "right" });
    doc.text("Amount", col5X, tableTop + 10, { width: col5W, align: "right" });

    // Table rows
    let y = tableTop + headerHeight + 5;
    doc.fillColor("#000000").font("Helvetica");

    items.forEach((item, index) => {
      // Check if we need a new page
      if (y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 60) {
        doc.addPage();
        y = this.MARGIN_TOP + 10;
      }

      const rowHeight = 20;

      // Professional row background with subtle alternating
      if (index % 2 === 1) {
        doc
          .rect(this.MARGIN_LEFT, y - 2, this.CONTENT_WIDTH, rowHeight + 4)
          .fill("#fafbfc");
      }

      // Subtle row border
      doc
        .strokeColor("#f1f5f9")
        .lineWidth(0.3)
        .moveTo(this.MARGIN_LEFT, y + rowHeight + 2)
        .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, y + rowHeight + 2)
        .stroke();

      // Row data with better typography
      doc.fillColor("#000000").fontSize(9).font("Helvetica");

      // Serial number
      doc.text(String(index + 1), col1X, y + 6, { width: col1W, align: "center" });

      // Description with word wrap
      const descHeight = doc.heightOfString(item.description, {
        width: col2W - 10,
      });
      const actualRowHeight = Math.max(rowHeight, descHeight + 8);

      doc.text(item.description, col2X, y + 6, {
        width: col2W - 10,
        align: "left",
      });

      // Quantity
      doc.text(String(item.quantity), col3X, y + 6, { width: col3W, align: "center" });

      // Unit Price
      doc.text(
        `₹${Number(item.unitPrice).toFixed(2)}`,
        col4X,
        y + 6,
        { width: col4W, align: "right" }
      );

      // Subtotal
      doc.text(
        `₹${Number(item.subtotal).toFixed(2)}`,
        col5X,
        y + 6,
        { width: col5W, align: "right" }
      );

      y += actualRowHeight + 6;
    });

    // Professional table bottom border
    doc
      .strokeColor(this.BORDER_COLOR)
      .lineWidth(1)
      .moveTo(this.MARGIN_LEFT, y)
      .lineTo(this.PAGE_WIDTH - this.MARGIN_RIGHT, y)
      .stroke();

    doc.y = y + 15;
  }

  private static drawTotalsSection(
    doc: InstanceType<typeof PDFDocument>,
    quote: Quote
  ) {
    doc.moveDown(0.5);
    const startY = doc.y;

    // Professional summary box on the right side
    const boxWidth = 280;
    const boxX = this.PAGE_WIDTH - this.MARGIN_RIGHT - boxWidth;
    let boxHeight = 140;

    // Calculate box height based on what we need to show
    let lineCount = 2; // subtotal and total
    if (Number(quote.discount) > 0) lineCount++;
    if (Number(quote.shippingCharges) > 0) lineCount++;
    if (Number(quote.cgst) > 0) lineCount++;
    if (Number(quote.sgst) > 0) lineCount++;
    if (Number(quote.igst) > 0) lineCount++;

    boxHeight = lineCount * 20 + 50;

    // Professional box with shadow effect
    doc
      .rect(boxX + 2, startY + 2, boxWidth, boxHeight)
      .fill("#e2e8f0");

    doc
      .rect(boxX, startY, boxWidth, boxHeight)
      .fillAndStroke("#ffffff", this.BORDER_COLOR);

    // Title
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(this.PRIMARY_COLOR)
      .text("SUMMARY", boxX + 15, startY + 12);

    // Separator line
    doc
      .strokeColor(this.BORDER_COLOR)
      .lineWidth(0.5)
      .moveTo(boxX + 15, startY + 30)
      .lineTo(boxX + boxWidth - 15, startY + 30)
      .stroke();

    doc.fillColor("#000000");

    let y = startY + 40;
    const labelX = boxX + 15;
    const valueX = boxX + boxWidth - 20;

    // Subtotal
    doc.fontSize(10).font("Helvetica");
    doc.text("Subtotal:", labelX, y);
    doc.text(`₹${Number(quote.subtotal).toFixed(2)}`, valueX - 90, y, {
      width: 90,
      align: "right",
    });
    y += 20;

    // Discount
    if (Number(quote.discount) > 0) {
      doc.text("Discount:", labelX, y);
      doc.text(`-₹${Number(quote.discount).toFixed(2)}`, valueX - 90, y, {
        width: 90,
        align: "right",
      });
      y += 20;
    }

    // Shipping
    if (Number(quote.shippingCharges) > 0) {
      doc.fontSize(9);
      doc.text("Shipping & Handling:", labelX, y);
      doc.text(`₹${Number(quote.shippingCharges).toFixed(2)}`, valueX - 90, y, {
        width: 90,
        align: "right",
      });
      y += 20;
    }

    // Taxes
    if (Number(quote.cgst) > 0) {
      doc.fontSize(9);
      doc.text("CGST (9%):", labelX + 10, y);
      doc.text(`₹${Number(quote.cgst).toFixed(2)}`, valueX - 90, y, {
        width: 90,
        align: "right",
      });
      y += 18;
    }

    if (Number(quote.sgst) > 0) {
      doc.text("SGST (9%):", labelX + 10, y);
      doc.text(`₹${Number(quote.sgst).toFixed(2)}`, valueX - 90, y, {
        width: 90,
        align: "right",
      });
      y += 18;
    }

    if (Number(quote.igst) > 0) {
      doc.text("IGST (18%):", labelX + 10, y);
      doc.text(`₹${Number(quote.igst).toFixed(2)}`, valueX - 90, y, {
        width: 90,
        align: "right",
      });
      y += 18;
    }

    // Total with professional highlight
    y += 8;
    doc
      .rect(boxX + 10, y - 3, boxWidth - 20, 28)
      .fill(this.PRIMARY_COLOR);

    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#FFFFFF");
    doc.text("TOTAL AMOUNT:", labelX + 5, y + 6);
    doc.text(`₹${Number(quote.total).toFixed(2)}`, valueX - 110, y + 6, {
      width: 110,
      align: "right",
    });

    doc.y = startY + boxHeight + 15;
  }

  private static drawNotesSection(
    doc: InstanceType<typeof PDFDocument>,
    notes: string
  ) {
    // Check if we need a new page
    if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 120) {
      doc.addPage();
    }

    doc.moveDown(1);

    // Professional section header
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(this.PRIMARY_COLOR)
      .text("NOTES", this.MARGIN_LEFT, doc.y);

    doc.moveDown(0.5);

    // Notes box with professional styling
    const notesHeight = doc.heightOfString(notes, {
      width: this.CONTENT_WIDTH - 20,
      fontSize: 9,
    }) + 20;

    doc
      .rect(this.MARGIN_LEFT, doc.y, this.CONTENT_WIDTH, notesHeight)
      .fillAndStroke(this.LIGHT_GRAY, this.BORDER_COLOR);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#000000")
      .text(notes, this.MARGIN_LEFT + 10, doc.y + 10, {
        width: this.CONTENT_WIDTH - 20,
        align: "left",
      });

    doc.y = doc.y + notesHeight + 15;
  }

  private static drawTermsAndConditions(
    doc: InstanceType<typeof PDFDocument>,
    terms: string
  ) {
    // Check if we need a new page
    if (doc.y > this.PAGE_HEIGHT - this.MARGIN_BOTTOM - 180) {
      doc.addPage();
    }

    doc.moveDown(1);

    // Professional section header
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(this.PRIMARY_COLOR)
      .text("TERMS & CONDITIONS", this.MARGIN_LEFT, doc.y);

    doc.moveDown(0.5);

    // Split terms into bullet points if they contain line breaks
    const termLines = terms.split("\n").filter((line) => line.trim());

    // Calculate height for terms box
    let termsHeight = 20; // padding
    termLines.forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        termsHeight += doc.heightOfString(
          trimmedLine.match(/^[\d•\-\*]/) ? trimmedLine : `• ${trimmedLine}`,
          { width: this.CONTENT_WIDTH - 20, fontSize: 8 }
        ) + 6;
      }
    });

    // Terms box with professional styling
    doc
      .rect(this.MARGIN_LEFT, doc.y, this.CONTENT_WIDTH, termsHeight)
      .fillAndStroke(this.LIGHT_GRAY, this.BORDER_COLOR);

    doc.fontSize(8).font("Helvetica").fillColor("#000000");

    let currentY = doc.y + 10;
    termLines.forEach((line) => {
      if (currentY > doc.y + termsHeight - 20) {
        // If we exceed the box, we'll need to handle this differently
        // For now, just continue
      }

      const trimmedLine = line.trim();
      if (trimmedLine) {
        // Add bullet point if line doesn't start with one
        const displayLine = trimmedLine.match(/^[\d•\-\*]/) ? trimmedLine : `• ${trimmedLine}`;
        doc.text(displayLine, this.MARGIN_LEFT + 10, currentY, {
          width: this.CONTENT_WIDTH - 20,
          align: "left",
        });
        currentY += doc.heightOfString(displayLine, {
          width: this.CONTENT_WIDTH - 20,
          fontSize: 8
        }) + 4;
      }
    });

    doc.y = doc.y + termsHeight + 15;
  }

  private static drawAdvancedSections(doc: InstanceType<typeof PDFDocument>, quote: Quote) {
    // Check if we need a new page for advanced sections
    if (doc.y > 650) {
      doc.addPage();
    }

    // Bill of Materials
    if (quote.bomSection) {
      try {
        const bomData = JSON.parse(quote.bomSection);
        if (bomData && bomData.length > 0) {
          doc.moveDown(1);
          doc.fontSize(14).font("Helvetica-Bold").text("BILL OF MATERIALS (BOM)");
          doc.moveDown(0.5);

          bomData.forEach((item: any, index: number) => {
            if (doc.y > 700) doc.addPage();

            doc.fontSize(11).font("Helvetica-Bold").text(`Item ${index + 1}: ${item.partNumber}`);
            doc.fontSize(9).font("Helvetica");
            doc.text(`Description: ${item.description}`);
            if (item.manufacturer) doc.text(`Manufacturer: ${item.manufacturer}`);
            doc.text(`Quantity: ${item.quantity} ${item.unitOfMeasure}`);
            if (item.specifications) doc.text(`Specifications: ${item.specifications}`);
            if (item.notes) doc.text(`Notes: ${item.notes}`);
            doc.moveDown(0.5);
          });
        }
      } catch (e) {
        console.error("Failed to parse BOM section:", e);
      }
    }

    // Service Level Agreement
    if (quote.slaSection) {
      try {
        const slaData = JSON.parse(quote.slaSection);
        if (slaData && (slaData.overview || slaData.metrics?.length > 0)) {
          if (doc.y > 650) doc.addPage();

          doc.moveDown(1);
          doc.fontSize(14).font("Helvetica-Bold").text("SERVICE LEVEL AGREEMENT (SLA)");
          doc.moveDown(0.5);

          if (slaData.overview) {
            doc.fontSize(11).font("Helvetica-Bold").text("Overview");
            doc.fontSize(9).font("Helvetica").text(slaData.overview, { width: 500 });
            doc.moveDown(0.5);
          }

          if (slaData.responseTime || slaData.resolutionTime || slaData.availability || slaData.supportHours) {
            doc.fontSize(11).font("Helvetica-Bold").text("Service Commitments");
            doc.fontSize(9).font("Helvetica");
            if (slaData.responseTime) doc.text(`Response Time: ${slaData.responseTime}`);
            if (slaData.resolutionTime) doc.text(`Resolution Time: ${slaData.resolutionTime}`);
            if (slaData.availability) doc.text(`System Availability: ${slaData.availability}`);
            if (slaData.supportHours) doc.text(`Support Hours: ${slaData.supportHours}`);
            doc.moveDown(0.5);
          }

          if (slaData.metrics && slaData.metrics.length > 0) {
            doc.fontSize(11).font("Helvetica-Bold").text("Performance Metrics");
            doc.fontSize(9).font("Helvetica");
            slaData.metrics.forEach((metric: any) => {
              if (doc.y > 700) doc.addPage();
              doc.font("Helvetica-Bold").text(`• ${metric.name} - Target: ${metric.target}`);
              doc.font("Helvetica").text(`  ${metric.description}`, { indent: 10 });
              if (metric.penalty) doc.text(`  Penalty: ${metric.penalty}`, { indent: 10 });
            });
            doc.moveDown(0.5);
          }
        }
      } catch (e) {
        console.error("Failed to parse SLA section:", e);
      }
    }

    // Project Timeline
    if (quote.timelineSection) {
      try {
        const timelineData = JSON.parse(quote.timelineSection);
        if (timelineData && (timelineData.projectOverview || timelineData.milestones?.length > 0)) {
          if (doc.y > 650) doc.addPage();

          doc.moveDown(1);
          doc.fontSize(14).font("Helvetica-Bold").text("PROJECT TIMELINE");
          doc.moveDown(0.5);

          if (timelineData.projectOverview) {
            doc.fontSize(11).font("Helvetica-Bold").text("Project Overview");
            doc.fontSize(9).font("Helvetica").text(timelineData.projectOverview, { width: 500 });
            doc.moveDown(0.5);
          }

          if (timelineData.startDate || timelineData.endDate) {
            doc.fontSize(9).font("Helvetica");
            if (timelineData.startDate) doc.text(`Project Start: ${new Date(timelineData.startDate).toLocaleDateString()}`);
            if (timelineData.endDate) doc.text(`Project End: ${new Date(timelineData.endDate).toLocaleDateString()}`);
            doc.moveDown(0.5);
          }

          if (timelineData.milestones && timelineData.milestones.length > 0) {
            doc.fontSize(11).font("Helvetica-Bold").text("Milestones & Phases");
            doc.moveDown(0.3);

            timelineData.milestones.forEach((milestone: any, index: number) => {
              if (doc.y > 700) doc.addPage();

              doc.fontSize(10).font("Helvetica-Bold").text(`${index + 1}. ${milestone.name} (${milestone.status})`);
              doc.fontSize(9).font("Helvetica");
              if (milestone.description) doc.text(milestone.description);
              if (milestone.startDate || milestone.endDate || milestone.duration) {
                let dateStr = "";
                if (milestone.startDate) dateStr += `Start: ${new Date(milestone.startDate).toLocaleDateString()}`;
                if (milestone.endDate) dateStr += ` | End: ${new Date(milestone.endDate).toLocaleDateString()}`;
                if (milestone.duration) dateStr += ` | Duration: ${milestone.duration}`;
                doc.text(dateStr);
              }
              if (milestone.deliverables) doc.text(`Deliverables: ${milestone.deliverables}`);
              doc.moveDown(0.5);
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse Timeline section:", e);
      }
    }
  }

  static generateInvoicePDF(
    data: QuoteWithDetails & {
      invoiceNumber: string;
      dueDate: Date;
    }
  ): Readable {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    const buffers: Buffer[] = [];
    doc.on("data", (buffer: Buffer) => buffers.push(buffer));

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("INVOICE", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text("─".repeat(80), { align: "center" });
    doc.moveDown(0.5);

    // Company Info (left)
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(data.companyName || "Your Company");
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(data.companyAddress || "Company Address")
      .moveDown(0.5);

    // Invoice Details (right side)
    const rightX = 400;
    doc.fontSize(10).font("Helvetica");
    doc.text(`Invoice #: ${data.invoiceNumber}`, rightX, doc.y);
    doc.text(`Quote #: ${data.quote.quoteNumber}`, rightX);
    doc.text(`Date: ${new Date(data.quote.quoteDate).toLocaleDateString()}`, rightX);
    doc.text(`Due Date: ${data.dueDate.toLocaleDateString()}`, rightX);

    doc.moveDown(1);

    // Bill To Section
    doc.fontSize(11).font("Helvetica-Bold").text("BILL TO:");
    doc.fontSize(10).font("Helvetica");
    doc.text(data.client.name);
    if (data.client.contactPerson) {
      doc.text(`Attn: ${data.client.contactPerson}`);
    }
    if (data.client.email) {
      doc.text(`Email: ${data.client.email}`);
    }
    if (data.client.phone) {
      doc.text(`Phone: ${data.client.phone}`);
    }
    if (data.client.billingAddress) {
      doc.text(data.client.billingAddress);
    }

    doc.moveDown(0.5);

    // Line Items Table
    this.drawLineItemsTable(doc, data.items);

    doc.moveDown(0.5);

    // Totals Section
    this.drawTotalsSection(doc, data.quote);

    doc.moveDown(1);

    // Footer
    doc.fontSize(9).font("Helvetica").text("─".repeat(80), { align: "center" });
    doc.text("Thank you for your business!", { align: "center" });

    doc.end();

    return Readable.from(buffers);
  }
}