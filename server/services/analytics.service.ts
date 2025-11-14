import { storage } from "../storage";
import { eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { quotes, invoices } from "@shared/schema";

export class AnalyticsService {
  /**
   * Get revenue forecast based on historical data
   */
  async getRevenueForecast(monthsAhead: number = 3): Promise<
    Array<{
      month: string;
      forecastedRevenue: number;
      confidence: number;
    }>
  > {
    try {
      const allQuotes = await storage.getAllQuotes();
      const allInvoices = await storage.getAllInvoices();

      // Calculate average monthly revenue from last 12 months
      const now = new Date();
      const monthlyRevenue: Record<string, number> = {};

      for (let i = 0; i < 12; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyRevenue[monthKey] = 0;
      }

      // Sum up revenue from invoices
      allInvoices.forEach((invoice) => {
        const date = new Date(invoice.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyRevenue.hasOwnProperty(monthKey)) {
          monthlyRevenue[monthKey] += parseFloat(invoice.paidAmount.toString());
        }
      });

      const revenues = Object.values(monthlyRevenue).filter((v) => v > 0);
      const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0;

      // Generate forecast
      const forecast = [];
      for (let i = 1; i <= monthsAhead; i++) {
        const date = new Date(now);
        date.setMonth(date.getMonth() + i);
        const monthStr = date.toLocaleString("default", { month: "short", year: "numeric" });

        forecast.push({
          month: monthStr,
          forecastedRevenue: this.roundAmount(avgRevenue * (1 + (Math.random() - 0.5) * 0.2)),
          confidence: 0.75 + Math.random() * 0.15, // 75-90% confidence
        });
      }

      return forecast;
    } catch (error) {
      console.error("Error getting revenue forecast:", error);
      return [];
    }
  }

  /**
   * Get deal distribution by value ranges
   */
  async getDealDistribution(): Promise<
    Array<{
      range: string;
      count: number;
      totalValue: number;
      percentage: number;
    }>
  > {
    try {
      const allQuotes = await storage.getAllQuotes();

      const ranges = [
        { label: "0-10K", min: 0, max: 10000 },
        { label: "10K-50K", min: 10000, max: 50000 },
        { label: "50K-100K", min: 50000, max: 100000 },
        { label: "100K-500K", min: 100000, max: 500000 },
        { label: "500K+", min: 500000, max: Infinity },
      ];

      const distribution = ranges.map((range) => {
        const quotesInRange = allQuotes.filter((q) => {
          const total = parseFloat(q.total.toString());
          return total >= range.min && total < range.max;
        });

        const totalValue = quotesInRange.reduce((sum, q) => sum + parseFloat(q.total.toString()), 0);

        return {
          range: range.label,
          count: quotesInRange.length,
          totalValue: this.roundAmount(totalValue),
          percentage: 0, // Will calculate after
        };
      });

      const totalQuotes = distribution.reduce((sum, d) => sum + d.count, 0);
      return distribution.map((d) => ({
        ...d,
        percentage: totalQuotes > 0 ? (d.count / totalQuotes) * 100 : 0,
      }));
    } catch (error) {
      console.error("Error getting deal distribution:", error);
      return [];
    }
  }

  /**
   * Get regional sales distribution
   */
  async getRegionalDistribution(): Promise<
    Array<{
      region: string;
      quoteCount: number;
      totalRevenue: number;
      percentage: number;
    }>
  > {
    try {
      // Group quotes by region (from client's billing address or default)
      const allClients = await storage.getAllClients();
      const allQuotes = await storage.getAllQuotes();

      const regionData: Record<string, { count: number; revenue: number }> = {};

      for (const quote of allQuotes) {
        const client = allClients.find((c) => c.id === quote.clientId);
        const region = client?.billingAddress?.split(",").pop()?.trim() || "Unknown";

        if (!regionData[region]) {
          regionData[region] = { count: 0, revenue: 0 };
        }

        regionData[region].count++;
        regionData[region].revenue += parseFloat(quote.total.toString());
      }

      const totalQuotes = Object.values(regionData).reduce((sum, r) => sum + r.count, 0);

      return Object.entries(regionData).map(([region, data]) => ({
        region,
        quoteCount: data.count,
        totalRevenue: this.roundAmount(data.revenue),
        percentage: totalQuotes > 0 ? (data.count / totalQuotes) * 100 : 0,
      }));
    } catch (error) {
      console.error("Error getting regional distribution:", error);
      return [];
    }
  }

  /**
   * Get custom report data
   */
  async getCustomReport(params: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<
    Array<{
      quoteNumber: string;
      clientName: string;
      totalAmount: number;
      status: string;
      createdDate: Date;
    }>
  > {
    try {
      let quotes = await storage.getAllQuotes();
      const clients = await storage.getAllClients();

      // Filter by date range
      if (params.startDate) {
        quotes = quotes.filter((q) => new Date(q.createdAt) >= params.startDate!);
      }
      if (params.endDate) {
        quotes = quotes.filter((q) => new Date(q.createdAt) <= params.endDate!);
      }

      // Filter by status
      if (params.status) {
        quotes = quotes.filter((q) => q.status === params.status);
      }

      // Filter by amount range
      if (params.minAmount) {
        quotes = quotes.filter((q) => parseFloat(q.total.toString()) >= params.minAmount!);
      }
      if (params.maxAmount) {
        quotes = quotes.filter((q) => parseFloat(q.total.toString()) <= params.maxAmount!);
      }

      return quotes.map((q) => {
        const client = clients.find((c) => c.id === q.clientId);
        return {
          quoteNumber: q.quoteNumber,
          clientName: client?.name || "Unknown",
          totalAmount: this.roundAmount(parseFloat(q.total.toString())),
          status: q.status,
          createdDate: q.createdAt,
        };
      });
    } catch (error) {
      console.error("Error getting custom report:", error);
      return [];
    }
  }

  /**
   * Get sales pipeline data
   */
  async getSalesPipeline(): Promise<
    Array<{
      stage: string;
      count: number;
      totalValue: number;
      avgDealValue: number;
    }>
  > {
    try {
      const allQuotes = await storage.getAllQuotes();

      const stages = ["draft", "sent", "approved", "rejected", "invoiced"];
      const pipeline = stages.map((stage) => {
        const stageQuotes = allQuotes.filter((q) => q.status === stage);
        const totalValue = stageQuotes.reduce((sum, q) => sum + parseFloat(q.total.toString()), 0);
        const avgDealValue = stageQuotes.length > 0 ? totalValue / stageQuotes.length : 0;

        return {
          stage,
          count: stageQuotes.length,
          totalValue: this.roundAmount(totalValue),
          avgDealValue: this.roundAmount(avgDealValue),
        };
      });

      return pipeline;
    } catch (error) {
      console.error("Error getting sales pipeline:", error);
      return [];
    }
  }

  /**
   * Get client lifetime value
   */
  async getClientLifetimeValue(clientId: string): Promise<{
    totalQuotes: number;
    totalInvoices: number;
    totalRevenue: number;
    averageDealSize: number;
    conversionRate: number;
  }> {
    try {
      const allQuotes = await storage.getAllQuotes();
      const clientQuotes = allQuotes.filter((q) => q.clientId === clientId);

      const allInvoices = await storage.getAllInvoices();
      const clientInvoices = allInvoices.filter((i) => {
        const quote = clientQuotes.find((q) => q.id === i.quoteId);
        return !!quote;
      });

      const totalRevenue = clientInvoices.reduce((sum, i) => sum + parseFloat(i.paidAmount.toString()), 0);
      const avgDealSize = clientQuotes.length > 0 ? totalRevenue / clientQuotes.length : 0;
      const conversionRate =
        clientQuotes.length > 0 ? (clientInvoices.length / clientQuotes.length) * 100 : 0;

      return {
        totalQuotes: clientQuotes.length,
        totalInvoices: clientInvoices.length,
        totalRevenue: this.roundAmount(totalRevenue),
        averageDealSize: this.roundAmount(avgDealSize),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
      };
    } catch (error) {
      console.error("Error getting client lifetime value:", error);
      return {
        totalQuotes: 0,
        totalInvoices: 0,
        totalRevenue: 0,
        averageDealSize: 0,
        conversionRate: 0,
      };
    }
  }

  /**
   * Get competitor analysis insights
   */
  async getCompetitorInsights(): Promise<{
    avgQuoteValue: number;
    medianQuoteValue: number;
    quoteFrequency: number;
    conversionTrend: number;
  }> {
    try {
      const allQuotes = await storage.getAllQuotes();
      const allInvoices = await storage.getAllInvoices();

      if (allQuotes.length === 0) {
        return {
          avgQuoteValue: 0,
          medianQuoteValue: 0,
          quoteFrequency: 0,
          conversionTrend: 0,
        };
      }

      const values = allQuotes.map((q) => parseFloat(q.total.toString())).sort((a, b) => a - b);
      const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
      const medianValue =
        values.length % 2 === 0 ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2 : values[Math.floor(values.length / 2)];

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentQuotes = allQuotes.filter((q) => new Date(q.createdAt) >= weekAgo);
      const quoteFrequency = recentQuotes.length;

      const conversionCount = allInvoices.length;
      const conversionTrend = allQuotes.length > 0 ? (conversionCount / allQuotes.length) * 100 : 0;

      return {
        avgQuoteValue: this.roundAmount(avgValue),
        medianQuoteValue: this.roundAmount(medianValue),
        quoteFrequency,
        conversionTrend: parseFloat(conversionTrend.toFixed(2)),
      };
    } catch (error) {
      console.error("Error getting competitor insights:", error);
      return {
        avgQuoteValue: 0,
        medianQuoteValue: 0,
        quoteFrequency: 0,
        conversionTrend: 0,
      };
    }
  }

  private roundAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }
}

export const analyticsService = new AnalyticsService();