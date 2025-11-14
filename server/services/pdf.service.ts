import PDFDocument from "pdfkit";
import { Readable } from "stream";
import type { Quote, QuoteItem, Client } from "@shared/schema";

interface QuoteWithDetails {
  quote: Quote;
  client: Client;
  items: QuoteItem[];
  companyName?: string;
  companyAddress?: string;
}

export class PDFService {
  static generateQuotePDF(data: QuoteWithDetails): Readable {
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    const buffers: Buffer[] = [];
    doc.on("data", (buffer: Buffer) => buffers.push(buffer));

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("QUOTE", { align: "center" });
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

    // Quote Details (right side)
    const rightX = 400;
    doc.fontSize(10).font("Helvetica");
    doc.text(`Quote #: ${data.quote.quoteNumber}`, rightX, doc.y);
    doc.text(`Date: ${new Date(data.quote.quoteDate).toLocaleDateString()}`, rightX);
    doc.text(
      `Valid Until: ${new Date(new Date(data.quote.quoteDate).getTime() + data.quote.validityDays * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
      rightX
    );

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
    if (data.client.gstin) {
      doc.text(`GSTIN: ${data.client.gstin}`);
    }

    doc.moveDown(0.5);

    // Line Items Table
    this.drawLineItemsTable(doc, data.items);

    doc.moveDown(0.5);

    // Totals Section
    this.drawTotalsSection(doc, data.quote);

    doc.moveDown(0.5);

    // Notes and T&C
    if (data.quote.notes) {
      doc.fontSize(11).font("Helvetica-Bold").text("NOTES:");
      doc.fontSize(10).font("Helvetica").text(data.quote.notes);
      doc.moveDown(0.5);
    }

    if (data.quote.termsAndConditions) {
      doc.fontSize(11).font("Helvetica-Bold").text("TERMS & CONDITIONS:");
      doc.fontSize(9).font("Helvetica").text(data.quote.termsAndConditions, {
        width: 500,
        align: "left",
      });
    }

    doc.moveDown(1);

    // Footer
    doc.fontSize(9).font("Helvetica").text("─".repeat(80), { align: "center" });
    doc.text("Thank you for your business!", { align: "center" });

    // Generate PDF
    doc.end();

    return Readable.from(buffers);
  }

  private static drawLineItemsTable(doc: InstanceType<typeof PDFDocument>, items: QuoteItem[]) {
    const startY = doc.y;
    const tableTop = startY;
    const col1X = 50;
    const col2X = 180;
    const col3X = 320;
    const col4X = 420;
    const col5X = 500;

    // Headers
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("S.No", col1X, tableTop);
    doc.text("Description", col2X, tableTop);
    doc.text("Qty", col3X, tableTop);
    doc.text("Unit Price", col4X, tableTop);
    doc.text("Subtotal", col5X, tableTop);

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Items
    let y = tableTop + 25;
    doc.fontSize(9).font("Helvetica");

    items.forEach((item, index) => {
      const description = item.description.substring(0, 30);
      doc.text(String(index + 1), col1X, y);
      doc.text(description, col2X, y);
      doc.text(String(item.quantity), col3X, y);
      doc.text(`₹${Number(item.unitPrice).toFixed(2)}`, col4X, y);
      doc.text(`₹${Number(item.subtotal).toFixed(2)}`, col5X, y);
      y += 20;
    });

    doc.moveTo(50, y).lineTo(550, y).stroke();
    doc.y = y + 10;
  }

  private static drawTotalsSection(doc: InstanceType<typeof PDFDocument>, quote: Quote) {
    const rightX = 400;
    doc.fontSize(10).font("Helvetica");

    doc.text("Subtotal:", rightX, doc.y);
    doc.text(`₹${Number(quote.subtotal).toFixed(2)}`, rightX + 100);

    if (Number(quote.discount) > 0) {
      doc.text("Discount:", rightX, doc.y);
      doc.text(`-₹${Number(quote.discount).toFixed(2)}`, rightX + 100);
    }

    if (Number(quote.shippingCharges) > 0) {
      doc.text("Shipping:", rightX, doc.y);
      doc.text(`₹${Number(quote.shippingCharges).toFixed(2)}`, rightX + 100);
    }

    // Tax section
    if (Number(quote.cgst) > 0 || Number(quote.sgst) > 0 || Number(quote.igst) > 0) {
      doc.fontSize(9);
      if (Number(quote.cgst) > 0) {
        doc.text("CGST:", rightX, doc.y);
        doc.text(`₹${Number(quote.cgst).toFixed(2)}`, rightX + 100);
      }
      if (Number(quote.sgst) > 0) {
        doc.text("SGST:", rightX, doc.y);
        doc.text(`₹${Number(quote.sgst).toFixed(2)}`, rightX + 100);
      }
      if (Number(quote.igst) > 0) {
        doc.text("IGST:", rightX, doc.y);
        doc.text(`₹${Number(quote.igst).toFixed(2)}`, rightX + 100);
      }
    }

    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("TOTAL:", rightX, doc.y + 5);
    doc.text(`₹${Number(quote.total).toFixed(2)}`, rightX + 100);
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