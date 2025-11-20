import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Send, Loader2, Building2, Mail, Phone, MapPin, FileText, Calendar, Receipt, DollarSign, AlertCircle, CheckCircle2, Clock, TrendingUp, Package, CreditCard, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PaymentTracker } from "@/components/invoice/payment-tracker";
import { Separator } from "@/components/ui/separator";

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  quoteNumber: string;
  status: string;
  client: {
    name: string;
    email: string;
    phone: string;
    billingAddress: string;
    gstin: string;
  };
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
  dueDate: string;
  paymentStatus: string;
  paidAmount: string;
  createdAt: string;
}

export default function InvoiceDetail() {
  const [, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState({ email: "", message: "" });
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({ status: "", paidAmount: "" });

  const { data: invoice, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ["/api/invoices", params?.id],
    enabled: !!params?.id,
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async (data: { paymentStatus?: string; paidAmount?: string }) => {
      return await apiRequest("PUT", `/api/invoices/${params?.id}/payment-status`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Payment details updated successfully.",
      });
      setShowPaymentDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment details.",
        variant: "destructive",
      });
    },
  });

  const handleOpenPaymentDialog = () => {
    if (invoice) {
      setPaymentData({
        status: invoice.paymentStatus,
        paidAmount: invoice.paidAmount,
      });
      setShowPaymentDialog(true);
    }
  };

  const handleUpdatePayment = () => {
    const updates: { paymentStatus?: string; paidAmount?: string } = {};

    if (paymentData.status !== invoice?.paymentStatus) {
      updates.paymentStatus = paymentData.status;
    }

    if (paymentData.paidAmount !== invoice?.paidAmount) {
      updates.paidAmount = paymentData.paidAmount;
    }

    if (Object.keys(updates).length > 0) {
      updatePaymentMutation.mutate(updates);
    } else {
      setShowPaymentDialog(false);
    }
  };

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/invoices/${params?.id}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice PDF downloaded successfully.",
      });
      setIsDownloading(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download invoice PDF.",
        variant: "destructive",
      });
      setIsDownloading(false);
    },
  });

  const emailInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!emailData.email) throw new Error("Email is required");
      return await apiRequest("POST", `/api/invoices/${params?.id}/email`, {
        recipientEmail: emailData.email,
        message: emailData.message || "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice sent via email successfully.",
      });
      setShowEmailDialog(false);
      setEmailData({ email: "", message: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invoice via email.",
        variant: "destructive",
      });
    },
  });

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "partial":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Invoice not found</p>
          <Button className="mt-4" onClick={() => setLocation("/invoices")}>
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  const outstanding = Number(invoice.total) - Number(invoice.paidAmount);
  const percentPaid = (Number(invoice.paidAmount) / Number(invoice.total)) * 100;

  const getStatusIcon = () => {
    if (invoice.paymentStatus === 'paid') return <CheckCircle2 className="h-5 w-5" />;
    if (invoice.paymentStatus === 'overdue') return <AlertCircle className="h-5 w-5" />;
    if (invoice.paymentStatus === 'partial') return <TrendingUp className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-950 dark:via-blue-950/10 dark:to-gray-950">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/invoices")} 
              data-testid="button-back"
              className="shrink-0 hover:bg-[#0046FF]/10 hover:text-[#0046FF]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#001BB7] dark:text-blue-300 truncate">
                  {invoice.invoiceNumber}
                </h1>
                <Badge className={`${getPaymentStatusColor(invoice.paymentStatus)} flex items-center gap-1.5 px-2.5 py-1`}>
                  {getStatusIcon()}
                  <span className="capitalize">{invoice.paymentStatus}</span>
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-['Open_Sans'] flex-wrap">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Quote: <span className="font-medium">{invoice.quoteNumber}</span></span>
                </div>
                <span className="hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none hover:bg-green-50 hover:border-green-600 hover:text-green-600 transition-all"
              onClick={() => {
                setIsDownloading(true);
                downloadPdfMutation.mutate();
              }}
              disabled={isDownloading}
              data-testid="button-download-pdf"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none hover:bg-purple-50 hover:border-purple-600 hover:text-purple-600 transition-all"
              onClick={() => setShowEmailDialog(true)}
              data-testid="button-email-invoice"
            >
              <Send className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Email Invoice</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-2 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#0046FF]/5 via-blue-50/50 to-[#0046FF]/5 dark:from-[#0046FF]/10 dark:via-blue-950/50 dark:to-[#0046FF]/10 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#0046FF] rounded-lg">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Client Information</CardTitle>
                    <p className="text-xs text-muted-foreground font-['Open_Sans'] mt-0.5">
                      Customer details and contact information
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg shrink-0">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground font-['Open_Sans'] mb-1">Company Name</p>
                        <p className="font-semibold text-foreground break-words">{invoice.client.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20 p-4 rounded-lg border border-purple-100 dark:border-purple-900/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg shrink-0">
                        <Mail className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground font-['Open_Sans'] mb-1">Email</p>
                        <p className="text-sm break-all">{invoice.client.email}</p>
                      </div>
                    </div>
                  </div>
                  {invoice.client.phone && (
                    <div className="bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg shrink-0">
                          <Phone className="h-4 w-4 text-green-600 dark:text-green-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-['Open_Sans'] mb-1">Phone</p>
                          <p className="text-sm">{invoice.client.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {invoice.client.billingAddress && (
                    <div className={`bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20 p-4 rounded-lg border border-orange-100 dark:border-orange-900/30 ${!invoice.client.phone ? 'sm:col-span-2' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg shrink-0">
                          <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-['Open_Sans'] mb-1">Billing Address</p>
                          <p className="text-sm whitespace-pre-line break-words">{invoice.client.billingAddress}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {invoice.client.gstin && (
                    <div className={`bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/30 ${invoice.client.phone && invoice.client.billingAddress ? '' : 'sm:col-span-2'}`}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg shrink-0">
                          <Receipt className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-['Open_Sans'] mb-1">GSTIN</p>
                          <p className="font-mono text-sm font-medium break-all">{invoice.client.gstin}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-xl transition-all duration-300 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-[#0046FF]/5 via-blue-50/50 to-[#0046FF]/5 dark:from-[#0046FF]/10 dark:via-blue-950/50 dark:to-[#0046FF]/10 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#0046FF] rounded-lg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Line Items</CardTitle>
                    <p className="text-xs text-muted-foreground font-['Open_Sans'] mt-0.5">
                      Products and services breakdown
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b">
                      <tr>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3">#</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3">Description</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3">Qty</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3">Unit Price</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 sm:px-6 py-3">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {invoice.items.map((item, index) => (
                        <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">
                          <td className="px-4 sm:px-6 py-4 text-sm font-medium text-muted-foreground">{index + 1}</td>
                          <td className="px-4 sm:px-6 py-4">
                            <p className="font-medium text-foreground text-sm break-words">{item.description}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-right font-['Open_Sans']">{item.quantity}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-right font-['Open_Sans']">₹{Number(item.unitPrice).toLocaleString()}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-right font-semibold text-[#0046FF] dark:text-blue-400">
                            ₹{Number(item.subtotal).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-2 hover:shadow-xl transition-all duration-300 overflow-hidden sticky top-6">
              <CardHeader className="bg-gradient-to-r from-[#0046FF]/5 via-blue-50/50 to-[#0046FF]/5 dark:from-[#0046FF]/10 dark:via-blue-950/50 dark:to-[#0046FF]/10 border-b">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2.5 bg-[#0046FF] rounded-lg shrink-0">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">Invoice Summary</CardTitle>
                      <p className="text-xs text-muted-foreground font-['Open_Sans'] mt-0.5 truncate">
                        Financial breakdown
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-['Open_Sans'] font-medium">Due Date</span>
                  </div>
                  <p className="font-bold text-lg text-[#001BB7] dark:text-blue-200">
                    {new Date(invoice.dueDate).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3 font-['Open_Sans']">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{Number(invoice.subtotal).toLocaleString()}</span>
                  </div>
                  {Number(invoice.discount) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">-₹{Number(invoice.discount).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(invoice.cgst) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">CGST</span>
                      <span className="font-semibold">₹{Number(invoice.cgst).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(invoice.sgst) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">SGST</span>
                      <span className="font-semibold">₹{Number(invoice.sgst).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(invoice.igst) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">IGST</span>
                      <span className="font-semibold">₹{Number(invoice.igst).toLocaleString()}</span>
                    </div>
                  )}
                  {Number(invoice.shippingCharges) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-semibold">₹{Number(invoice.shippingCharges).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <Separator className="bg-[#0046FF]/20" />

                <div className="bg-gradient-to-br from-[#0046FF]/10 to-blue-100/50 dark:from-[#0046FF]/20 dark:to-blue-900/30 p-4 rounded-lg border-2 border-[#0046FF]/30">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold text-muted-foreground">Total Amount</span>
                    <span className="text-2xl font-bold text-[#0046FF] dark:text-blue-300">₹{Number(invoice.total).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm font-['Open_Sans']">
                    <div className="bg-white/60 dark:bg-gray-900/60 p-2.5 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Paid</p>
                      <p className="font-bold text-green-600 dark:text-green-400">₹{Number(invoice.paidAmount).toLocaleString()}</p>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-900/60 p-2.5 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                      <p className="font-bold text-[#FF8040] dark:text-orange-400">₹{outstanding.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {percentPaid > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Progress
                      </span>
                      <span className="font-bold text-[#0046FF]">{percentPaid.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className={`h-full transition-all duration-500 ease-out rounded-full ${
                          percentPaid >= 100 
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : 'bg-gradient-to-r from-[#0046FF] to-[#001BB7]'
                        }`}
                        style={{ width: `${Math.min(percentPaid, 100)}%` }}
                      >
                        <div className="h-full w-full bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <PaymentTracker
          invoiceId={invoice.id}
          total={Number(invoice.total)}
          paidAmount={Number(invoice.paidAmount)}
          paymentStatus={invoice.paymentStatus}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices", params?.id] });
          }}
        />
      </div>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Send className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl">Email Invoice</DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground font-['Open_Sans'] mt-1">
                  Send invoice to your client via email
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="recipient-email" className="text-sm font-semibold flex items-center gap-1">
                Recipient Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="recipient-email"
                  type="email"
                  placeholder="client@example.com"
                  className="pl-10"
                  value={emailData.email}
                  onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                  data-testid="input-email-recipient"
                />
              </div>
              <p className="text-xs text-muted-foreground font-['Open_Sans']">
                Invoice will be sent as a PDF attachment
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message" className="text-sm font-semibold">
                Message (Optional)
              </Label>
              <Textarea
                id="email-message"
                placeholder="Add a personalized message to include with the invoice..."
                className="min-h-[100px] resize-none"
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                data-testid="textarea-email-message"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              data-testid="button-email-cancel"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={() => emailInvoiceMutation.mutate()}
              disabled={!emailData.email || emailInvoiceMutation.isPending}
              data-testid="button-email-send"
              className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white"
            >
              {emailInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#0046FF] rounded-lg">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl">Update Payment Details</DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground font-['Open_Sans'] mt-1">
                  Modify invoice payment status and amount
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="payment-status" className="text-sm font-semibold">Payment Status</Label>
              <Select
                value={paymentData.status}
                onValueChange={(value) => setPaymentData({ ...paymentData, status: value })}
              >
                <SelectTrigger id="payment-status" data-testid="select-payment-status" className="h-11">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>Pending</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="partial">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-yellow-600" />
                      <span>Partial</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="paid">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Paid</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>Overdue</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid-amount" className="text-sm font-semibold">Paid Amount</Label>
              <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-3 sm:p-4 rounded-lg border-2 border-[#0046FF]/30">
                <span className="text-2xl sm:text-3xl font-bold text-[#0046FF]">₹</span>
                <Input
                  id="paid-amount"
                  type="number"
                  placeholder="0.00"
                  className="text-xl sm:text-2xl font-bold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={paymentData.paidAmount}
                  onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
                  min="0"
                  max={invoice?.total}
                  step="0.01"
                  data-testid="input-paid-amount"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-['Open_Sans'] px-1">
                <span className="text-muted-foreground">Total invoice amount:</span>
                <span className="font-bold text-[#0046FF]">₹{Number(invoice?.total || 0).toLocaleString()}</span>
              </div>
              {paymentData.paidAmount && (
                <div className="flex items-center justify-between text-xs font-['Open_Sans'] px-1">
                  <span className="text-muted-foreground">Outstanding balance:</span>
                  <span className="font-bold text-[#FF8040]">
                    ₹{(Number(invoice?.total || 0) - Number(paymentData.paidAmount)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              data-testid="button-payment-cancel"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePayment}
              disabled={updatePaymentMutation.isPending}
              data-testid="button-payment-update"
              className="flex-1 sm:flex-none bg-[#0046FF] hover:bg-[#001BB7]"
            >
              {updatePaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Update Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}