import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Eye, Download, Send, Loader2, Pencil, Grid3x3, List, Filter, TrendingUp, Clock, CheckCircle2, XCircle, Receipt } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quote } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "draft" | "sent" | "approved" | "rejected" | "invoiced";
type SortOption = "newest" | "oldest" | "amount-high" | "amount-low" | "client";

export default function Quotes() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [emailingQuoteId, setEmailingQuoteId] = useState<string | null>(null);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const { toast } = useToast();

  const { data: quotes, isLoading } = useQuery<Array<Quote & { clientName: string }>>({
    queryKey: ["/api/quotes"],
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to download PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Quote-${quoteId}.pdf`;
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
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download quote PDF.",
        variant: "destructive",
      });
    },
  });

  const emailQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, email, message }: { quoteId: string; email: string; message?: string }) => {
      return await apiRequest("POST", `/api/quotes/${quoteId}/email`, {
        recipientEmail: email,
        message: message || "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quote sent via email successfully.",
      });
      setEmailingQuoteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send quote via email.",
        variant: "destructive",
      });
    },
  });

  const stats = useMemo(() => {
    if (!quotes) return { total: 0, draft: 0, sent: 0, approved: 0, rejected: 0, invoiced: 0, totalValue: 0 };
    return {
      total: quotes.length,
      draft: quotes.filter(q => q.status === "draft").length,
      sent: quotes.filter(q => q.status === "sent").length,
      approved: quotes.filter(q => q.status === "approved").length,
      rejected: quotes.filter(q => q.status === "rejected").length,
      invoiced: quotes.filter(q => q.status === "invoiced").length,
      totalValue: quotes.reduce((sum, q) => sum + Number(q.total), 0),
    };
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    if (!quotes) return [];
    
    let filtered = quotes.filter(quote =>
      quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (statusFilter !== "all") {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.quoteDate).getTime() - new Date(a.quoteDate).getTime();
        case "oldest":
          return new Date(a.quoteDate).getTime() - new Date(b.quoteDate).getTime();
        case "amount-high":
          return Number(b.total) - Number(a.total);
        case "amount-low":
          return Number(a.total) - Number(b.total);
        case "client":
          return a.clientName.localeCompare(b.clientName);
        default:
          return 0;
      }
    });

    return filtered;
  }, [quotes, searchQuery, statusFilter, sortBy]);

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
          <p className="text-muted-foreground font-['Open_Sans'] mt-1">
            Create and manage your quotes
          </p>
        </div>
        <Button 
          onClick={() => setLocation("/quotes/create")} 
          data-testid="button-create-quote"
          className="w-fit"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Quote
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-['Open_Sans']">Total Quotes</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-['Open_Sans']">Draft</p>
                <p className="text-3xl font-bold mt-1">{stats.draft}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-['Open_Sans']">Sent</p>
                <p className="text-3xl font-bold mt-1">{stats.sent}</p>
              </div>
              <Send className="h-8 w-8 text-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-['Open_Sans']">Approved</p>
                <p className="text-3xl font-bold mt-1">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-['Open_Sans']">Total Value</p>
                <p className="text-2xl font-bold mt-1">₹{(stats.totalValue / 1000).toFixed(0)}K</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes by number or client..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-quotes"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount-high">Highest Amount</SelectItem>
                  <SelectItem value="amount-low">Lowest Amount</SelectItem>
                  <SelectItem value="client">Client Name</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)} className="mt-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({stats.draft})</TabsTrigger>
              <TabsTrigger value="sent">Sent ({stats.sent})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({stats.rejected})</TabsTrigger>
              <TabsTrigger value="invoiced">Invoiced ({stats.invoiced})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {filteredQuotes && filteredQuotes.length > 0 ? (
        viewMode === "list" ? (
          <div className="space-y-4">
            {filteredQuotes.map((quote) => (
              <Card key={quote.id} className="hover-elevate group relative overflow-hidden" data-testid={`quote-card-${quote.id}`}>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{quote.quoteNumber}</h3>
                        <Badge className={getStatusColor(quote.status)}>
                          {quote.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-['Open_Sans']">
                        <div>
                          <span className="text-muted-foreground">Client:</span>
                          <p className="font-medium">{quote.clientName}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <p className="font-medium">{new Date(quote.quoteDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <p className="font-semibold text-primary text-lg">₹{Number(quote.total).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valid for:</span>
                          <p className="font-medium">{quote.validityDays} days</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/quotes/${quote.id}`)}
                        data-testid={`button-view-quote-${quote.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {quote.status !== "invoiced" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/quotes/${quote.id}/edit`)}
                          data-testid={`button-edit-quote-${quote.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDownloadingQuoteId(quote.id);
                          downloadPdfMutation.mutate(quote.id);
                          setTimeout(() => setDownloadingQuoteId(null), 2000);
                        }}
                        disabled={downloadingQuoteId === quote.id}
                        data-testid={`button-download-quote-${quote.id}`}
                      >
                        {downloadingQuoteId === quote.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEmailingQuoteId(quote.id)}
                        data-testid={`button-email-quote-${quote.id}`}
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredQuotes.map((quote) => (
              <Card key={quote.id} className="hover-elevate group relative overflow-hidden" data-testid={`quote-card-${quote.id}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{quote.quoteNumber}</CardTitle>
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="space-y-2 text-sm font-['Open_Sans']">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-medium">{quote.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{new Date(quote.quoteDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid for:</span>
                      <span className="font-medium">{quote.validityDays} days</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-muted-foreground font-semibold">Total:</span>
                      <span className="font-bold text-primary text-xl">₹{Number(quote.total).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/quotes/${quote.id}`)}
                      data-testid={`button-view-quote-${quote.id}`}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {quote.status !== "invoiced" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/quotes/${quote.id}/edit`)}
                        data-testid={`button-edit-quote-${quote.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDownloadingQuoteId(quote.id);
                        downloadPdfMutation.mutate(quote.id);
                        setTimeout(() => setDownloadingQuoteId(null), 2000);
                      }}
                      disabled={downloadingQuoteId === quote.id}
                      data-testid={`button-download-quote-${quote.id}`}
                    >
                      {downloadingQuoteId === quote.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEmailingQuoteId(quote.id)}
                      data-testid={`button-email-quote-${quote.id}`}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-6 mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No quotes found</h3>
            <p className="text-sm text-muted-foreground font-['Open_Sans'] mb-6 text-center max-w-sm">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your filters or search query" 
                : "Create your first quote to get started with professional proposals"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setLocation("/quotes/create")} data-testid="button-create-first-quote" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Quote
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
