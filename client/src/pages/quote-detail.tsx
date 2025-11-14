import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Send, Check, X, Receipt, Loader2, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuoteDetail {
  id: string;
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
  validityDays: number;
  quoteDate: string;
  referenceNumber: string;
  attentionTo: string;
  notes: string;
  termsAndConditions: string;
}

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState({ email: "", message: "" });
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: quote, isLoading } = useQuery<QuoteDetail>({
    queryKey: ["/api/quotes", params?.id],
    enabled: !!params?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("PATCH", `/api/quotes/${params?.id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Status updated",
        description: "Quote status has been updated successfully.",
      });
    },
  });

  const convertToInvoiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/quotes/${params?.id}/convert-to-invoice`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", params?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Invoice created",
        description: "Quote has been converted to invoice successfully.",
      });
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/quotes/${params?.id}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${quote?.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quote PDF downloaded successfully.",
      });
      setIsDownloading(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download quote PDF.",
        variant: "destructive",
      });
      setIsDownloading(false);
    },
  });

  const emailQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!emailData.email) throw new Error("Email is required");
      return await apiRequest("POST", `/api/quotes/${params?.id}/email`, {
        recipientEmail: emailData.email,
        message: emailData.message || "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quote sent via email successfully.",
      });
      setShowEmailDialog(false);
      setEmailData({ email: "", message: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send quote via email.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "invoiced":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
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

  if (!quote) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Quote not found</p>
          <Button className="mt-4" onClick={() => setLocation("/quotes")}>
            Back to Quotes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/quotes")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-foreground">{quote.quoteNumber}</h1>
              <Badge className={getStatusColor(quote.status)}>{quote.status}</Badge>
            </div>
            <p className="text-muted-foreground font-['Open_Sans']">
              Created on {new Date(quote.quoteDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {quote.status !== "invoiced" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/quotes/${params?.id}/edit`)}
              data-testid="button-edit-quote"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
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
            data-testid="button-email-quote"
          >
            <Send className="h-4 w-4 mr-2" />
            Email Quote
          </Button>
          {quote.status === "draft" && (
            <Button
              variant="outline"
              onClick={() => updateStatusMutation.mutate("sent")}
              data-testid="button-send-quote"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Quote
            </Button>
          )}
          {quote.status === "sent" && (
            <>
              <Button
                variant="outline"
                onClick={() => updateStatusMutation.mutate("approved")}
                data-testid="button-approve-quote"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="outline"
                onClick={() => updateStatusMutation.mutate("rejected")}
                data-testid="button-reject-quote"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {quote.status === "approved" && (
            <Button
              onClick={() => convertToInvoiceMutation.mutate()}
              data-testid="button-convert-to-invoice"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Convert to Invoice
            </Button>
          )}
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
                <p className="font-semibold">{quote.client.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{quote.client.email}</p>
              </div>
              {quote.client.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{quote.client.phone}</p>
                </div>
              )}
              {quote.client.billingAddress && (
                <div>
                  <p className="text-sm text-muted-foreground">Billing Address</p>
                  <p className="whitespace-pre-line">{quote.client.billingAddress}</p>
                </div>
              )}
              {quote.client.gstin && (
                <div>
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p className="font-mono text-sm">{quote.client.gstin}</p>
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
                {quote.items.map((item, index) => (
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

          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line font-['Open_Sans']">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {quote.termsAndConditions && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line font-['Open_Sans']">{quote.termsAndConditions}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.referenceNumber && (
                <div>
                  <p className="text-sm text-muted-foreground">Reference Number</p>
                  <p className="font-medium">{quote.referenceNumber}</p>
                </div>
              )}
              {quote.attentionTo && (
                <div>
                  <p className="text-sm text-muted-foreground">Attention To</p>
                  <p className="font-medium">{quote.attentionTo}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Valid For</p>
                <p className="font-medium">{quote.validityDays} days</p>
              </div>

              <div className="pt-4 border-t space-y-2 font-['Open_Sans']">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{Number(quote.subtotal).toLocaleString()}</span>
                </div>
                {Number(quote.discount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium">-₹{Number(quote.discount).toLocaleString()}</span>
                  </div>
                )}
                {Number(quote.cgst) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST:</span>
                    <span className="font-medium">₹{Number(quote.cgst).toLocaleString()}</span>
                  </div>
                )}
                {Number(quote.sgst) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST:</span>
                    <span className="font-medium">₹{Number(quote.sgst).toLocaleString()}</span>
                  </div>
                )}
                {Number(quote.igst) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGST:</span>
                    <span className="font-medium">₹{Number(quote.igst).toLocaleString()}</span>
                  </div>
                )}
                {Number(quote.shippingCharges) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-medium">₹{Number(quote.shippingCharges).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">₹{Number(quote.total).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Email Quote</DialogTitle>
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
                placeholder="Add a message to include with the quote..."
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
              onClick={() => emailQuoteMutation.mutate()}
              disabled={!emailData.email || emailQuoteMutation.isPending}
              data-testid="button-email-send"
            >
              {emailQuoteMutation.isPending ? (
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
    </div>
  );
}
