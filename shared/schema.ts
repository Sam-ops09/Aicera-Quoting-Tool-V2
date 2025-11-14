import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "user", "viewer"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const quoteStatusEnum = pgEnum("quote_status", ["draft", "sent", "approved", "rejected", "invoiced"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "partial", "paid", "overdue"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  backupEmail: text("backup_email"),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  status: userStatusEnum("status").notNull().default("active"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  refreshToken: text("refresh_token"),
  refreshTokenExpiry: timestamp("refresh_token_expiry"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  quotes: many(quotes),
  templates: many(templates),
  activityLogs: many(activityLogs),
  communications: many(clientCommunications),
}));

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  billingAddress: text("billing_address"),
  shippingAddress: text("shipping_address"),
  gstin: text("gstin"),
  contactPerson: text("contact_person"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
  creator: one(users, {
    fields: [clients.createdBy],
    references: [users.id],
  }),
  quotes: many(quotes),
  tags: many(clientTags),
  communications: many(clientCommunications),
}));

// Quotes table
export const quotes = pgTable("quotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteNumber: text("quote_number").notNull().unique(),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  templateId: varchar("template_id").references(() => templates.id),
  status: quoteStatusEnum("status").notNull().default("draft"),
  validityDays: integer("validity_days").notNull().default(30),
  quoteDate: timestamp("quote_date").notNull().defaultNow(),
  validUntil: timestamp("valid_until"),
  referenceNumber: text("reference_number"),
  attentionTo: text("attention_to"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  cgst: decimal("cgst", { precision: 12, scale: 2 }).notNull().default("0"),
  sgst: decimal("sgst", { precision: 12, scale: 2 }).notNull().default("0"),
  igst: decimal("igst", { precision: 12, scale: 2 }).notNull().default("0"),
  shippingCharges: decimal("shipping_charges", { precision: 12, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  // Advanced Sections
  bomSection: text("bom_section"), // Bill of Materials JSON
  slaSection: text("sla_section"), // Service Level Agreement JSON
  timelineSection: text("timeline_section"), // Project Timeline JSON
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  template: one(templates, {
    fields: [quotes.templateId],
    references: [templates.id],
  }),
  creator: one(users, {
    fields: [quotes.createdBy],
    references: [users.id],
  }),
  items: many(quoteItems),
  invoice: one(invoices),
}));

// Quote Items table
export const quoteItems = pgTable("quote_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
}));

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").notNull().unique(),
  quoteId: varchar("quote_id").notNull().unique().references(() => quotes.id),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  dueDate: timestamp("due_date").notNull(),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  // Payment Tracking
  lastPaymentDate: timestamp("last_payment_date"),
  paymentMethod: text("payment_method"), // bank_transfer, credit_card, check, etc.
  paymentNotes: text("payment_notes"),
  paymentReminderSentAt: timestamp("payment_reminder_sent_at"),
  overdueReminderSentAt: timestamp("overdue_reminder_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  quote: one(quotes, {
    fields: [invoices.quoteId],
    references: [quotes.id],
  }),
  payments: many(paymentHistory),
}));

// Payment History table
export const paymentHistory = pgTable("payment_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // bank_transfer, credit_card, check, cash, upi, etc.
  transactionId: text("transaction_id"), // Reference number from payment gateway or bank
  notes: text("notes"),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  recordedBy: varchar("recorded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  invoice: one(invoices, {
    fields: [paymentHistory.invoiceId],
    references: [invoices.id],
  }),
  recordedBy: one(users, {
    fields: [paymentHistory.recordedBy],
    references: [users.id],
  }),
}));

// Templates table
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // quote, invoice, email
  style: text("style").notNull().default("professional"), // professional, modern, minimal
  description: text("description"),
  headerImage: text("header_image"), // URL to header image
  logoUrl: text("logo_url"),
  colors: text("colors"), // JSON for color scheme
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const templatesRelations = relations(templates, ({ one, many }) => ({
  creator: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
  quotes: many(quotes),
}));

