import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";
import { BOMSection, type BOMItem } from "@/components/quote/bom-section";
import { SLASection, type SLAData } from "@/components/quote/sla-section";
import { TimelineSection, type TimelineData } from "@/components/quote/timeline-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TaxRate = {
  id: string;
  region: string;
  taxType: string;
  sgstRate: string;
  cgstRate: string;
  igstRate: string;
  isActive: boolean;
  effectiveFrom: string;
};

interface QuoteCreatePayload {
  clientId: string;
  validityDays: number;
  referenceNumber?: string;
  attentionTo?: string;
  discount: string; // monetary discount amount
  cgst: string;
  sgst: string;
  igst: string;
  shippingCharges: string;
  subtotal: string;
  total: string;
  notes?: string;
  termsAndConditions?: string;
  status: "draft" | "sent" | "approved" | "rejected" | "invoiced";
  quoteDate: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  bomSection?: string; // JSON string
  slaSection?: string; // JSON string
  timelineSection?: string; // JSON string
}

interface QuoteDetail {
  id: string;
  quoteNumber: string;
  status: string;
  clientId: string;
  validityDays: number;
  referenceNumber?: string;
  attentionTo?: string;
  notes?: string;
  termsAndConditions?: string;
  quoteDate?: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }>;
  subtotal: string;
  discount: string;
  cgst: string;
  sgst: string;
  igst: string;
  shippingCharges: string;
  total: string;
  bomSection?: string; // JSON string
  slaSection?: string; // JSON string
  timelineSection?: string; // JSON string
}

const quoteFormSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  validityDays: z.coerce.number().min(1, "Validity period is required"),
  referenceNumber: z.string().optional(),
  attentionTo: z.string().optional(),
  discount: z.coerce.number().min(0, "Discount must be positive"),
  cgst: z.coerce.number().min(0, "CGST must be positive"),
  sgst: z.coerce.number().min(0, "SGST must be positive"),
  igst: z.coerce.number().min(0, "IGST must be positive"),
  shippingCharges: z.coerce.number().min(0, "Shipping charges must be positive"),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0, "Unit price must be positive"),
  })).min(1, "At least one item is required"),
});

