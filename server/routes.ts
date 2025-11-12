import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { z } from "zod";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const JWT_SECRET = process.env.SESSION_SECRET;
const JWT_EXPIRES_IN = "15m";

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

      // Create user with default role "user"
      const user = await storage.createUser({
        email,
        backupEmail,
        passwordHash,
        name,
        role: "user",
        status: "active",
      });

      // Generate token
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

      await storage.createActivityLog({
        userId: user.id,
        action: "signup",
        entityType: "user",
        entityId: user.id,
      });

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

      // In production, send email to backupEmail with reset link
      console.log(`Password reset link for ${email}: /reset-password?token=${resetToken}`);

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Failed to process request" });
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
    } catch (error) {
      return res.status(500).json({ error: "Failed to delete user" });
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

  app.get("/api/analytics", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const timeRange = req.query.timeRange ? Number(req.query.timeRange) : 12;
      
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

  // Settings Routes
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
