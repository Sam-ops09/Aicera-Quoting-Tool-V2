import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Eye, Download, Send, Loader2, Pencil } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import type { Quote } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Quotes() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [emailingQuoteId, setEmailingQuoteId] = useState<string | null>(null);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);
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

  const filteredQuotes = quotes?.filter(quote =>
    quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    quote.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
          <p className="text-muted-foreground font-['Open_Sans'] mt-1">
            Create and manage your quotes
          </p>
        </div>
        <Button onClick={() => setLocation("/quotes/create")} data-testid="button-create-quote">
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search quotes..."
          className="pl-10 max-w-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-quotes"
        />
      </div>

      {filteredQuotes && filteredQuotes.length > 0 ? (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover-elevate" data-testid={`quote-card-${quote.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{quote.quoteNumber}</h3>
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
                        <p className="font-semibold text-primary">₹{Number(quote.total).toLocaleString()}</p>
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
            <p className="text-sm text-muted-foreground font-['Open_Sans'] mb-4">
              {searchQuery ? "Try adjusting your search query" : "Create your first quote to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setLocation("/quotes/create")} data-testid="button-create-first-quote">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Quote
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
