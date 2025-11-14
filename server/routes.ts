import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { PDFService } from "./services/pdf.service";
import { EmailService } from "./services/email.service";
import { analyticsService } from "./services/analytics.service";
import { pricingService } from "./services/pricing.service";
import { z } from "zod";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const JWT_SECRET = process.env.SESSION_SECRET;
const JWT_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// Middleware to verify JWT token
async function authMiddleware(req: AuthRequest, res: Response, next: Function) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const user = await storage.getUser(decoded.id);
    
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Helper to generate quote/invoice numbers
function generateDocumentNumber(prefix: string, lastNumber: string | undefined): string {
  if (!lastNumber) {
    return `${prefix}-0001`;
  }
  
  const parts = lastNumber.split('-');
  const num = parseInt(parts[parts.length - 1]) + 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

  // Auth Routes
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, backupEmail, password, name } = req.body;

      // Check if user exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate refresh token
      const refreshToken = nanoid(32);
      const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create user with default role "user"
      const user = await storage.createUser({
        email,
        backupEmail,
        passwordHash,
        name,
        role: "user",
        status: "active",
        refreshToken,
        refreshTokenExpiry,
      });

      // Generate access token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      await storage.createActivityLog({
        userId: user.id,
        action: "signup",
        entityType: "user",
        entityId: user.id,
      });

      // Send welcome email
      try {
        await EmailService.sendWelcomeEmail(email, name);
      } catch (error) {
        console.error("Failed to send welcome email:", error);
        // Don't fail signup if email fails
      }

      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (error: any) {
      console.error("Signup error:", error);
      return res.status(500).json({ error: error.message || "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.status !== "active") {
        return res.status(401).json({ error: "Account is inactive" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate new refresh token
      const refreshToken = nanoid(32);
      const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Update user with new refresh token
      await storage.updateUser(user.id, {
        refreshToken,
        refreshTokenExpiry,
      });

      // Generate access token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      await storage.createActivityLog({
        userId: user.id,
        action: "login",
        entityType: "user",
        entityId: user.id,
      });

      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie("token");
    return res.json({ success: true });
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.backupEmail) {
        // Don't reveal if user exists for security
        return res.json({ success: true });
      }

      const resetToken = nanoid(32);
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
      });

      // Send email with reset link
      const resetLink = `${process.env.APP_URL || "http://localhost:5000"}/reset-password?token=${resetToken}`;
      try {
        await EmailService.sendPasswordResetEmail(user.backupEmail, resetLink);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        // Don't fail the request, just log the error
      }

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Confirm Password Reset with Token
  app.post("/api/auth/reset-password-confirm", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      // Find user with reset token
      const users_list = await storage.getAllUsers();
      const user = users_list.find(u => u.resetToken === token);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must contain uppercase, lowercase, number, and special character" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      });

      await storage.createActivityLog({
        userId: user.id,
        action: "reset_password",
        entityType: "user",
        entityId: user.id,
      });

      return res.json({ success: true, message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password confirm error:", error);
      return res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Refresh Token Endpoint
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: "No refresh token" });
      }

      // Find user by refresh token
      const users_list = await storage.getAllUsers();
      const user = users_list.find(u => u.refreshToken === refreshToken);

      if (!user) {
        return res.status(401).json({ error: "Invalid refresh token" });
      }

      // Check if refresh token is expired
      if (user.refreshTokenExpiry && new Date(user.refreshTokenExpiry) < new Date()) {
        return res.status(401).json({ error: "Refresh token expired" });
      }

      if (user.status !== "active") {
        return res.status(401).json({ error: "User account is inactive" });
      }

      // Generate new access token
      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.cookie("token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });

      return res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (error: any) {
      console.error("Refresh token error:", error);
      return res.status(500).json({ error: "Failed to refresh token" });
    }
  });

  // Users Routes (Admin only)
  app.get("/api/users", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const users = await storage.getAllUsers();
      return res.json(users.map(u => ({
        id: u.id,
        email: u.email,
        backupEmail: u.backupEmail,
        name: u.name,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })));
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { email, backupEmail, password, name, role, status } = req.body;

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        backupEmail,
        passwordHash,
        name,
        role: role || "user",
        status: status || "active",
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_user",
        entityType: "user",
        entityId: user.id,
      });

      return res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      if (req.params.id === req.user!.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      await storage.deleteUser(req.params.id);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_user",
        entityType: "user",
        entityId: req.params.id,
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Delete user error:", error);
      return res.status(500).json({ error: error.message || "Failed to delete user" });
    }
  });

  // Clients Routes
  app.get("/api/clients", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const clients = await storage.getAllClients();
      return res.json(clients);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { name, email, phone } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: "Client name and email are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const client = await storage.createClient({
        ...req.body,
        createdBy: req.user!.id,
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_client",
        entityType: "client",
        entityId: client.id,
      });

      return res.json(client);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { name, email } = req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: "Client name and email are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const client = await storage.updateClient(req.params.id, req.body);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_client",
        entityType: "client",
        entityId: client.id,
      });

      return res.json(client);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteClient(req.params.id);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_client",
        entityType: "client",
        entityId: req.params.id,
      });

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Quotes Routes
  app.get("/api/quotes", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const quotes = await storage.getAllQuotes();
      const quotesWithClients = await Promise.all(
        quotes.map(async (quote) => {
          const client = await storage.getClient(quote.clientId);
          return {
            ...quote,
            clientName: client?.name || "Unknown",
          };
        })
      );
      return res.json(quotesWithClients);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  app.get("/api/quotes/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const client = await storage.getClient(quote.clientId);
      const items = await storage.getQuoteItems(quote.id);

      return res.json({
        ...quote,
        client,
        items,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  app.post("/api/quotes", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { items, ...quoteData } = req.body;

      // Convert ISO string date to Date object if provided (optional; DB has default)
      if (quoteData.quoteDate && typeof quoteData.quoteDate === "string") {
        const parsed = new Date(quoteData.quoteDate);
        if (!isNaN(parsed.getTime())) {
          quoteData.quoteDate = parsed;
        } else {
          delete quoteData.quoteDate; // invalid date string, let DB default
        }
      }

      // Get settings for quote prefix
      const prefixSetting = await storage.getSetting("quotePrefix");
      const prefix = prefixSetting?.value || "QT";

      // Generate quote number
      const lastQuoteNumber = await storage.getLastQuoteNumber();
      const quoteNumber = generateDocumentNumber(prefix, lastQuoteNumber);

      // Create quote
      const quote = await storage.createQuote({
        ...quoteData,
        quoteNumber,
        createdBy: req.user!.id,
      });

      // Create quote items
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await storage.createQuoteItem({
            quoteId: quote.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            subtotal: String(item.quantity * item.unitPrice),
            sortOrder: i,
          });
        }
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_quote",
        entityType: "quote",
        entityId: quote.id,
      });

      return res.json(quote);
    } catch (error: any) {
      console.error("Create quote error:", error);
      return res.status(500).json({ error: error.message || "Failed to create quote" });
    }
  });

  app.patch("/api/quotes/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      // Check if quote exists and is not invoiced
      const existingQuote = await storage.getQuote(req.params.id);
      if (!existingQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Prevent editing invoiced quotes
      if (existingQuote.status === "invoiced") {
        return res.status(400).json({ error: "Cannot edit an invoiced quote" });
      }

      const quote = await storage.updateQuote(req.params.id, req.body);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_quote",
        entityType: "quote",
        entityId: quote.id,
      });

      return res.json(quote);
    } catch (error) {
      return res.status(500).json({ error: "Failed to update quote" });
    }
  });

  app.put("/api/quotes/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      // Check if quote exists and is not invoiced
      const existingQuote = await storage.getQuote(req.params.id);
      if (!existingQuote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Prevent editing invoiced quotes
      if (existingQuote.status === "invoiced") {
        return res.status(400).json({ error: "Cannot edit an invoiced quote" });
      }

      const { items, ...quoteData } = req.body;

      // Update quote
      const quote = await storage.updateQuote(req.params.id, quoteData);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Update quote items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await storage.deleteQuoteItems(req.params.id);

        // Create new items
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await storage.createQuoteItem({
            quoteId: quote.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            subtotal: String(item.quantity * item.unitPrice),
            sortOrder: i,
          });
        }
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_quote",
        entityType: "quote",
        entityId: quote.id,
      });

      return res.json(quote);
    } catch (error: any) {
      console.error("Update quote error:", error);
      return res.status(500).json({ error: error.message || "Failed to update quote" });
    }
  });

  app.post("/api/quotes/:id/convert-to-invoice", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      // Check if already invoiced
      const existingInvoice = await storage.getInvoiceByQuote(quote.id);
      if (existingInvoice) {
        return res.status(400).json({ error: "Quote already converted to invoice" });
      }

      // Get settings for invoice prefix
      const prefixSetting = await storage.getSetting("invoicePrefix");
      const prefix = prefixSetting?.value || "INV";

      // Generate invoice number
      const lastInvoiceNumber = await storage.getLastInvoiceNumber();
      const invoiceNumber = generateDocumentNumber(prefix, lastInvoiceNumber);

      // Create invoice
      const invoice = await storage.createInvoice({
        invoiceNumber,
        quoteId: quote.id,
        paymentStatus: "pending",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        paidAmount: "0",
      });

      // Update quote status
      await storage.updateQuote(quote.id, { status: "invoiced" });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "convert_to_invoice",
        entityType: "quote",
        entityId: quote.id,
      });

      return res.json(invoice);
    } catch (error: any) {
      console.error("Convert to invoice error:", error);
      return res.status(500).json({ error: error.message || "Failed to convert to invoice" });
    }
  });

  // PDF Export for Quotes
  app.get("/api/quotes/:id/pdf", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const client = await storage.getClient(quote.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const items = await storage.getQuoteItems(quote.id);

      const pdfStream = PDFService.generateQuotePDF({
        quote,
        client,
        items,
        companyName: "Your Company",
        companyAddress: "Company Address",
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Quote-${quote.quoteNumber}.pdf"`);
      pdfStream.pipe(res);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "export_pdf",
        entityType: "quote",
        entityId: quote.id,
      });
    } catch (error: any) {
      console.error("PDF export error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate PDF" });
    }
  });

  // Email Quote
  app.post("/api/quotes/:id/email", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { recipientEmail, message } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ error: "Recipient email is required" });
      }

      const quote = await storage.getQuote(req.params.id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }

      const client = await storage.getClient(quote.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const items = await storage.getQuoteItems(quote.id);

      // Generate PDF for attachment
      const pdfStream = PDFService.generateQuotePDF({
        quote,
        client,
        items,
        companyName: "Your Company",
        companyAddress: "Company Address",
      });

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      await new Promise((resolve, reject) => {
        pdfStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        pdfStream.on("end", resolve);
        pdfStream.on("error", reject);
      });
      const pdfBuffer = Buffer.concat(chunks);

      // Send email with PDF attachment
      await EmailService.sendQuoteEmail(
        recipientEmail,
        quote.quoteNumber,
        client.name,
        pdfBuffer,
        message || ""
      );

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "email_quote",
        entityType: "quote",
        entityId: quote.id,
      });

      return res.json({ success: true, message: "Quote sent successfully" });
    } catch (error: any) {
      console.error("Email quote error:", error);
      return res.status(500).json({ error: error.message || "Failed to send quote email" });
    }
  });

  // Invoices Routes
  app.get("/api/invoices", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const invoices = await storage.getAllInvoices();
      const invoicesWithDetails = await Promise.all(
        invoices.map(async (invoice) => {
          const quote = await storage.getQuote(invoice.quoteId);
          const client = quote ? await storage.getClient(quote.clientId) : null;
          return {
            ...invoice,
            quoteNumber: quote?.quoteNumber || "",
            clientName: client?.name || "Unknown",
            total: quote?.total || "0",
          };
        })
      );
      return res.json(invoicesWithDetails);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // Get Invoice by ID
  app.get("/api/invoices/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const quote = await storage.getQuote(invoice.quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Related quote not found" });
      }

      const client = await storage.getClient(quote.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const items = await storage.getQuoteItems(quote.id);

      const invoiceDetail = {
        ...invoice,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
        client: {
          name: client.name,
          email: client.email,
          phone: client.phone || "",
          billingAddress: client.billingAddress || "",
          gstin: client.gstin || "",
        },
        items: items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
        subtotal: quote.subtotal,
        discount: quote.discount,
        cgst: quote.cgst,
        sgst: quote.sgst,
        igst: quote.igst,
        shippingCharges: quote.shippingCharges,
        total: quote.total,
      };

      return res.json(invoiceDetail);
    } catch (error: any) {
      console.error("Get invoice error:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch invoice" });
    }
  });

  // Update Invoice Payment Status and Amount
  app.put("/api/invoices/:id/payment-status", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { paymentStatus, paidAmount } = req.body;

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const quote = await storage.getQuote(invoice.quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Related quote not found" });
      }

      const updateData: Partial<typeof invoice> = {};

      if (paymentStatus !== undefined) {
        updateData.paymentStatus = paymentStatus;
      }

      if (paidAmount !== undefined) {
        const numPaidAmount = Number(paidAmount);
        const totalAmount = Number(quote.total);

        if (numPaidAmount < 0 || numPaidAmount > totalAmount) {
          return res.status(400).json({ error: "Invalid paid amount" });
        }

        updateData.paidAmount = String(numPaidAmount);

        // Auto-update status based on amount if not explicitly set
        if (paymentStatus === undefined) {
          if (numPaidAmount >= totalAmount) {
            updateData.paymentStatus = "paid";
          } else if (numPaidAmount > 0) {
            updateData.paymentStatus = "partial";
          } else {
            updateData.paymentStatus = "pending";
          }
        }

        updateData.lastPaymentDate = new Date();
      }

      const updatedInvoice = await storage.updateInvoice(req.params.id, updateData);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_payment_status",
        entityType: "invoice",
        entityId: invoice.id,
      });

      return res.json(updatedInvoice);
    } catch (error: any) {
      console.error("Update payment status error:", error);
      return res.status(500).json({ error: error.message || "Failed to update payment status" });
    }
  });

  // Record Invoice Payment (incremental)
  app.post("/api/invoices/:id/payment", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, paymentMethod, transactionId, notes, paymentDate } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid payment amount is required" });
      }

      if (!paymentMethod) {
        return res.status(400).json({ error: "Payment method is required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const quote = await storage.getQuote(invoice.quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Related quote not found" });
      }

      // Create payment history record
      await storage.createPaymentHistory({
        invoiceId: req.params.id,
        amount: String(amount),
        paymentMethod,
        transactionId: transactionId || undefined,
        notes: notes || undefined,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        recordedBy: req.user!.id,
      });

      // Update invoice totals
      const newPaidAmount = Number(invoice.paidAmount) + Number(amount);
      const totalAmount = Number(quote.total);
      
      let newPaymentStatus = invoice.paymentStatus;
      if (newPaidAmount >= totalAmount) {
        newPaymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "partial";
      }

      const updatedInvoice = await storage.updateInvoice(req.params.id, {
        paidAmount: String(newPaidAmount),
        paymentStatus: newPaymentStatus,
        lastPaymentDate: new Date(),
        paymentMethod: paymentMethod,
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "record_payment",
        entityType: "invoice",
        entityId: invoice.id,
      });

      return res.json(updatedInvoice);
    } catch (error: any) {
      console.error("Record payment error:", error);
      return res.status(500).json({ error: error.message || "Failed to record payment" });
    }
  });

  // Get Invoice Payment History (Detailed with actual payment records)
  app.get("/api/invoices/:id/payment-history-detailed", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Get payment history records
      const payments = await storage.getPaymentHistory(req.params.id);

      // Enrich with user names
      const enrichedPayments = await Promise.all(
        payments.map(async (payment) => {
          const user = await storage.getUser(payment.recordedBy);
          return {
            ...payment,
            recordedByName: user?.name || "Unknown",
          };
        })
      );

      return res.json(enrichedPayments);
    } catch (error) {
      console.error("Fetch payment history error:", error);
      return res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  // Get Invoice Payment History (Legacy - for backward compatibility)
  app.get("/api/invoices/:id/payment-history", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Parse payment notes to create history (legacy)
      const history = [];
      if (invoice.paymentNotes) {
        const entries = invoice.paymentNotes.split("\n").filter(e => e.trim());
        for (const entry of entries) {
          const match = entry.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z): (.+)$/);
          if (match) {
            history.push({
              date: match[1],
              note: match[2],
            });
          }
        }
      }

      return res.json({
        invoiceId: invoice.id,
        paidAmount: invoice.paidAmount,
        lastPaymentDate: invoice.lastPaymentDate,
        paymentMethod: invoice.paymentMethod,
        history,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch payment history" });
    }
  });

  // Delete Payment History Record
  app.delete("/api/payment-history/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      // First get the payment record to get invoice details
      const payments = await storage.getPaymentHistory("");
      const payment = payments.find(p => p.id === req.params.id);

      if (!payment) {
        return res.status(404).json({ error: "Payment record not found" });
      }

      const invoice = await storage.getInvoice(payment.invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const quote = await storage.getQuote(invoice.quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Related quote not found" });
      }

      // Delete payment record
      await storage.deletePaymentHistory(req.params.id);

      // Recalculate invoice totals
      const allPayments = await storage.getPaymentHistory(payment.invoiceId);
      const newPaidAmount = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalAmount = Number(quote.total);

      let newPaymentStatus: "pending" | "partial" | "paid" | "overdue" = "pending";
      if (newPaidAmount >= totalAmount) {
        newPaymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        newPaymentStatus = "partial";
      }

      const lastPayment = allPayments[0]; // Already sorted by date desc
      await storage.updateInvoice(payment.invoiceId, {
        paidAmount: String(newPaidAmount),
        paymentStatus: newPaymentStatus,
        lastPaymentDate: lastPayment?.paymentDate || null,
        paymentMethod: lastPayment?.paymentMethod || null,
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_payment",
        entityType: "invoice",
        entityId: invoice.id,
      });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Delete payment error:", error);
      return res.status(500).json({ error: error.message || "Failed to delete payment" });
    }
  });

  // PDF Export for Invoices
  app.get("/api/invoices/:id/pdf", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const quote = await storage.getQuote(invoice.quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Related quote not found" });
      }

      const client = await storage.getClient(quote.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const items = await storage.getQuoteItems(quote.id);

      const pdfStream = PDFService.generateInvoicePDF({
        quote,
        client,
        items,
        companyName: "Your Company",
        companyAddress: "Company Address",
        invoiceNumber: invoice.invoiceNumber,
        dueDate: new Date(invoice.dueDate),
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      pdfStream.pipe(res);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "export_pdf",
        entityType: "invoice",
        entityId: invoice.id,
      });
    } catch (error: any) {
      console.error("PDF export error:", error);
      return res.status(500).json({ error: error.message || "Failed to generate PDF" });
    }
  });

  // Email Invoice
  app.post("/api/invoices/:id/email", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { recipientEmail, message } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ error: "Recipient email is required" });
      }

      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const quote = await storage.getQuote(invoice.quoteId);
      if (!quote) {
        return res.status(404).json({ error: "Related quote not found" });
      }

      const client = await storage.getClient(quote.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      const items = await storage.getQuoteItems(quote.id);

      // Generate PDF for attachment
      const pdfStream = PDFService.generateInvoicePDF({
        quote,
        client,
        items,
        companyName: "Your Company",
        companyAddress: "Company Address",
        invoiceNumber: invoice.invoiceNumber,
        dueDate: new Date(invoice.dueDate),
      });

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      await new Promise((resolve, reject) => {
        pdfStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        pdfStream.on("end", resolve);
        pdfStream.on("error", reject);
      });
      const pdfBuffer = Buffer.concat(chunks);

      // Send email with PDF attachment
      await EmailService.sendInvoiceEmail(
        recipientEmail,
        invoice.invoiceNumber,
        client.name,
        pdfBuffer,
        new Date(invoice.dueDate)
      );

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "email_invoice",
        entityType: "invoice",
        entityId: invoice.id,
      });

      return res.json({ success: true, message: "Invoice sent successfully" });
    } catch (error: any) {
      console.error("Email invoice error:", error);
      return res.status(500).json({ error: error.message || "Failed to send invoice email" });
    }
  });

  // Templates Routes
  app.get("/api/templates", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const type = req.query.type as string | undefined;
      const style = req.query.style as string | undefined;

      let templates;
      if (type) {
        templates = await storage.getTemplatesByType(type);
      } else if (style) {
        templates = await storage.getTemplatesByStyle(style);
      } else {
        templates = await storage.getAllTemplates();
      }

      return res.json(templates);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/type/:type", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const templates = await storage.getTemplatesByType(req.params.type);
      return res.json(templates);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch templates by type" });
    }
  });

  app.get("/api/templates/default/:type", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const template = await storage.getDefaultTemplate(req.params.type);
      if (!template) {
        return res.status(404).json({ error: "Default template not found" });
      }
      return res.json(template);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch default template" });
    }
  });

  app.get("/api/templates/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      return res.json(template);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/templates", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const template = await storage.createTemplate({
        ...req.body,
        createdBy: req.user!.id,
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_template",
        entityType: "template",
        entityId: template.id,
      });

      return res.json(template);
    } catch (error: any) {
      console.error("Create template error:", error);
      return res.status(500).json({ error: error.message || "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_template",
        entityType: "template",
        entityId: template.id,
      });

      return res.json(template);
    } catch (error: any) {
      console.error("Update template error:", error);
      return res.status(500).json({ error: error.message || "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteTemplate(req.params.id);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_template",
        entityType: "template",
        entityId: req.params.id,
      });

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Settings/Pricing Routes
  app.get("/api/settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can access settings" });
      }
      const settings = await storage.getAllSettings();
      return res.json(settings);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can update settings" });
      }
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: "Key and value are required" });
      }
      const setting = await storage.upsertSetting({
        key,
        value,
        updatedBy: req.user!.id,
      });
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_setting",
        entityType: "setting",
        entityId: key,
      });
      return res.json(setting);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update setting" });
    }
  });

  // Tax Rate Management
  app.get("/api/tax-rates", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const taxRates = await storage.getAllTaxRates();
      return res.json(taxRates || []);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch tax rates" });
    }
  });

  app.post("/api/tax-rates", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create tax rates" });
      }
      const { region, taxType, sgstRate, cgstRate, igstRate } = req.body;
      if (!region || !taxType) {
        return res.status(400).json({ error: "Region and taxType are required" });
      }
      const taxRate = await storage.createTaxRate({
        region,
        taxType,
        sgstRate: sgstRate ? String(sgstRate) : "0",
        cgstRate: cgstRate ? String(cgstRate) : "0",
        igstRate: igstRate ? String(igstRate) : "0",
      });
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_tax_rate",
        entityType: "tax_rate",
        entityId: taxRate.id,
      });
      return res.json(taxRate);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to create tax rate" });
    }
  });

  app.patch("/api/tax-rates/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can update tax rates" });
      }
      const taxRate = await storage.updateTaxRate(req.params.id, req.body);
      if (!taxRate) {
        return res.status(404).json({ error: "Tax rate not found" });
      }
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_tax_rate",
        entityType: "tax_rate",
        entityId: req.params.id,
      });
      return res.json(taxRate);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update tax rate" });
    }
  });

  app.delete("/api/tax-rates/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can delete tax rates" });
      }
      await storage.deleteTaxRate(req.params.id);
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_tax_rate",
        entityType: "tax_rate",
        entityId: req.params.id,
      });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete tax rate" });
    }
  });

  // Pricing Tier Management
  app.get("/api/pricing-tiers", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const tiers = await storage.getAllPricingTiers();
      return res.json(tiers || []);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch pricing tiers" });
    }
  });

  app.post("/api/pricing-tiers", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create pricing tiers" });
      }
      const { name, minAmount, maxAmount, discountPercent } = req.body;
      if (!name || minAmount === undefined || maxAmount === undefined || discountPercent === undefined) {
        return res.status(400).json({ error: "Name, minAmount, maxAmount, and discountPercent are required" });
      }
      const tier = await storage.createPricingTier({
        name,
        minAmount: String(minAmount),
        maxAmount: String(maxAmount),
        discountPercent: String(discountPercent),
      });
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_pricing_tier",
        entityType: "pricing_tier",
        entityId: tier.id,
      });
      return res.json(tier);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to create pricing tier" });
    }
  });

  app.patch("/api/pricing-tiers/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can update pricing tiers" });
      }
      const tier = await storage.updatePricingTier(req.params.id, req.body);
      if (!tier) {
        return res.status(404).json({ error: "Pricing tier not found" });
      }
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_pricing_tier",
        entityType: "pricing_tier",
        entityId: req.params.id,
      });
      return res.json(tier);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update pricing tier" });
    }
  });

  app.delete("/api/pricing-tiers/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Only admins can delete pricing tiers" });
      }
      await storage.deletePricingTier(req.params.id);
      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_pricing_tier",
        entityType: "pricing_tier",
        entityId: req.params.id,
      });
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete pricing tier" });
    }
  });

  // Analytics Routes
  app.get("/api/analytics/dashboard", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const quotes = await storage.getAllQuotes();
      const clients = await storage.getAllClients();
      const invoices = await storage.getAllInvoices();

      const totalQuotes = quotes.length;
      const totalClients = clients.length;

      const approvedQuotes = quotes.filter(q => q.status === "approved" || q.status === "invoiced");
      const totalRevenue = approvedQuotes.reduce((sum, q) => sum + Number(q.total), 0);

      const conversionRate = totalQuotes > 0
        ? ((approvedQuotes.length / totalQuotes) * 100).toFixed(1)
        : "0";

      const recentQuotes = await Promise.all(
        quotes.slice(0, 5).map(async (quote) => {
          const client = await storage.getClient(quote.clientId);
          return {
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            clientName: client?.name || "Unknown",
            total: quote.total,
            status: quote.status,
            createdAt: quote.createdAt,
          };
        })
      );

      const quotesByStatus = quotes.reduce((acc: any[], quote) => {
        const existing = acc.find(item => item.status === quote.status);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ status: quote.status, count: 1 });
        }
        return acc;
      }, []);

      // Monthly revenue (simplified - last 6 months)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const monthQuotes = approvedQuotes.filter(q => {
          const qDate = new Date(q.createdAt);
          return qDate.getMonth() === date.getMonth() && qDate.getFullYear() === date.getFullYear();
        });
        const revenue = monthQuotes.reduce((sum, q) => sum + Number(q.total), 0);
        monthlyRevenue.push({ month, revenue });
      }

      return res.json({
        totalQuotes,
        totalClients,
        totalRevenue: totalRevenue.toFixed(2),
        conversionRate,
        recentQuotes,
        quotesByStatus,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/:timeRange(\\d+)", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const timeRange = req.params.timeRange ? Number(req.params.timeRange) : 12;
      
      const quotes = await storage.getAllQuotes();
      const clients = await storage.getAllClients();

      // Filter by time range
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - timeRange);
      const filteredQuotes = quotes.filter(q => new Date(q.createdAt) >= cutoffDate);

      const approvedQuotes = filteredQuotes.filter(q => q.status === "approved" || q.status === "invoiced");
      const totalRevenue = approvedQuotes.reduce((sum, q) => sum + Number(q.total), 0);
      const avgQuoteValue = filteredQuotes.length > 0
        ? (filteredQuotes.reduce((sum, q) => sum + Number(q.total), 0) / filteredQuotes.length).toFixed(2)
        : "0";

      const conversionRate = filteredQuotes.length > 0
        ? ((approvedQuotes.length / filteredQuotes.length) * 100).toFixed(1)
        : "0";

      // Monthly data
      const monthlyData = [];
      for (let i = timeRange - 1; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        
        const monthQuotes = filteredQuotes.filter(q => {
          const qDate = new Date(q.createdAt);
          return qDate.getMonth() === date.getMonth() && qDate.getFullYear() === date.getFullYear();
        });
        
        const monthApproved = monthQuotes.filter(q => q.status === "approved" || q.status === "invoiced");
        const revenue = monthApproved.reduce((sum, q) => sum + Number(q.total), 0);
        
        monthlyData.push({
          month,
          quotes: monthQuotes.length,
          revenue,
          conversions: monthApproved.length,
        });
      }

      // Top clients
      const clientRevenue = new Map<string, { name: string; totalRevenue: number; quoteCount: number }>();
      
      for (const quote of approvedQuotes) {
        const client = await storage.getClient(quote.clientId);
        if (!client) continue;
        
        const existing = clientRevenue.get(client.id);
        if (existing) {
          existing.totalRevenue += Number(quote.total);
          existing.quoteCount += 1;
        } else {
          clientRevenue.set(client.id, {
            name: client.name,
            totalRevenue: Number(quote.total),
            quoteCount: 1,
          });
        }
      }

      const topClients = Array.from(clientRevenue.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10)
        .map(c => ({
          name: c.name,
          totalRevenue: c.totalRevenue.toFixed(2),
          quoteCount: c.quoteCount,
        }));

      // Status breakdown
      const statusBreakdown = filteredQuotes.reduce((acc: any[], quote) => {
        const existing = acc.find(item => item.status === quote.status);
        const value = Number(quote.total);
        if (existing) {
          existing.count += 1;
          existing.value += value;
        } else {
          acc.push({ status: quote.status, count: 1, value });
        }
        return acc;
      }, []);

      return res.json({
        overview: {
          totalQuotes: filteredQuotes.length,
          totalRevenue: totalRevenue.toFixed(2),
          avgQuoteValue,
          conversionRate,
        },
        monthlyData,
        topClients,
        statusBreakdown,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // PHASE 3 - ADVANCED ANALYTICS ENDPOINTS
  app.get("/api/analytics/forecast", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const monthsAhead = req.query.months ? Number(req.query.months) : 3;
      const forecast = await analyticsService.getRevenueForecast(monthsAhead);
      return res.json(forecast);
    } catch (error) {
      console.error("Forecast error:", error);
      return res.status(500).json({ error: "Failed to fetch forecast" });
    }
  });

  app.get("/api/analytics/deal-distribution", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const distribution = await analyticsService.getDealDistribution();
      return res.json(distribution);
    } catch (error) {
      console.error("Deal distribution error:", error);
      return res.status(500).json({ error: "Failed to fetch deal distribution" });
    }
  });

  app.get("/api/analytics/regional", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const regionalData = await analyticsService.getRegionalDistribution();
      return res.json(regionalData);
    } catch (error) {
      console.error("Regional data error:", error);
      return res.status(500).json({ error: "Failed to fetch regional data" });
    }
  });

  app.post("/api/analytics/custom-report", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, status, minAmount, maxAmount } = req.body;
      const report = await analyticsService.getCustomReport({
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        minAmount,
        maxAmount,
      });
      return res.json(report);
    } catch (error) {
      console.error("Custom report error:", error);
      return res.status(500).json({ error: "Failed to generate custom report" });
    }
  });

  app.get("/api/analytics/pipeline", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const pipeline = await analyticsService.getSalesPipeline();
      return res.json(pipeline);
    } catch (error) {
      console.error("Pipeline error:", error);
      return res.status(500).json({ error: "Failed to fetch pipeline data" });
    }
  });

  app.get("/api/analytics/client/:clientId/ltv", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const ltv = await analyticsService.getClientLifetimeValue(req.params.clientId);
      return res.json(ltv);
    } catch (error) {
      console.error("LTV error:", error);
      return res.status(500).json({ error: "Failed to fetch client LTV" });
    }
  });

  app.get("/api/analytics/competitor-insights", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const insights = await analyticsService.getCompetitorInsights();
      return res.json(insights);
    } catch (error) {
      console.error("Competitor insights error:", error);
      return res.status(500).json({ error: "Failed to fetch competitor insights" });
    }
  });

  // PHASE 3 - CLIENT MANAGEMENT ENDPOINTS (Tags & Communications)
  app.get("/api/clients/:clientId/tags", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const tags = await storage.getClientTags(req.params.clientId);
      return res.json(tags);
    } catch (error) {
      console.error("Get tags error:", error);
      return res.status(500).json({ error: "Failed to fetch client tags" });
    }
  });

  app.post("/api/clients/:clientId/tags", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { tag } = req.body;
      if (!tag) {
        return res.status(400).json({ error: "Tag is required" });
      }

      const clientTag = await storage.addClientTag({
        clientId: req.params.clientId,
        tag,
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "add_client_tag",
        entityType: "client",
        entityId: req.params.clientId,
      });

      return res.json(clientTag);
    } catch (error) {
      console.error("Add tag error:", error);
      return res.status(500).json({ error: "Failed to add tag" });
    }
  });

  app.delete("/api/clients/tags/:tagId", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.removeClientTag(req.params.tagId);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "remove_client_tag",
        entityType: "client_tag",
        entityId: req.params.tagId,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Remove tag error:", error);
      return res.status(500).json({ error: "Failed to remove tag" });
    }
  });

  app.get("/api/clients/:clientId/communications", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const communications = await storage.getClientCommunications(req.params.clientId);
      return res.json(communications);
    } catch (error) {
      console.error("Get communications error:", error);
      return res.status(500).json({ error: "Failed to fetch communications" });
    }
  });

  app.post("/api/clients/:clientId/communications", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { type, subject, message, attachments } = req.body;

      if (!type || !["email", "call", "meeting", "note"].includes(type)) {
        return res.status(400).json({ error: "Valid communication type is required" });
      }

      const communication = await storage.createClientCommunication({
        clientId: req.params.clientId,
        type,
        subject,
        message,
        date: new Date(),
        communicatedBy: req.user!.id,
        attachments: attachments ? JSON.stringify(attachments) : undefined,
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_communication",
        entityType: "client",
        entityId: req.params.clientId,
      });

      return res.json(communication);
    } catch (error: any) {
      console.error("Create communication error:", error);
      return res.status(500).json({ error: error.message || "Failed to create communication" });
    }
  });

  app.delete("/api/clients/communications/:commId", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteClientCommunication(req.params.commId);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_communication",
        entityType: "client_communication",
        entityId: req.params.commId,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Delete communication error:", error);
      return res.status(500).json({ error: "Failed to delete communication" });
    }
  });

  // PHASE 3 - TAX RATES ENDPOINTS
  app.get("/api/tax-rates", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const rates = await storage.getAllTaxRates();
      return res.json(rates);
    } catch (error) {
      console.error("Get tax rates error:", error);
      return res.status(500).json({ error: "Failed to fetch tax rates" });
    }
  });

  app.get("/api/tax-rates/:region", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const rate = await storage.getTaxRateByRegion(req.params.region);
      if (!rate) {
        return res.status(404).json({ error: "Tax rate not found for region" });
      }
      return res.json(rate);
    } catch (error) {
      console.error("Get tax rate error:", error);
      return res.status(500).json({ error: "Failed to fetch tax rate" });
    }
  });

  app.post("/api/tax-rates", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { region, taxType, sgstRate, cgstRate, igstRate, effectiveFrom, effectiveTo } = req.body;

      if (!region || !taxType) {
        return res.status(400).json({ error: "Region and taxType are required" });
      }

      const taxRate = await storage.createTaxRate({
        region,
        taxType,
        sgstRate,
        cgstRate,
        igstRate,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_tax_rate",
        entityType: "tax_rate",
        entityId: taxRate.id,
      });

      return res.json(taxRate);
    } catch (error: any) {
      console.error("Create tax rate error:", error);
      return res.status(500).json({ error: error.message || "Failed to create tax rate" });
    }
  });

  app.patch("/api/tax-rates/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const updated = await storage.updateTaxRate(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Tax rate not found" });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_tax_rate",
        entityType: "tax_rate",
        entityId: req.params.id,
      });

      return res.json(updated);
    } catch (error: any) {
      console.error("Update tax rate error:", error);
      return res.status(500).json({ error: error.message || "Failed to update tax rate" });
    }
  });

  app.delete("/api/tax-rates/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      await storage.deleteTaxRate(req.params.id);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_tax_rate",
        entityType: "tax_rate",
        entityId: req.params.id,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Delete tax rate error:", error);
      return res.status(500).json({ error: "Failed to delete tax rate" });
    }
  });

  // PHASE 3 - PRICING TIERS ENDPOINTS
  app.get("/api/pricing-tiers", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const tiers = await storage.getAllPricingTiers();
      return res.json(tiers);
    } catch (error) {
      console.error("Get pricing tiers error:", error);
      return res.status(500).json({ error: "Failed to fetch pricing tiers" });
    }
  });

  app.post("/api/pricing-tiers", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { name, minAmount, maxAmount, discountPercent, description, isActive } = req.body;

      if (!name || minAmount === undefined) {
        return res.status(400).json({ error: "Name and minAmount are required" });
      }

      const tier = await storage.createPricingTier({
        name,
        minAmount,
        maxAmount,
        discountPercent,
        description,
        isActive: isActive !== false,
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "create_pricing_tier",
        entityType: "pricing_tier",
        entityId: tier.id,
      });

      return res.json(tier);
    } catch (error: any) {
      console.error("Create pricing tier error:", error);
      return res.status(500).json({ error: error.message || "Failed to create pricing tier" });
    }
  });

  app.patch("/api/pricing-tiers/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const updated = await storage.updatePricingTier(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Pricing tier not found" });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_pricing_tier",
        entityType: "pricing_tier",
        entityId: req.params.id,
      });

      return res.json(updated);
    } catch (error: any) {
      console.error("Update pricing tier error:", error);
      return res.status(500).json({ error: error.message || "Failed to update pricing tier" });
    }
  });

  app.delete("/api/pricing-tiers/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      await storage.deletePricingTier(req.params.id);

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "delete_pricing_tier",
        entityType: "pricing_tier",
        entityId: req.params.id,
      });

      return res.json({ success: true });
    } catch (error) {
      console.error("Delete pricing tier error:", error);
      return res.status(500).json({ error: "Failed to delete pricing tier" });
    }
  });

  // PHASE 3 - PRICING CALCULATION ENDPOINTS
  app.post("/api/pricing/calculate-discount", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { subtotal } = req.body;

      if (!subtotal || subtotal <= 0) {
        return res.status(400).json({ error: "Valid subtotal is required" });
      }

      const result = await pricingService.calculateDiscount(subtotal);
      return res.json(result);
    } catch (error: any) {
      console.error("Calculate discount error:", error);
      return res.status(500).json({ error: error.message || "Failed to calculate discount" });
    }
  });

  app.post("/api/pricing/calculate-taxes", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, region, useIGST } = req.body;

      if (!amount || !region) {
        return res.status(400).json({ error: "Amount and region are required" });
      }

      const taxes = await pricingService.calculateTaxes(amount, region, useIGST);
      return res.json(taxes);
    } catch (error: any) {
      console.error("Calculate taxes error:", error);
      return res.status(500).json({ error: error.message || "Failed to calculate taxes" });
    }
  });

  app.post("/api/pricing/calculate-total", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { subtotal, region, useIGST, shippingCharges, customDiscount } = req.body;

      if (!subtotal || !region) {
        return res.status(400).json({ error: "Subtotal and region are required" });
      }

      const total = await pricingService.calculateQuoteTotal({
        subtotal,
        region,
        useIGST,
        shippingCharges,
        customDiscount,
      });

      return res.json(total);
    } catch (error: any) {
      console.error("Calculate total error:", error);
      return res.status(500).json({ error: error.message || "Failed to calculate total" });
    }
  });

  app.post("/api/pricing/convert-currency", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;

      if (!amount || !fromCurrency || !toCurrency) {
        return res.status(400).json({ error: "Amount, fromCurrency, and toCurrency are required" });
      }

      const converted = await pricingService.convertCurrency(amount, fromCurrency, toCurrency);
      return res.json({ original: amount, converted, fromCurrency, toCurrency });
    } catch (error: any) {
      console.error("Convert currency error:", error);
      return res.status(500).json({ error: error.message || "Failed to convert currency" });
    }
  });

  // PHASE 3 - CURRENCY SETTINGS ENDPOINTS
  app.get("/api/currency-settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const settings = await storage.getCurrencySettings();
      if (!settings) {
        return res.json({ baseCurrency: "INR", supportedCurrencies: "[]", exchangeRates: "{}" });
      }
      return res.json(settings);
    } catch (error) {
      console.error("Get currency settings error:", error);
      return res.status(500).json({ error: "Failed to fetch currency settings" });
    }
  });

  app.post("/api/currency-settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { baseCurrency, supportedCurrencies, exchangeRates } = req.body;

      const settings = await storage.upsertCurrencySettings({
        baseCurrency: baseCurrency || "INR",
        supportedCurrencies: typeof supportedCurrencies === "string" ? supportedCurrencies : JSON.stringify(supportedCurrencies),
        exchangeRates: typeof exchangeRates === "string" ? exchangeRates : JSON.stringify(exchangeRates),
      });

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_currency_settings",
        entityType: "settings",
      });

      return res.json(settings);
    } catch (error: any) {
      console.error("Update currency settings error:", error);
      return res.status(500).json({ error: error.message || "Failed to update currency settings" });
    }
  });

  // Settings Routes
  // Enhanced Admin Settings
  app.get("/api/admin/settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const settings = await storage.getAllSettings();
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });

      // Organize settings by category
      const categories = {
        company: {
          companyName: settingsMap["companyName"] || "",
          companyEmail: settingsMap["companyEmail"] || "",
          companyPhone: settingsMap["companyPhone"] || "",
          companyWebsite: settingsMap["companyWebsite"] || "",
          companyAddress: settingsMap["companyAddress"] || "",
          companyLogo: settingsMap["companyLogo"] || "",
        },
        taxation: {
          gstin: settingsMap["gstin"] || "",
          taxType: settingsMap["taxType"] || "GST", // GST, VAT, etc.
          defaultTaxRate: settingsMap["defaultTaxRate"] || "18",
          enableIGST: settingsMap["enableIGST"] === "true",
          enableCGST: settingsMap["enableCGST"] === "true",
          enableSGST: settingsMap["enableSGST"] === "true",
        },
        documents: {
          quotePrefix: settingsMap["quotePrefix"] || "QT",
          invoicePrefix: settingsMap["invoicePrefix"] || "INV",
          nextQuoteNumber: settingsMap["nextQuoteNumber"] || "1001",
          nextInvoiceNumber: settingsMap["nextInvoiceNumber"] || "1001",
        },
        email: {
          smtpHost: settingsMap["smtpHost"] || "",
          smtpPort: settingsMap["smtpPort"] || "",
          smtpEmail: settingsMap["smtpEmail"] || "",
          emailTemplateQuote: settingsMap["emailTemplateQuote"] || "",
          emailTemplateInvoice: settingsMap["emailTemplateInvoice"] || "",
          emailTemplatePaymentReminder: settingsMap["emailTemplatePaymentReminder"] || "",
        },
        general: {
          quotaValidityDays: settingsMap["quotaValidityDays"] || "30",
          invoiceDueDays: settingsMap["invoiceDueDays"] || "30",
          enableAutoReminders: settingsMap["enableAutoReminders"] === "true",
          reminderDaysBeforeDue: settingsMap["reminderDaysBeforeDue"] || "3",
        },
      };

      return res.json(categories);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch admin settings" });
    }
  });

  app.post("/api/admin/settings/company", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const companySettings = req.body;
      for (const [key, value] of Object.entries(companySettings)) {
        await storage.upsertSetting({
          key,
          value: String(value),
          updatedBy: req.user!.id,
        });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_company_settings",
        entityType: "settings",
      });

      return res.json({ success: true, message: "Company settings updated" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update company settings" });
    }
  });

  app.post("/api/admin/settings/taxation", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const taxSettings = req.body;
      for (const [key, value] of Object.entries(taxSettings)) {
        await storage.upsertSetting({
          key,
          value: String(value),
          updatedBy: req.user!.id,
        });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_tax_settings",
        entityType: "settings",
      });

      return res.json({ success: true, message: "Tax settings updated" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update tax settings" });
    }
  });

  app.post("/api/admin/settings/email", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const emailSettings = req.body;
      for (const [key, value] of Object.entries(emailSettings)) {
        await storage.upsertSetting({
          key,
          value: String(value),
          updatedBy: req.user!.id,
        });
      }

      // Reinitialize email service with new SMTP settings
      if (emailSettings.smtpHost) {
        EmailService.initialize({
          host: emailSettings.smtpHost,
          port: Number(emailSettings.smtpPort),
          secure: emailSettings.smtpSecure === "true",
          auth: {
            user: emailSettings.smtpEmail,
            pass: process.env.SMTP_PASSWORD || "",
          },
          from: emailSettings.smtpEmail || "noreply@quoteprogen.com",
        });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_email_settings",
        entityType: "settings",
      });

      return res.json({ success: true, message: "Email settings updated" });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update email settings" });
    }
  });

  // User Management (Admin Panel)
  app.get("/api/admin/users", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const users = await storage.getAllUsers();
      const sanitized = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      }));

      return res.json(sanitized);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:userId/role", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { role } = req.body;
      if (!["admin", "manager", "user", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const updated = await storage.updateUser(req.params.userId, { role });
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "change_user_role",
        entityType: "user",
        entityId: req.params.userId,
      });

      return res.json({ success: true, message: `User role changed to ${role}` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update user role" });
    }
  });

  app.patch("/api/admin/users/:userId/status", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { status } = req.body;
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updated = await storage.updateUser(req.params.userId, { status });
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "change_user_status",
        entityType: "user",
        entityId: req.params.userId,
      });

      return res.json({ success: true, message: `User status changed to ${status}` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update user status" });
    }
  });

  app.get("/api/settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const settings = await storage.getAllSettings();
      const settingsMap: Record<string, string> = {};
      settings.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      return res.json(settingsMap);
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const settingsData = req.body;
      
      for (const [key, value] of Object.entries(settingsData)) {
        await storage.upsertSetting({
          key,
          value: String(value),
          updatedBy: req.user!.id,
        });
      }

      await storage.createActivityLog({
        userId: req.user!.id,
        action: "update_settings",
        entityType: "settings",
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || "Failed to update settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