// Activity Logs table
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Settings table
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// CLIENT MANAGEMENT PHASE 3 - CLIENT TAGS TABLE
export const clientTags = pgTable("client_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clientTagsRelations = relations(clientTags, ({ one }) => ({
  client: one(clients, {
    fields: [clientTags.clientId],
    references: [clients.id],
  }),
}));

// CLIENT MANAGEMENT PHASE 3 - COMMUNICATION HISTORY TABLE
export const clientCommunications = pgTable("client_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // email, call, meeting, note
  subject: text("subject"),
  message: text("message"),
  date: timestamp("date").notNull().defaultNow(),
  communicatedBy: varchar("communicated_by").notNull().references(() => users.id),
  attachments: text("attachments"), // JSON array of attachment URLs
});

export const clientCommunicationsRelations = relations(clientCommunications, ({ one }) => ({
  client: one(clients, {
    fields: [clientCommunications.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [clientCommunications.communicatedBy],
    references: [users.id],
  }),
}));

// TAX & PRICING PHASE 3 - TAX RATES TABLE
export const taxRates = pgTable("tax_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  region: text("region").notNull(), // IN-AP, IN-KA, IN-MH, etc.
  taxType: text("tax_type").notNull(), // GST, VAT, SAT, etc.
  sgstRate: decimal("sgst_rate", { precision: 5, scale: 2 }).notNull().default("0"), // State GST
  cgstRate: decimal("cgst_rate", { precision: 5, scale: 2 }).notNull().default("0"), // Central GST
  igstRate: decimal("igst_rate", { precision: 5, scale: 2 }).notNull().default("0"), // Integrated GST
  effectiveFrom: timestamp("effective_from").notNull().defaultNow(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// TAX & PRICING PHASE 3 - PRICING TIERS TABLE
export const pricingTiers = pgTable("pricing_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Standard, Premium, Enterprise
  minAmount: decimal("min_amount", { precision: 12, scale: 2 }).notNull(),
  maxAmount: decimal("max_amount", { precision: 12, scale: 2 }),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// TAX & PRICING PHASE 3 - CURRENCY SETTINGS TABLE
export const currencySettings = pgTable("currency_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  baseCurrency: text("base_currency").notNull().default("INR"), // Default currency
  supportedCurrencies: text("supported_currencies").notNull(), // JSON array
  exchangeRates: text("exchange_rates"), // JSON object of rates
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  backupEmail: true,
  passwordHash: true,
  name: true,
  role: true,
  status: true,
  refreshToken: true,
  refreshTokenExpiry: true,
}).extend({
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    "Password must contain uppercase, lowercase, number, and special character"),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  quoteNumber: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
});

export const insertQuoteItemSchema = createInsertSchema(quoteItems).omit({
  id: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// PHASE 3 - CLIENT MANAGEMENT INSERT SCHEMAS
export const insertClientTagSchema = createInsertSchema(clientTags).omit({
  id: true,
  createdAt: true,
});

export const insertClientCommunicationSchema = createInsertSchema(clientCommunications).omit({
  id: true,
});

// PHASE 3 - TAX & PRICING INSERT SCHEMAS
export const insertTaxRateSchema = createInsertSchema(taxRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCurrencySettingSchema = createInsertSchema(currencySettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type QuoteItem = typeof quoteItems.$inferSelect;
export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

// PHASE 3 - CLIENT MANAGEMENT TYPES
export type ClientTag = typeof clientTags.$inferSelect;
export type InsertClientTag = z.infer<typeof insertClientTagSchema>;

export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type InsertClientCommunication = z.infer<typeof insertClientCommunicationSchema>;

// PHASE 3 - TAX & PRICING TYPES
export type TaxRate = typeof taxRates.$inferSelect;
export type InsertTaxRate = z.infer<typeof insertTaxRateSchema>;

export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;

export type CurrencySetting = typeof currencySettings.$inferSelect;
export type InsertCurrencySetting = z.infer<typeof insertCurrencySettingSchema>;
