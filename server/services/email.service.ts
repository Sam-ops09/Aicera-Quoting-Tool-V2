import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;
  private static resend: Resend | null = null;
  private static useResend = false;

  static initialize(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });
  }

  static initializeResend(apiKey: string) {
    this.resend = new Resend(apiKey);
    this.useResend = true;
  }

  static async getTransporter(): Promise<Transporter> {
    if (!this.transporter) {
      // Use test transporter in development/testing
      if (process.env.NODE_ENV !== "production") {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      } else {
        throw new Error("Email service not initialized");
      }
    }
    return this.transporter;
  }

  static getResend(): Resend {
    if (!this.resend) {
      throw new Error("Resend service not initialized");
    }
    return this.resend;
  }

  static async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #0046FF; color: white; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
      </p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `;

    try {
      if (this.useResend && this.resend) {
        // Use Resend API
        let fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
        if (fromEmail.includes("@gmail.com")) {
          console.warn(`[Resend] Gmail domain not supported by Resend, falling back to: onboarding@resend.dev`);
          fromEmail = "onboarding@resend.dev";
        }
        
        await this.resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Password Reset Request",
          html: htmlContent,
        });
      } else {
        // Use nodemailer fallback
        const transporter = await this.getTransporter();
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "noreply@quoteprogen.com",
          to: email,
          subject: "Password Reset Request",
          html: htmlContent,
          text: `Password Reset Request\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.`,
        });
      }
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      throw error;
    }
  }

  static async sendQuoteEmail(
    email: string,
    quoteNumber: string,
    clientName: string,
    pdfBuffer: Buffer,
    message?: string
  ): Promise<void> {
    const htmlContent = `
      <h2>Quote: ${quoteNumber}</h2>
      <p>Dear ${clientName},</p>
      <p>${message || `Please find your quote attached below.`}</p>
      <p>Thank you for your business!</p>
    `;

    try {
      if (this.useResend && this.resend) {
        // Use Resend API
        const base64Pdf = pdfBuffer.toString("base64");
        // For Resend, use verified domain. If EMAIL_FROM is set but unverified, fall back to onboarding domain
        let fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
        
        // Check if using an unverified Gmail domain with Resend
        if (fromEmail.includes("@gmail.com")) {
          console.warn(`[Resend] Gmail domain not supported by Resend, falling back to: onboarding@resend.dev`);
          fromEmail = "onboarding@resend.dev";
        }
        
        console.log(`[Resend] Sending quote email from: ${fromEmail} to: ${email}`);
        
        const response = await this.resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `Quote ${quoteNumber}`,
          html: htmlContent,
          attachments: [
            {
              filename: `Quote_${quoteNumber}.pdf`,
              content: base64Pdf,
            },
          ],
        });

        console.log(`[Resend] Quote email response:`, response);
        
        // Check for errors in response
        if (response.error) {
          console.error(`[Resend] Error sending quote email:`, response.error);
          throw new Error(`Resend API error: ${JSON.stringify(response.error)}`);
        }
        
        console.log(`[Resend] Quote email sent successfully with ID: ${response.data?.id}`);
      } else {
        // Use nodemailer fallback
        const transporter = await this.getTransporter();
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "quotes@quoteprogen.com",
          to: email,
          subject: `Quote ${quoteNumber}`,
          html: htmlContent,
          attachments: [
            {
              filename: `Quote_${quoteNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });
      }
    } catch (error) {
      console.error("Failed to send quote email:", error);
      throw error;
    }
  }

  static async sendInvoiceEmail(
    email: string,
    invoiceNumber: string,
    clientName: string,
    pdfBuffer: Buffer,
    dueDate?: Date
  ): Promise<void> {
    const dueDateStr = dueDate ? dueDate.toLocaleDateString() : "upon request";

    const htmlContent = `
      <h2>Invoice: ${invoiceNumber}</h2>
      <p>Dear ${clientName},</p>
      <p>Please find your invoice attached. Payment is due by ${dueDateStr}.</p>
      <p>Thank you for your business!</p>
    `;

    try {
      if (this.useResend && this.resend) {
        // Use Resend API
        const base64Pdf = pdfBuffer.toString("base64");
        let fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
        if (fromEmail.includes("@gmail.com")) {
          console.warn(`[Resend] Gmail domain not supported by Resend, falling back to: onboarding@resend.dev`);
          fromEmail = "onboarding@resend.dev";
        }
        
        await this.resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `Invoice ${invoiceNumber}`,
          html: htmlContent,
          attachments: [
            {
              filename: `Invoice_${invoiceNumber}.pdf`,
              content: base64Pdf,
            },
          ],
        });
      } else {
        // Use nodemailer fallback
        const transporter = await this.getTransporter();
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "invoices@quoteprogen.com",
          to: email,
          subject: `Invoice ${invoiceNumber}`,
          html: htmlContent,
          attachments: [
            {
              filename: `Invoice_${invoiceNumber}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        });
      }
    } catch (error) {
      console.error("Failed to send invoice email:", error);
      throw error;
    }
  }

  static async sendPaymentReminderEmail(
    email: string,
    invoiceNumber: string,
    clientName: string,
    amountDue: number,
    dueDate: Date
  ): Promise<void> {
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    const htmlContent = `
      <h2>Payment Reminder</h2>
      <p>Dear ${clientName},</p>
      <p>This is a reminder that payment of <strong>₹${amountDue.toFixed(2)}</strong> for invoice <strong>${invoiceNumber}</strong> is due on ${dueDate.toLocaleDateString()}.</p>
      ${daysUntilDue <= 0 ? "<p style='color: red;'><strong>This invoice is now overdue.</strong></p>" : ""}
      <p>Please arrange payment at your earliest convenience.</p>
      <p>Thank you!</p>
    `;

    try {
      if (this.useResend && this.resend) {
        // Use Resend API
        let fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
        if (fromEmail.includes("@gmail.com")) {
          console.warn(`[Resend] Gmail domain not supported by Resend, falling back to: onboarding@resend.dev`);
          fromEmail = "onboarding@resend.dev";
        }
        
        await this.resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `Payment Reminder - Invoice ${invoiceNumber}`,
          html: htmlContent,
        });
      } else {
        // Use nodemailer fallback
        const transporter = await this.getTransporter();
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "billing@quoteprogen.com",
          to: email,
          subject: `Payment Reminder - Invoice ${invoiceNumber}`,
          html: htmlContent,
        });
      }
    } catch (error) {
      console.error("Failed to send payment reminder email:", error);
      throw error;
    }
  }

  static async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const htmlContent = `
      <h2>Welcome to QuoteProGen!</h2>
      <p>Hi ${name},</p>
      <p>Your account has been successfully created. You can now login and start creating professional quotes.</p>
      <p>Visit our platform to get started: <a href="${process.env.APP_URL || "http://localhost:5000"}/login">Login</a></p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br/>QuoteProGen Team</p>
    `;

    try {
      if (this.useResend && this.resend) {
        // Use Resend API
        let fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";
        if (fromEmail.includes("@gmail.com")) {
          console.warn(`[Resend] Gmail domain not supported by Resend, falling back to: onboarding@resend.dev`);
          fromEmail = "onboarding@resend.dev";
        }
        
        await this.resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Welcome to QuoteProGen!",
          html: htmlContent,
        });
      } else {
        // Use nodemailer fallback
        const transporter = await this.getTransporter();
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "welcome@quoteprogen.com",
          to: email,
          subject: "Welcome to QuoteProGen!",
          html: htmlContent,
        });
      }
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      // Don't throw - welcome email is non-critical
    }
  }
}