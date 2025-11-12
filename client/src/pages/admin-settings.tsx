import { useState } from "react";
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
import { Loader2, Building, Mail, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const companyFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  address: z.string().min(1, "Address is required"),
  taxId: z.string().min(1, "Tax ID is required"),
  phone: z.string(),
  email: z.string().email("Invalid email address"),
});

const quoteSettingsSchema = z.object({
  quotePrefix: z.string().min(1, "Quote prefix is required"),
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  taxRate: z.coerce.number().min(0).max(100),
});

export default function AdminSettings() {
  const { toast } = useToast();

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
  });

  const companyForm = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    values: {
      companyName: settings?.companyName || "",
      address: settings?.address || "",
      taxId: settings?.taxId || "",
      phone: settings?.phone || "",
      email: settings?.email || "",
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
    await updateSettingsMutation.mutateAsync({
      companyName: values.companyName,
      address: values.address,
      taxId: values.taxId,
      phone: values.phone,
      email: values.email,
    });
  };

  const onQuoteSettingsSubmit = async (values: z.infer<typeof quoteSettingsSchema>) => {
    await updateSettingsMutation.mutateAsync({
      quotePrefix: values.quotePrefix,
      invoicePrefix: values.invoicePrefix,
      taxRate: values.taxRate.toString(),
    });
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="company" data-testid="tab-company">
            <Building className="h-4 w-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="quotes" data-testid="tab-quotes">
            <FileText className="h-4 w-4 mr-2" />
            Quotes
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
      </Tabs>
    </div>
  );
}
