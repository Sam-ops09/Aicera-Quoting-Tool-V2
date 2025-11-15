import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building, FileText, Calculator, Settings, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const companyFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  phone: z.string(),
  email: z.string().email("Invalid email address"),
  website: z.string().optional(),
});

const quoteSettingsSchema = z.object({
  quotePrefix: z.string().min(1, "Quote prefix is required"),
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  taxRate: z.coerce.number().min(0).max(100),
});

const taxRateSchema = z.object({
  region: z.string().min(1, "Region is required"),
  taxType: z.string().min(1, "Tax type is required"),
  sgstRate: z.coerce.number().min(0).max(100),
  cgstRate: z.coerce.number().min(0).max(100),
  igstRate: z.coerce.number().min(0).max(100),
});

type TaxRate = {
  id: string;
  region: string;
  taxType: string;
  sgstRate: string;
  cgstRate: string;
  igstRate: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
};

const pricingTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  minAmount: z.coerce.number().min(0),
  maxAmount: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100),
  description: z.string().optional(),
});

type PricingTier = {
  id: string;
  name: string;
  minAmount: string;
  maxAmount?: string;
  discountPercent: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const currencySettingsSchema = z.object({
  baseCurrency: z.string().min(1, "Base currency is required"),
  supportedCurrencies: z.array(z.string()).min(1, "At least one currency is required"),
});

type CurrencySettings = {
  id?: string;
  baseCurrency: string;
  supportedCurrencies: string;
  exchangeRates?: string;
  updatedAt?: string;
};

export default function AdminSettings() {
  const { toast } = useToast();

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const { data: taxRates, isLoading: taxRatesLoading } = useQuery<TaxRate[]>({
    queryKey: ["/api/tax-rates"],
  });

  const { data: pricingTiers, isLoading: pricingTiersLoading } = useQuery<PricingTier[]>({
    queryKey: ["/api/pricing-tiers"],
  });

  const { data: currencySettings } = useQuery<CurrencySettings>({
    queryKey: ["/api/currency-settings"],
  });

  const companyForm = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    values: {
      companyName: settings?.companyName || settings?.company_name || "",
      address: settings?.address || settings?.company_address || "",
      taxId: settings?.taxId || settings?.company_gstin || "",
      phone: settings?.phone || settings?.company_phone || "",
      email: settings?.email || settings?.company_email || "",
      website: settings?.website || settings?.company_website || "",
    },
  });

  const quoteSettingsForm = useForm<z.infer<typeof quoteSettingsSchema>>({
    resolver: zodResolver(quoteSettingsSchema),
    values: {
      quotePrefix: settings?.quotePrefix || "QT",
      invoicePrefix: settings?.invoicePrefix || "INV",
      taxRate: Number(settings?.taxRate) || 18,
    },
  });

  const taxRateForm = useForm<z.infer<typeof taxRateSchema>>({
    resolver: zodResolver(taxRateSchema),
    defaultValues: {
      region: "",
      taxType: "GST",
      sgstRate: 0,
      cgstRate: 0,
      igstRate: 0,
    },
  });

  const pricingTierForm = useForm<z.infer<typeof pricingTierSchema>>({
    resolver: zodResolver(pricingTierSchema),
    defaultValues: {
      name: "",
      minAmount: 0,
      maxAmount: undefined,
      discountPercent: 0,
      description: "",
    },
  });

  const currencyForm = useForm<z.infer<typeof currencySettingsSchema>>({
    resolver: zodResolver(currencySettingsSchema),
    values: {
      baseCurrency: currencySettings?.baseCurrency || "INR",
      supportedCurrencies: currencySettings?.supportedCurrencies
        ? JSON.parse(currencySettings.supportedCurrencies)
        : ["INR", "USD", "EUR"],
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCompanySubmit = async (values: z.infer<typeof companyFormSchema>) => {
    // Save with both old keys (for backward compatibility) and new keys (for PDF generation)
    await updateSettingsMutation.mutateAsync({
      // Old keys
      companyName: values.companyName,
      address: values.address,
      taxId: values.taxId,
      phone: values.phone,
      email: values.email,
      // New keys for PDF generation
      company_name: values.companyName,
      company_address: values.address,
      company_gstin: values.taxId,
      company_phone: values.phone,
      company_email: values.email,
      company_website: values.website || "",
    });
  };

  const onQuoteSettingsSubmit = async (values: z.infer<typeof quoteSettingsSchema>) => {
    await updateSettingsMutation.mutateAsync({
      quotePrefix: values.quotePrefix,
      invoicePrefix: values.invoicePrefix,
      taxRate: values.taxRate.toString(),
    });
  };

  const createTaxRateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof taxRateSchema>) => {
      return await apiRequest("POST", "/api/tax-rates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-rates"] });
      taxRateForm.reset();
      toast({
        title: "Tax rate created",
        description: "The tax rate has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create tax rate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaxRateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tax-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-rates"] });
      toast({
        title: "Tax rate deleted",
        description: "The tax rate has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete tax rate",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleTaxRateStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/tax-rates/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tax-rates"] });
      toast({
        title: "Tax rate status updated",
        description: "The tax rate status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update tax rate status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onTaxRateSubmit = async (values: z.infer<typeof taxRateSchema>) => {
    await createTaxRateMutation.mutateAsync(values);
  };

  const createPricingTierMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pricingTierSchema>) => {
      return await apiRequest("POST", "/api/pricing-tiers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-tiers"] });
      pricingTierForm.reset();
      toast({
        title: "Pricing tier created",
        description: "The pricing tier has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create pricing tier",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePricingTierMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/pricing-tiers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-tiers"] });
      toast({
        title: "Pricing tier deleted",
        description: "The pricing tier has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete pricing tier",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onPricingTierSubmit = async (values: z.infer<typeof pricingTierSchema>) => {
    await createPricingTierMutation.mutateAsync(values);
  };

  const updateCurrencySettingsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof currencySettingsSchema>) => {
      return await apiRequest("POST", "/api/currency-settings", {
        baseCurrency: data.baseCurrency,
        supportedCurrencies: JSON.stringify(data.supportedCurrencies),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/currency-settings"] });
      toast({
        title: "Currency settings updated",
        description: "Your currency settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update currency settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCurrencySettingsSubmit = async (values: z.infer<typeof currencySettingsSchema>) => {
    await updateCurrencySettingsMutation.mutateAsync(values);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground font-['Open_Sans'] mt-1">
          Configure your application settings
        </p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company" data-testid="tab-company">
            <Building className="h-4 w-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <FileText className="h-4 w-4 mr-2" />
            Quotes
          </TabsTrigger>
          <TabsTrigger value="tax" data-testid="tab-tax">
            <Calculator className="h-4 w-4 mr-2" />
            Tax Rates
          </TabsTrigger>
          <TabsTrigger value="pricing" data-testid="tab-pricing">
            <DollarSign className="h-4 w-4 mr-2" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="currency" data-testid="tab-currency">
            <Settings className="h-4 w-4 mr-2" />
            Currency
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Profile</CardTitle>
              <CardDescription>
                Update your company information that appears on quotes and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-4">
                  <FormField
                    control={companyForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-company-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-company-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={companyForm.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID / GSTIN *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-tax-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-company-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={companyForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-company-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={companyForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="www.company.com" data-testid="input-company-website" />
                        </FormControl>
                        <FormDescription>
                          Your company website (will appear on PDF documents)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-company"
                  >
                    {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote & Invoice Configuration</CardTitle>
              <CardDescription>
                Customize quote and invoice numbering and default tax rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...quoteSettingsForm}>
                <form onSubmit={quoteSettingsForm.handleSubmit(onQuoteSettingsSubmit)} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={quoteSettingsForm.control}
                      name="quotePrefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quote Number Prefix *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-quote-prefix" />
                          </FormControl>
                          <FormDescription>
                            e.g., QT will generate QT-0001, QT-0002, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quoteSettingsForm.control}
                      name="invoicePrefix"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number Prefix *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-invoice-prefix" />
                          </FormControl>
                          <FormDescription>
                            e.g., INV will generate INV-0001, INV-0002, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={quoteSettingsForm.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Tax Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-tax-rate"
                          />
                        </FormControl>
                        <FormDescription>
                          Default GST rate (e.g., 18% = 9% CGST + 9% SGST)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-quote-settings"
                  >
                    {updateSettingsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax Rate Management</CardTitle>
              <CardDescription>
                Configure GST rates for different regions and tax types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Tax Rates</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Calculator className="h-4 w-4 mr-2" />
                      Add Tax Rate
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Tax Rate</DialogTitle>
                    </DialogHeader>
                    <Form {...taxRateForm}>
                      <form onSubmit={taxRateForm.handleSubmit(onTaxRateSubmit)} className="space-y-4">
                        <FormField
                          control={taxRateForm.control}
                          name="region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Region *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., IN-AP, IN-KA, IN-MH" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={taxRateForm.control}
                          name="taxType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Type *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select tax type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="GST">GST</SelectItem>
                                  <SelectItem value="VAT">VAT</SelectItem>
                                  <SelectItem value="SAT">SAT</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField
                            control={taxRateForm.control}
                            name="sgstRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>SGST Rate (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={taxRateForm.control}
                            name="cgstRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CGST Rate (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={taxRateForm.control}
                            name="igstRate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IGST Rate (%)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={createTaxRateMutation.isPending}
                          className="w-full"
                        >
                          {createTaxRateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Tax Rate
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Region</TableHead>
                      <TableHead>Tax Type</TableHead>
                      <TableHead>SGST</TableHead>
                      <TableHead>CGST</TableHead>
                      <TableHead>IGST</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRatesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          Loading tax rates...
                        </TableCell>
                      </TableRow>
                    ) : taxRates?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No tax rates configured yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      taxRates?.map((rate) => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium">{rate.region}</TableCell>
                          <TableCell>{rate.taxType}</TableCell>
                          <TableCell>{rate.sgstRate}%</TableCell>
                          <TableCell>{rate.cgstRate}%</TableCell>
                          <TableCell>{rate.igstRate}%</TableCell>
                          <TableCell>
                            <Badge variant={rate.isActive ? "default" : "secondary"}>
                              {rate.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleTaxRateStatusMutation.mutate({
                                  id: rate.id,
                                  isActive: !rate.isActive
                                })}
                                disabled={toggleTaxRateStatusMutation.isPending}
                              >
                                {rate.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteTaxRateMutation.mutate(rate.id)}
                                disabled={deleteTaxRateMutation.isPending}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Tiers</CardTitle>
              <CardDescription>
                Configure automatic discounts based on quote amounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Pricing Tiers</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <DollarSign className="h-4 w-4 mr-2" />
                      Add Pricing Tier
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Pricing Tier</DialogTitle>
                    </DialogHeader>
                    <Form {...pricingTierForm}>
                      <form onSubmit={pricingTierForm.handleSubmit(onPricingTierSubmit)} className="space-y-4">
                        <FormField
                          control={pricingTierForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tier Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Standard, Premium, Enterprise" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={pricingTierForm.control}
                            name="minAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Minimum Amount *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={pricingTierForm.control}
                            name="maxAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maximum Amount (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Leave empty for unlimited
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={pricingTierForm.control}
                          name="discountPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Percentage *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={pricingTierForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Optional description for this tier" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          disabled={createPricingTierMutation.isPending}
                          className="w-full"
                        >
                          {createPricingTierMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Create Pricing Tier
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier Name</TableHead>
                      <TableHead>Min Amount</TableHead>
                      <TableHead>Max Amount</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingTiersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          Loading pricing tiers...
                        </TableCell>
                      </TableRow>
                    ) : pricingTiers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No pricing tiers configured yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      pricingTiers?.map((tier) => (
                        <TableRow key={tier.id}>
                          <TableCell className="font-medium">{tier.name}</TableCell>
                          <TableCell>₹{Number(tier.minAmount).toLocaleString()}</TableCell>
                          <TableCell>
                            {tier.maxAmount ? `₹${Number(tier.maxAmount).toLocaleString()}` : "Unlimited"}
                          </TableCell>
                          <TableCell>{tier.discountPercent}%</TableCell>
                          <TableCell>{tier.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={tier.isActive ? "default" : "secondary"}>
                              {tier.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deletePricingTierMutation.mutate(tier.id)}
                              disabled={deletePricingTierMutation.isPending}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency Settings</CardTitle>
              <CardDescription>
                Configure base currency and supported currencies for international clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...currencyForm}>
                <form onSubmit={currencyForm.handleSubmit(onCurrencySettingsSubmit)} className="space-y-4">
                  <FormField
                    control={currencyForm.control}
                    name="baseCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Currency *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-base-currency">
                              <SelectValue placeholder="Select base currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                            <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                            <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          This is the primary currency for your quotes and invoices
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <FormLabel>Supported Currencies</FormLabel>
                    <FormDescription>
                      Select additional currencies to support for international clients
                    </FormDescription>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                      {["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED"].map((currency) => (
                        <FormField
                          key={currency}
                          control={currencyForm.control}
                          name="supportedCurrencies"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-300"
                                  checked={field.value?.includes(currency)}
                                  onChange={(e) => {
                                    const current = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...current, currency]);
                                    } else {
                                      field.onChange(current.filter((c) => c !== currency));
                                    }
                                  }}
                                  data-testid={`checkbox-currency-${currency}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {currency}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Current Settings</h4>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Base Currency:</span>{" "}
                        {currencyForm.watch("baseCurrency")}
                      </p>
                      <p>
                        <span className="font-medium">Supported:</span>{" "}
                        {currencyForm.watch("supportedCurrencies")?.join(", ") || "None"}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateCurrencySettingsMutation.isPending}
                    data-testid="button-save-currency"
                  >
                    {updateCurrencySettingsMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Currency Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
