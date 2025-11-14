import { storage } from "../storage";
import { Decimal } from "decimal.js";

export class PricingService {
  /**
   * Calculate discount based on quote amount and applicable pricing tier
   */
  async calculateDiscount(subtotal: number): Promise<{
    discountPercent: number;
    discountAmount: number;
    finalAmount: number;
  }> {
    try {
      const tier = await storage.getPricingTierByAmount(subtotal);
      
      if (!tier) {
        return {
          discountPercent: 0,
          discountAmount: 0,
          finalAmount: subtotal,
        };
      }

      const discountPercent = parseFloat(tier.discountPercent.toString());
      const discountAmount = subtotal * (discountPercent / 100);
      const finalAmount = subtotal - discountAmount;

      return {
        discountPercent,
        discountAmount,
        finalAmount,
      };
    } catch (error) {
      console.error("Error calculating discount:", error);
      return {
        discountPercent: 0,
        discountAmount: 0,
        finalAmount: subtotal,
      };
    }
  }

  /**
   * Get applicable tax rates for a region
   */
  async getTaxRatesForRegion(region: string): Promise<{
    sgstRate: number;
    cgstRate: number;
    igstRate: number;
  }> {
    try {
      const taxRate = await storage.getTaxRateByRegion(region);
      
      if (!taxRate) {
        // Return default rates
        return {
          sgstRate: 0,
          cgstRate: 0,
          igstRate: 0,
        };
      }

      return {
        sgstRate: parseFloat(taxRate.sgstRate.toString()),
        cgstRate: parseFloat(taxRate.cgstRate.toString()),
        igstRate: parseFloat(taxRate.igstRate.toString()),
      };
    } catch (error) {
      console.error("Error getting tax rates:", error);
      return {
        sgstRate: 0,
        cgstRate: 0,
        igstRate: 0,
      };
    }
  }

  /**
   * Calculate taxes on an amount
   */
  async calculateTaxes(
    amount: number,
    region: string,
    useIGST: boolean = false
  ): Promise<{
    sgst: number;
    cgst: number;
    igst: number;
    totalTax: number;
  }> {
    const rates = await this.getTaxRatesForRegion(region);

    if (useIGST) {
      const igst = amount * (rates.igstRate / 100);
      return {
        sgst: 0,
        cgst: 0,
        igst,
        totalTax: igst,
      };
    } else {
      const sgst = amount * (rates.sgstRate / 100);
      const cgst = amount * (rates.cgstRate / 100);
      return {
        sgst,
        cgst,
        igst: 0,
        totalTax: sgst + cgst,
      };
    }
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    try {
      const currencySettings = await storage.getCurrencySettings();
      if (!currencySettings || !currencySettings.exchangeRates) {
        return amount;
      }

      const rates = JSON.parse(currencySettings.exchangeRates);
      const fromRate = rates[fromCurrency] || 1;
      const toRate = rates[toCurrency] || 1;

      return (amount / fromRate) * toRate;
    } catch (error) {
      console.error("Error converting currency:", error);
      return amount;
    }
  }

  /**
   * Apply rounding rules to a monetary amount
   */
  roundAmount(amount: number, roundingRule: "nearest" | "up" | "down" = "nearest"): number {
    const decimal = new Decimal(amount);
    
    switch (roundingRule) {
      case "up":
        return parseFloat(decimal.toDecimalPlaces(2, Decimal.ROUND_UP).toString());
      case "down":
        return parseFloat(decimal.toDecimalPlaces(2, Decimal.ROUND_DOWN).toString());
      case "nearest":
      default:
        return parseFloat(decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString());
    }
  }

  /**
   * Calculate final quote total with all adjustments
   */
  async calculateQuoteTotal(params: {
    subtotal: number;
    region: string;
    useIGST: boolean;
    shippingCharges?: number;
    customDiscount?: number;
  }): Promise<{
    subtotal: number;
    discount: number;
    discountedSubtotal: number;
    shipping: number;
    subtotalWithShipping: number;
    sgst: number;
    cgst: number;
    igst: number;
    total: number;
  }> {
    let discount = params.customDiscount || 0;

    // Apply tier-based discount if no custom discount
    if (!params.customDiscount) {
      const discountCalc = await this.calculateDiscount(params.subtotal);
      discount = discountCalc.discountAmount;
    }

    const discountedSubtotal = params.subtotal - discount;
    const shipping = params.shippingCharges || 0;
    const subtotalWithShipping = discountedSubtotal + shipping;

    const taxes = await this.calculateTaxes(subtotalWithShipping, params.region, params.useIGST);

    const total = this.roundAmount(subtotalWithShipping + taxes.totalTax);

    return {
      subtotal: this.roundAmount(params.subtotal),
      discount: this.roundAmount(discount),
      discountedSubtotal: this.roundAmount(discountedSubtotal),
      shipping: this.roundAmount(shipping),
      subtotalWithShipping: this.roundAmount(subtotalWithShipping),
      sgst: this.roundAmount(taxes.sgst),
      cgst: this.roundAmount(taxes.cgst),
      igst: this.roundAmount(taxes.igst),
      total,
    };
  }
}

export const pricingService = new PricingService();