export default function QuoteCreate() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/quotes/:id/edit");
  const { toast } = useToast();
  const isEditMode = !!params?.id;

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: taxRates } = useQuery<TaxRate[]>({
    queryKey: ["/api/tax-rates"],
  });

  // Filter to only active tax rates
  const activeTaxRates = taxRates?.filter(rate => rate.isActive) || [];

  const { data: existingQuote, isLoading: isLoadingQuote } = useQuery<QuoteDetail>({
    queryKey: ["/api/quotes", params?.id],
    enabled: isEditMode,
  });

  const form = useForm<z.infer<typeof quoteFormSchema>>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      clientId: "",
      validityDays: 30,
      referenceNumber: "",
      attentionTo: "",
      discount: 0,
      cgst: 9,
      sgst: 9,
      igst: 0,
      shippingCharges: 0,
      notes: "",
      termsAndConditions: "Payment Terms: Net 30 days\nDelivery: 7-10 business days\nWarranty: 1 year manufacturer warranty",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  // Advanced Sections State
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [slaData, setSlaData] = useState<SLAData>({
    overview: "",
    responseTime: "",
    resolutionTime: "",
    availability: "",
    supportHours: "",
    escalationProcess: "",
    metrics: [],
  });
  const [timelineData, setTimelineData] = useState<TimelineData>({
    projectOverview: "",
    startDate: "",
    endDate: "",
    milestones: [],
  });

  // Pre-select client from URL query parameter (for new quotes from client detail page)
  useEffect(() => {
    if (!isEditMode) {
      const params = new URLSearchParams(window.location.search);
      const clientIdParam = params.get('clientId');
      if (clientIdParam) {
        form.setValue('clientId', clientIdParam);
      }
    }
  }, [isEditMode, form]);

  // Load existing quote data when in edit mode
  useEffect(() => {
    if (existingQuote && isEditMode) {
      const subtotal = Number(existingQuote.subtotal);
      const discountAmount = Number(existingQuote.discount);
      const cgstAmount = Number(existingQuote.cgst);
      const sgstAmount = Number(existingQuote.sgst);
      const igstAmount = Number(existingQuote.igst);

      // Calculate tax base (subtotal - discount)
      const taxBase = subtotal - discountAmount;

      // Calculate percentages from amounts
      const discountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
      const cgstPercent = taxBase > 0 ? (cgstAmount / taxBase) * 100 : 0;
      const sgstPercent = taxBase > 0 ? (sgstAmount / taxBase) * 100 : 0;
      const igstPercent = taxBase > 0 ? (igstAmount / taxBase) * 100 : 0;

      form.reset({
        clientId: existingQuote.clientId,
        validityDays: existingQuote.validityDays,
        referenceNumber: existingQuote.referenceNumber || "",
        attentionTo: existingQuote.attentionTo || "",
        discount: Number(discountPercent.toFixed(2)),
        cgst: Number(cgstPercent.toFixed(2)),
        sgst: Number(sgstPercent.toFixed(2)),
        igst: Number(igstPercent.toFixed(2)),
        shippingCharges: Number(existingQuote.shippingCharges),
        notes: existingQuote.notes || "",
        termsAndConditions: existingQuote.termsAndConditions || "",
        items: existingQuote.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      });

      // Load advanced sections
      if (existingQuote.bomSection) {
        try {
          const parsedBOM = JSON.parse(existingQuote.bomSection);
          setBomItems(parsedBOM);
        } catch (e) {
          console.error("Failed to parse BOM section:", e);
        }
      }

      if (existingQuote.slaSection) {
        try {
          const parsedSLA = JSON.parse(existingQuote.slaSection);
          setSlaData(parsedSLA);
        } catch (e) {
          console.error("Failed to parse SLA section:", e);
        }
      }

      if (existingQuote.timelineSection) {
        try {
          const parsedTimeline = JSON.parse(existingQuote.timelineSection);
          setTimelineData(parsedTimeline);
        } catch (e) {
          console.error("Failed to parse Timeline section:", e);
        }
      }
    }
  }, [existingQuote, isEditMode, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const createMutation = useMutation({
    mutationFn: async (data: QuoteCreatePayload) => {
      return await apiRequest("POST", "/api/quotes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Quote created",
        description: "Your quote has been created successfully.",
      });
      setLocation("/quotes");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: QuoteCreatePayload) => {
      return await apiRequest("PUT", `/api/quotes/${params?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", params?.id] });
      toast({
        title: "Quote updated",
        description: "Your quote has been updated successfully.",
      });
      setLocation(`/quotes/${params?.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const items = form.watch("items");
  const discount = form.watch("discount");
  const cgst = form.watch("cgst");
  const sgst = form.watch("sgst");
  const igst = form.watch("igst");
  const shippingCharges = form.watch("shippingCharges");

  // Function to apply a selected tax rate
  const applyTaxRate = (taxRateId: string) => {
    const selectedRate = activeTaxRates.find(rate => rate.id === taxRateId);
    if (selectedRate) {
      form.setValue("cgst", parseFloat(selectedRate.cgstRate));
      form.setValue("sgst", parseFloat(selectedRate.sgstRate));
      form.setValue("igst", parseFloat(selectedRate.igstRate));
      toast({
        title: "Tax rate applied",
        description: `Applied ${selectedRate.taxType} rates for ${selectedRate.region}`,
      });
    }
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableAmount = subtotal - discountAmount;
  const cgstAmount = (taxableAmount * cgst) / 100;
  const sgstAmount = (taxableAmount * sgst) / 100;
  const igstAmount = (taxableAmount * igst) / 100;
  const total = taxableAmount + cgstAmount + sgstAmount + igstAmount + shippingCharges;

  const onSubmit = async (values: z.infer<typeof quoteFormSchema>) => {
    const quoteData: QuoteCreatePayload = {
      clientId: values.clientId,
      validityDays: values.validityDays,
      referenceNumber: values.referenceNumber || undefined,
      attentionTo: values.attentionTo || undefined,
      discount: discountAmount.toString(),
      cgst: cgstAmount.toString(),
      sgst: sgstAmount.toString(),
      igst: igstAmount.toString(),
      shippingCharges: shippingCharges.toString(),
      subtotal: subtotal.toString(),
      total: total.toString(),
      notes: values.notes || undefined,
      termsAndConditions: values.termsAndConditions || undefined,
      status: isEditMode ? (existingQuote?.status as any) : "draft",
      quoteDate: isEditMode ? (existingQuote?.quoteDate || new Date().toISOString()) : new Date().toISOString(),
      items: values.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice })),
      // Include advanced sections
      bomSection: bomItems.length > 0 ? JSON.stringify(bomItems) : undefined,
      slaSection: (slaData.overview || slaData.metrics.length > 0) ? JSON.stringify(slaData) : undefined,
      timelineSection: (timelineData.projectOverview || timelineData.milestones.length > 0) ? JSON.stringify(timelineData) : undefined,
    };

    if (isEditMode) {
      await updateMutation.mutateAsync(quoteData);
    } else {
      await createMutation.mutateAsync(quoteData);
    }
  };

  if (isEditMode && isLoadingQuote) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isEditMode && existingQuote?.status === "invoiced") {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">This quote has been invoiced and cannot be edited.</p>
          <Button className="mt-4" onClick={() => setLocation(`/quotes/${params?.id}`)}>
            Back to Quote
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(isEditMode ? `/quotes/${params?.id}` : "/quotes")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditMode ? `Edit Quote ${existingQuote?.quoteNumber}` : "Create New Quote"}
          </h1>
          <p className="text-muted-foreground font-['Open_Sans'] mt-1">
            {isEditMode ? "Update the quote details" : "Fill in the details to generate a professional quote"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="validityDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Validity (days) *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-validity-days"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="referenceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference/PO Number</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-reference-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="attentionTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attention To</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-attention-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Line Items</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
                      data-testid="button-add-item"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-4 items-start border-b pb-4 last:border-0">
                      <div className="flex-1 space-y-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description *</FormLabel>
                              <FormControl>
                                <Textarea {...field} data-testid={`input-item-description-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-4 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    data-testid={`input-item-quantity-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit Price *</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    data-testid={`input-item-unit-price-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="space-y-2">
                            <FormLabel>Subtotal</FormLabel>
                            <div className="h-10 flex items-center font-semibold text-primary">
                              ₹{(items[index].quantity * items[index].unitPrice).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="termsAndConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} rows={5} data-testid="input-terms" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Advanced Sections */}
              <Card>
                <CardHeader>
                  <CardTitle>Advanced Sections (Optional)</CardTitle>
                  <p className="text-sm text-muted-foreground">Add detailed technical and project information to your quote</p>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="bom" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
                      <TabsTrigger value="sla">SLA</TabsTrigger>
                      <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bom" className="mt-4">
                      <BOMSection items={bomItems} onChange={setBomItems} />
                    </TabsContent>
                    <TabsContent value="sla" className="mt-4">
                      <SLASection data={slaData} onChange={setSlaData} />
                    </TabsContent>
                    <TabsContent value="timeline" className="mt-4">
                      <TimelineSection data={timelineData} onChange={setTimelineData} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Pricing & Taxes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tax Rate Selector */}
                  {activeTaxRates.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quick Apply Tax Rate</label>
                      <Select onValueChange={applyTaxRate}>
                        <SelectTrigger data-testid="select-tax-rate">
                          <SelectValue placeholder="Select a tax rate..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeTaxRates.map((rate) => (
                            <SelectItem key={rate.id} value={rate.id}>
                              {rate.region} - {rate.taxType} (CGST: {rate.cgstRate}%, SGST: {rate.sgstRate}%, IGST: {rate.igstRate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select a pre-configured tax rate or enter manually below
                      </p>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-discount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or enter manually
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <FormField
                      control={form.control}
                      name="cgst"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CGST (%)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-cgst"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sgst"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SGST (%)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              data-testid="input-sgst"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="igst"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IGST (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-igst"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shippingCharges"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping Charges</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-shipping"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t space-y-2 font-['Open_Sans']">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span className="font-medium">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxable Amount:</span>
                      <span className="font-medium">₹{taxableAmount.toFixed(2)}</span>
                    </div>
                    {cgstAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CGST ({cgst}%):</span>
                        <span className="font-medium">₹{cgstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {sgstAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SGST ({sgst}%):</span>
                        <span className="font-medium">₹{sgstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {igstAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IGST ({igst}%):</span>
                        <span className="font-medium">₹{igstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {shippingCharges > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping:</span>
                        <span className="font-medium">₹{shippingCharges.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span className="text-primary" data-testid="text-total">₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-create-quote"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditMode ? "Update Quote" : "Create Quote"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
