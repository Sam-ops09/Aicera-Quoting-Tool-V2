import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Send, Loader2, Edit, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/invoices")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
              <Badge className={getPaymentStatusColor(invoice.paymentStatus)}>{invoice.paymentStatus}</Badge>
            </div>
            <p className="text-muted-foreground font-['Open_Sans']">
              Quote: {invoice.quoteNumber} • Created on {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsDownloading(true);
              downloadPdfMutation.mutate();
            }}
            disabled={isDownloading}
            data-testid="button-download-pdf"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailDialog(true)}
            data-testid="button-email-invoice"
          >
            <Send className="h-4 w-4 mr-2" />
            Email Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-['Open_Sans']">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="font-semibold">{invoice.client.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{invoice.client.email}</p>
              </div>
              {invoice.client.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{invoice.client.phone}</p>
                </div>
              )}
              {invoice.client.billingAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">Billing Address</p>
                  <p className="whitespace-pre-line">{invoice.client.billingAddress}</p>
                </div>
              )}
              {invoice.client.gstin && (
                <div>
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p className="font-mono text-sm">{invoice.client.gstin}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoice.items.map((item, index) => (
                  <div key={item.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium">{index + 1}. {item.description}</p>
                      </div>
                      <p className="font-semibold text-primary">₹{Number(item.subtotal).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-6 text-sm text-muted-foreground font-['Open_Sans']">
                      <span>Qty: {item.quantity}</span>
                      <span>Unit Price: ₹{Number(item.unitPrice).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invoice Summary</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPaymentDialog}
                  data-testid="button-edit-payment"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Payment
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <div className="mt-1">
                  <Badge className={getPaymentStatusColor(invoice.paymentStatus)}>
                    {invoice.paymentStatus}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2 font-['Open_Sans']">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{Number(invoice.subtotal).toLocaleString()}</span>
                </div>
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium">-₹{Number(invoice.discount).toLocaleString()}</span>
                  </div>
                )}
                {Number(invoice.cgst) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST:</span>
                    <span className="font-medium">₹{Number(invoice.cgst).toLocaleString()}</span>
                  </div>
                )}
                {Number(invoice.sgst) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST:</span>
                    <span className="font-medium">₹{Number(invoice.sgst).toLocaleString()}</span>
                  </div>
                )}
                {Number(invoice.igst) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGST:</span>
                    <span className="font-medium">₹{Number(invoice.igst).toLocaleString()}</span>
                  </div>
                )}
                {Number(invoice.shippingCharges) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">₹{Number(invoice.shippingCharges).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">₹{Number(invoice.total).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span className="font-medium">₹{Number(invoice.paidAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-medium">₹{(Number(invoice.total) - Number(invoice.paidAmount)).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Recipient Email</label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={emailData.email}
                onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                data-testid="input-email-recipient"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message (Optional)</label>
              <Textarea
                placeholder="Add a message to include with the invoice..."
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                data-testid="textarea-email-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              data-testid="button-email-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={() => emailInvoiceMutation.mutate()}
              disabled={!emailData.email || emailInvoiceMutation.isPending}
              data-testid="button-email-send"
            >
              {emailInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Payment Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-status">Payment Status</Label>
              <Select
                value={paymentData.status}
                onValueChange={(value) => setPaymentData({ ...paymentData, status: value })}
              >
                <SelectTrigger id="payment-status" data-testid="select-payment-status">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid-amount">Paid Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">₹</span>
                <Input
                  id="paid-amount"
                  type="number"
                  placeholder="0.00"
                  value={paymentData.paidAmount}
                  onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
                  min="0"
                  max={invoice?.total}
                  step="0.01"
                  data-testid="input-paid-amount"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Total invoice amount: ₹{Number(invoice?.total || 0).toLocaleString()}
              </p>
              {paymentData.paidAmount && (
                <p className="text-sm text-muted-foreground">
                  Outstanding: ₹{(Number(invoice?.total || 0) - Number(paymentData.paidAmount)).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              data-testid="button-payment-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePayment}
              disabled={updatePaymentMutation.isPending}
              data-testid="button-payment-update"
            >
              {updatePaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
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