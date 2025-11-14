import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Receipt, Eye, Download, Send, Loader2, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  quoteNumber: string;
  clientName: string;
  paymentStatus: string;
  dueDate: string;
  paidAmount: string;
  total: string;
  createdAt: string;
}

export default function Invoices() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceId}.pdf`;
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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download invoice PDF.",
        variant: "destructive",
      });
    },
  });

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const stats = {
    total: invoices?.length || 0,
    pending: invoices?.filter(i => i.paymentStatus === "pending").length || 0,
    partial: invoices?.filter(i => i.paymentStatus === "partial").length || 0,
    paid: invoices?.filter(i => i.paymentStatus === "paid").length || 0,
    overdue: invoices?.filter(i => i.paymentStatus === "overdue").length || 0,
    totalRevenue: invoices?.reduce((sum, i) => sum + Number(i.total), 0) || 0,
    totalPaid: invoices?.reduce((sum, i) => sum + Number(i.paidAmount), 0) || 0,
  };

  const getStatusColor = (status: string) => {
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
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
        <p className="text-muted-foreground font-['Open_Sans'] mt-1">
          Track and manage your invoices
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold text-primary">₹{stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Collected</div>
            <div className="text-2xl font-bold text-green-600">₹{stats.totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Outstanding</div>
            <div className="text-2xl font-bold text-orange-600">₹{(stats.totalRevenue - stats.totalPaid).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Invoices</div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.paid} paid • {stats.partial} partial • {stats.pending} pending
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-invoices"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredInvoices && filteredInvoices.length > 0 ? (
        <div className="space-y-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover-elevate" data-testid={`invoice-card-${invoice.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{invoice.invoiceNumber}</h3>
                      <Badge className={getStatusColor(invoice.paymentStatus)}>
                        {invoice.paymentStatus}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-['Open_Sans']">
                      <div>
                        <span className="text-muted-foreground">Client:</span>
                        <p className="font-medium">{invoice.clientName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Due Date:</span>
                        <p className="font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <p className="font-semibold text-primary">₹{Number(invoice.total).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paid:</span>
                        <p className="font-medium">₹{Number(invoice.paidAmount).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/invoices/${invoice.id}`)}
                      data-testid={`button-view-invoice-${invoice.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDownloadingInvoiceId(invoice.id);
                        downloadPdfMutation.mutate(invoice.id);
                        setTimeout(() => setDownloadingInvoiceId(null), 2000);
                      }}
                      disabled={downloadingInvoiceId === invoice.id}
                      data-testid={`button-download-invoice-${invoice.id}`}
                    >
                      {downloadingInvoiceId === invoice.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/invoices/${invoice.id}`)}
                      data-testid={`button-email-invoice-${invoice.id}`}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
            <p className="text-sm text-muted-foreground font-['Open_Sans']">
              {searchQuery ? "Try adjusting your search query" : "Convert approved quotes to invoices"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
