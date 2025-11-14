import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  users,
  clients,
  quotes,
  quoteItems,
  invoices,
  paymentHistory,
  templates,
  activityLogs,
  settings,
  clientTags,
  clientCommunications,
  taxRates,
  pricingTiers,
  currencySettings,
  type User,
  type InsertUser,
  type Client,
  type InsertClient,
  type Quote,
  type InsertQuote,
  type QuoteItem,
  type InsertQuoteItem,
  type Invoice,
  type InsertInvoice,
  type PaymentHistory,
  type InsertPaymentHistory,
  type Template,
  type InsertTemplate,
  type ActivityLog,
  type InsertActivityLog,
  type Setting,
  type InsertSetting,
  type ClientTag,
  type InsertClientTag,
  type ClientCommunication,
  type InsertClientCommunication,
  type TaxRate,
  type InsertTaxRate,
  type PricingTier,
  type InsertPricingTier,
  type CurrencySetting,
  type InsertCurrencySetting,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, "password"> & { passwordHash: string }): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Clients
  getClient(id: string): Promise<Client | undefined>;
  getClientsByCreator(createdBy: string): Promise<Client[]>;
  getAllClients(): Promise<Client[]>;
  createClient(client: InsertClient & { createdBy: string }): Promise<Client>;
  updateClient(id: string, data: Partial<Client>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;

  // Quotes
  getQuote(id: string): Promise<Quote | undefined>;
  getQuotesByCreator(createdBy: string): Promise<Quote[]>;
  getAllQuotes(): Promise<Quote[]>;
  createQuote(quote: InsertQuote & { createdBy: string; quoteNumber: string }): Promise<Quote>;
  updateQuote(id: string, data: Partial<Quote>): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<void>;
  getLastQuoteNumber(): Promise<string | undefined>;

  // Quote Items
  getQuoteItems(quoteId: string): Promise<QuoteItem[]>;
  createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem>;
  deleteQuoteItems(quoteId: string): Promise<void>;

  // Invoices
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceByQuote(quoteId: string): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined>;
  getLastInvoiceNumber(): Promise<string | undefined>;

  // Payment History
  getPaymentHistory(invoiceId: string): Promise<PaymentHistory[]>;
  createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory>;
  deletePaymentHistory(id: string): Promise<void>;

  // Templates
  getTemplate(id: string): Promise<Template | undefined>;
  getAllTemplates(): Promise<Template[]>;
  getTemplatesByType(type: string): Promise<Template[]>;
  getTemplatesByStyle(style: string): Promise<Template[]>;
  getDefaultTemplate(type: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate & { createdBy: string }): Promise<Template>;
  updateTemplate(id: string, data: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<void>;

  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(userId: string, limit?: number): Promise<ActivityLog[]>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  getAllSettings(): Promise<Setting[]>;
  upsertSetting(setting: InsertSetting): Promise<Setting>;

  // PHASE 3 - Client Tags
  getClientTags(clientId: string): Promise<ClientTag[]>;
  addClientTag(tag: InsertClientTag): Promise<ClientTag>;
  removeClientTag(tagId: string): Promise<void>;

  // PHASE 3 - Client Communications
  getClientCommunications(clientId: string): Promise<ClientCommunication[]>;
  createClientCommunication(communication: InsertClientCommunication): Promise<ClientCommunication>;
  deleteClientCommunication(id: string): Promise<void>;

  // PHASE 3 - Tax Rates
  getTaxRate(id: string): Promise<TaxRate | undefined>;
  getTaxRateByRegion(region: string): Promise<TaxRate | undefined>;
  getAllTaxRates(): Promise<TaxRate[]>;
  getActiveTaxRates(): Promise<TaxRate[]>;
  createTaxRate(rate: InsertTaxRate): Promise<TaxRate>;
  updateTaxRate(id: string, data: Partial<TaxRate>): Promise<TaxRate | undefined>;
  deleteTaxRate(id: string): Promise<void>;

  // PHASE 3 - Pricing Tiers
  getPricingTier(id: string): Promise<PricingTier | undefined>;
  getAllPricingTiers(): Promise<PricingTier[]>;
  getPricingTierByAmount(amount: number): Promise<PricingTier | undefined>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
  updatePricingTier(id: string, data: Partial<PricingTier>): Promise<PricingTier | undefined>;
  deletePricingTier(id: string): Promise<void>;

  // PHASE 3 - Currency Settings
  getCurrencySettings(): Promise<CurrencySetting | undefined>;
  upsertCurrencySettings(settings: InsertCurrencySetting): Promise<CurrencySetting>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: Omit<InsertUser, "password"> & { passwordHash: string }): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values(user)
      .returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    // Delete in order of dependencies to avoid foreign key constraint violations
    // 1. Delete activity logs for this user
    await db.delete(activityLogs).where(eq(activityLogs.userId, id));
    
    // 2. Delete templates created by this user
    await db.delete(templates).where(eq(templates.createdBy, id));
    
    // 3. Delete quotes created by this user (this will cascade to quote items due to onDelete: "cascade")
    await db.delete(quotes).where(eq(quotes.createdBy, id));
    
    // 4. Delete clients created by this user
    await db.delete(clients).where(eq(clients.createdBy, id));
    
    // 5. Finally, delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Clients
  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientsByCreator(createdBy: string): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.createdBy, createdBy));
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async createClient(client: InsertClient & { createdBy: string }): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | undefined> {
    const [updated] = await db
      .update(clients)
      .set(data)
      .where(eq(clients.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Quotes
  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuotesByCreator(createdBy: string): Promise<Quote[]> {
    return await db.select().from(quotes).where(eq(quotes.createdBy, createdBy)).orderBy(desc(quotes.createdAt));
  }

  async getAllQuotes(): Promise<Quote[]> {
    return await db.select().from(quotes).orderBy(desc(quotes.createdAt));
  }

  async createQuote(quote: InsertQuote & { createdBy: string; quoteNumber: string }): Promise<Quote> {
    const [newQuote] = await db.insert(quotes).values(quote).returning();
    return newQuote;
  }

  async updateQuote(id: string, data: Partial<Quote>): Promise<Quote | undefined> {
    const [updated] = await db
      .update(quotes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteQuote(id: string): Promise<void> {
    await db.delete(quotes).where(eq(quotes.id, id));
  }

  async getLastQuoteNumber(): Promise<string | undefined> {
    const [lastQuote] = await db.select().from(quotes).orderBy(desc(quotes.createdAt)).limit(1);
    return lastQuote?.quoteNumber;
  }

  // Quote Items
  async getQuoteItems(quoteId: string): Promise<QuoteItem[]> {
    return await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId)).orderBy(quoteItems.sortOrder);
  }

  async createQuoteItem(item: InsertQuoteItem): Promise<QuoteItem> {
    const [newItem] = await db.insert(quoteItems).values(item).returning();
    return newItem;
  }

  async deleteQuoteItems(quoteId: string): Promise<void> {
    await db.delete(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  }

  // Invoices
  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoiceByQuote(quoteId: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.quoteId, quoteId));
    return invoice || undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updated] = await db
      .update(invoices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updated || undefined;
  }

  async getLastInvoiceNumber(): Promise<string | undefined> {
    const [lastInvoice] = await db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(1);
    return lastInvoice?.invoiceNumber;
  }

  // Payment History
  async getPaymentHistory(invoiceId: string): Promise<PaymentHistory[]> {
    return await db
      .select()
      .from(paymentHistory)
      .where(eq(paymentHistory.invoiceId, invoiceId))
      .orderBy(desc(paymentHistory.paymentDate));
  }

  async createPaymentHistory(payment: InsertPaymentHistory): Promise<PaymentHistory> {
    const [newPayment] = await db.insert(paymentHistory).values(payment).returning();
    return newPayment;
  }

  async deletePaymentHistory(id: string): Promise<void> {
    await db.delete(paymentHistory).where(eq(paymentHistory.id, id));
  }

  // Templates
  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getAllTemplates(): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.isActive, true));
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.type, type) && eq(templates.isActive, true));
  }

  async getTemplatesByStyle(style: string): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .where(eq(templates.style, style) && eq(templates.isActive, true));
  }

  async getDefaultTemplate(type: string): Promise<Template | undefined> {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.type, type) && eq(templates.isDefault, true));
    return template || undefined;
  }

  async createTemplate(template: InsertTemplate & { createdBy: string }): Promise<Template> {
    const [newTemplate] = await db.insert(templates).values(template).returning();
    return newTemplate;
  }

  async updateTemplate(id: string, data: Partial<Template>): Promise<Template | undefined> {
    const [updated] = await db
      .update(templates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Activity Logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getActivityLogs(userId: string, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async upsertSetting(setting: InsertSetting): Promise<Setting> {
    const existing = await this.getSetting(setting.key);
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set({ ...setting, updatedAt: new Date() })
        .where(eq(settings.key, setting.key))
        .returning();
      return updated;
    } else {
      const [newSetting] = await db.insert(settings).values(setting).returning();
      return newSetting;
    }
  }

  // PHASE 3 - Client Tags
  async getClientTags(clientId: string): Promise<ClientTag[]> {
    return await db.select().from(clientTags).where(eq(clientTags.clientId, clientId));
  }

  async addClientTag(tag: InsertClientTag): Promise<ClientTag> {
    const [newTag] = await db.insert(clientTags).values(tag).returning();
    return newTag;
  }

  async removeClientTag(tagId: string): Promise<void> {
    await db.delete(clientTags).where(eq(clientTags.id, tagId));
  }

  // PHASE 3 - Client Communications
  async getClientCommunications(clientId: string): Promise<ClientCommunication[]> {
    return await db
      .select()
      .from(clientCommunications)
      .where(eq(clientCommunications.clientId, clientId))
      .orderBy(desc(clientCommunications.date));
  }

  async createClientCommunication(communication: InsertClientCommunication): Promise<ClientCommunication> {
    const [newComm] = await db.insert(clientCommunications).values(communication).returning();
    return newComm;
  }

  async deleteClientCommunication(id: string): Promise<void> {
    await db.delete(clientCommunications).where(eq(clientCommunications.id, id));
  }

  // PHASE 3 - Tax Rates
  async getTaxRate(id: string): Promise<TaxRate | undefined> {
    const [rate] = await db.select().from(taxRates).where(eq(taxRates.id, id));
    return rate || undefined;
  }

  async getTaxRateByRegion(region: string): Promise<TaxRate | undefined> {
    const [rate] = await db
      .select()
      .from(taxRates)
      .where(and(eq(taxRates.region, region), eq(taxRates.isActive, true)))
      .orderBy(desc(taxRates.effectiveFrom))
      .limit(1);
    return rate || undefined;
  }

  async getAllTaxRates(): Promise<TaxRate[]> {
    return await db.select().from(taxRates).orderBy(desc(taxRates.effectiveFrom));
  }

  async getActiveTaxRates(): Promise<TaxRate[]> {
    return await db
      .select()
      .from(taxRates)
      .where(eq(taxRates.isActive, true))
      .orderBy(desc(taxRates.effectiveFrom));
  }

  async createTaxRate(rate: InsertTaxRate): Promise<TaxRate> {
    const [newRate] = await db.insert(taxRates).values(rate).returning();
    return newRate;
  }

  async updateTaxRate(id: string, data: Partial<TaxRate>): Promise<TaxRate | undefined> {
    const [updated] = await db.update(taxRates).set(data).where(eq(taxRates.id, id)).returning();
    return updated || undefined;
  }

  async deleteTaxRate(id: string): Promise<void> {
    await db.delete(taxRates).where(eq(taxRates.id, id));
  }

  // PHASE 3 - Pricing Tiers
  async getPricingTier(id: string): Promise<PricingTier | undefined> {
    const [tier] = await db.select().from(pricingTiers).where(eq(pricingTiers.id, id));
    return tier || undefined;
  }

  async getAllPricingTiers(): Promise<PricingTier[]> {
    return await db.select().from(pricingTiers);
  }

  async getPricingTierByAmount(amount: number): Promise<PricingTier | undefined> {
    const [tier] = await db
      .select()
      .from(pricingTiers)
      .where(eq(pricingTiers.isActive, true));
    // Find tier where amount is between min and max
    const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.isActive, true));
    return tiers.find(t => {
      const min = parseFloat(t.minAmount.toString());
      const max = t.maxAmount ? parseFloat(t.maxAmount.toString()) : Infinity;
      return amount >= min && amount <= max;
    });
  }

  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> {
    const [newTier] = await db.insert(pricingTiers).values(tier).returning();
    return newTier;
  }

  async updatePricingTier(id: string, data: Partial<PricingTier>): Promise<PricingTier | undefined> {
    const [updated] = await db.update(pricingTiers).set(data).where(eq(pricingTiers.id, id)).returning();
    return updated || undefined;
  }

  async deletePricingTier(id: string): Promise<void> {
    await db.delete(pricingTiers).where(eq(pricingTiers.id, id));
  }

  // PHASE 3 - Currency Settings
  async getCurrencySettings(): Promise<CurrencySetting | undefined> {
    const [settings] = await db.select().from(currencySettings).limit(1);
    return settings || undefined;
  }

  async upsertCurrencySettings(settings: InsertCurrencySetting): Promise<CurrencySetting> {
    const existing = await this.getCurrencySettings();
    if (existing) {
      const [updated] = await db
        .update(currencySettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(currencySettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newSettings] = await db.insert(currencySettings).values(settings).returning();
      return newSettings;
    }
  }
}

export const storage = new DatabaseStorage();
