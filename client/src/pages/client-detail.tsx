import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, FileText,
  DollarSign, Plus, Trash2, Tag, MessageSquare,
  Calendar, User, X
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, ClientTag, ClientCommunication, Quote } from "@shared/schema";
import { format } from "date-fns";

const communicationSchema = z.object({
  type: z.enum(["email", "call", "meeting", "note"]),
  subject: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

type CommunicationFormData = z.infer<typeof communicationSchema>;

interface ExtendedQuote extends Quote {
  clientName?: string;
}

interface ExtendedInvoice {
  id: string;
  invoiceNumber: string;
  quoteNumber: string;
  paymentStatus: string;
  dueDate: Date | string;
  total: string;
}

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const clientId = params?.id;
  const { toast } = useToast();

  const [newTag, setNewTag] = useState("");
  const [isCommunicationDialogOpen, setIsCommunicationDialogOpen] = useState(false);

  // Fetch client data
  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  // Fetch client tags
  const { data: tags = [] } = useQuery<ClientTag[]>({
    queryKey: [`/api/clients/${clientId}/tags`],
    enabled: !!clientId,
  });

  // Fetch client communications
  const { data: communications = [] } = useQuery<ClientCommunication[]>({
    queryKey: [`/api/clients/${clientId}/communications`],
    enabled: !!clientId,
  });

  // Fetch all quotes and filter for this client
  const { data: allQuotes = [] } = useQuery<ExtendedQuote[]>({
    queryKey: ["/api/quotes"],
  });

  const clientQuotes = allQuotes.filter(q => q.clientId === clientId);

  // Fetch all invoices and filter for this client's quotes
  const { data: allInvoices = [] } = useQuery<ExtendedInvoice[]>({
    queryKey: ["/api/invoices"],
  });

  const clientInvoices = allInvoices.filter(inv =>
    clientQuotes.some(q => q.id === inv.quoteNumber || q.quoteNumber === inv.quoteNumber)
  );

  // Mutations
  const addTagMutation = useMutation({
    mutationFn: async (tag: string) => {
      return await apiRequest("POST", `/api/clients/${clientId}/tags`, { tag });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/tags`] });
      setNewTag("");
      toast({
        title: "Tag added",
        description: "Tag has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      return await apiRequest("DELETE", `/api/clients/tags/${tagId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/tags`] });
      toast({
        title: "Tag removed",
        description: "Tag has been removed successfully.",
      });
    },
  });

  const communicationForm = useForm<CommunicationFormData>({
    resolver: zodResolver(communicationSchema),
    defaultValues: {
      type: "note",
      subject: "",
      message: "",
    },
  });

  const createCommunicationMutation = useMutation({
    mutationFn: async (data: CommunicationFormData) => {
      return await apiRequest("POST", `/api/clients/${clientId}/communications`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/communications`] });
      setIsCommunicationDialogOpen(false);
      communicationForm.reset();
      toast({
        title: "Communication logged",
        description: "Communication has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to log communication",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCommunicationMutation = useMutation({
    mutationFn: async (commId: string) => {
      return await apiRequest("DELETE", `/api/clients/communications/${commId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${clientId}/communications`] });
      toast({
        title: "Communication deleted",
        description: "Communication has been removed successfully.",
      });
    },
  });

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTag.trim()) {
      addTagMutation.mutate(newTag.trim());
    }
  };

  const onCommunicationSubmit = (values: CommunicationFormData) => {
    createCommunicationMutation.mutate(values);
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      case "note":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-200 text-gray-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "invoiced":
        return "bg-purple-100 text-purple-800";
      case "paid":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  if (clientLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Client not found</h3>
            <Link href="/clients">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/clients">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{client.name}</h1>
          <p className="text-muted-foreground font-['Open_Sans'] mt-1">
            Client Details & History
          </p>
        </div>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-['Open_Sans']">{client.email}</span>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-['Open_Sans']">{client.phone}</span>
                </div>
              )}
              {client.contactPerson && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-['Open_Sans']">{client.contactPerson}</span>
                </div>
              )}
              {client.gstin && (
                <div className="text-sm">
                  <span className="text-muted-foreground">GSTIN: </span>
                  <span className="font-mono text-xs">{client.gstin}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {client.billingAddress && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Billing Address
                  </div>
                  <p className="text-sm text-muted-foreground font-['Open_Sans'] ml-6 whitespace-pre-line">
                    {client.billingAddress}
                  </p>
                </div>
              )}
              {client.shippingAddress && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Shipping Address
                  </div>
                  <p className="text-sm text-muted-foreground font-['Open_Sans'] ml-6 whitespace-pre-line">
                    {client.shippingAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="quotes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="quotes">
            <FileText className="h-4 w-4 mr-2" />
            Quotes ({clientQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <DollarSign className="h-4 w-4 mr-2" />
            Invoices ({clientInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="tags">
            <Tag className="h-4 w-4 mr-2" />
            Tags ({tags.length})
          </TabsTrigger>
          <TabsTrigger value="communications">
            <MessageSquare className="h-4 w-4 mr-2" />
            History ({communications.length})
          </TabsTrigger>
        </TabsList>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Quotes</h3>
            <Link href={`/quotes/create?clientId=${clientId}`}>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Quote
              </Button>
            </Link>
          </div>
          {clientQuotes.length > 0 ? (
            <div className="space-y-3">
              {clientQuotes.map((quote) => (
                <Card key={quote.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link href={`/quotes/${quote.id}`}>
                            <h4 className="font-semibold hover:text-primary cursor-pointer">
                              {quote.quoteNumber}
                            </h4>
                          </Link>
                          <Badge className={getStatusColor(quote.status)}>
                            {quote.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{format(new Date(quote.createdAt), "MMM dd, yyyy")}</span>
                          <span className="font-semibold text-foreground">
                            ${Number(quote.total).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Link href={`/quotes/${quote.id}`}>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No quotes yet</h3>
                <p className="text-sm text-muted-foreground font-['Open_Sans'] mb-4">
                  Create your first quote for this client
                </p>
                <Link href={`/quotes/create?clientId=${clientId}`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quote
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <h3 className="text-lg font-semibold">Invoices</h3>
          {clientInvoices.length > 0 ? (
            <div className="space-y-3">
              {clientInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link href={`/invoices/${invoice.id}`}>
                            <h4 className="font-semibold hover:text-primary cursor-pointer">
                              {invoice.invoiceNumber}
                            </h4>
                          </Link>
                          <Badge className={getStatusColor(invoice.paymentStatus)}>
                            {invoice.paymentStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Due: {format(new Date(invoice.dueDate), "MMM dd, yyyy")}</span>
                          <span className="font-semibold text-foreground">
                            ${Number(invoice.total).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
                <p className="text-sm text-muted-foreground font-['Open_Sans']">
                  Invoices will appear here when quotes are converted
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Client Tags</h3>
          </div>
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleAddTag} className="flex gap-2 mb-4">
                <Input
                  placeholder="Add a tag (e.g., VIP, Wholesale, etc.)"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  data-testid="input-new-tag"
                />
                <Button type="submit" disabled={!newTag.trim() || addTagMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </form>
              <div className="flex flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="px-3 py-1 text-sm flex items-center gap-2"
                    >
                      <Tag className="h-3 w-3" />
                      {tag.tag}
                      <button
                        onClick={() => removeTagMutation.mutate(tag.id)}
                        className="ml-1 hover:text-destructive"
                        data-testid={`button-remove-tag-${tag.id}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground font-['Open_Sans']">
                    No tags yet. Add tags to organize and categorize this client.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Communication History</h3>
            <Dialog open={isCommunicationDialogOpen} onOpenChange={setIsCommunicationDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Log Communication
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Communication</DialogTitle>
                  <DialogDescription>
                    Record a communication with this client
                  </DialogDescription>
                </DialogHeader>
                <Form {...communicationForm}>
                  <form onSubmit={communicationForm.handleSubmit(onCommunicationSubmit)} className="space-y-4">
                    <FormField
                      control={communicationForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="call">Phone Call</SelectItem>
                              <SelectItem value="meeting">Meeting</SelectItem>
                              <SelectItem value="note">Note</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={communicationForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Brief subject or title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={communicationForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message *</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Communication details..."
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createCommunicationMutation.isPending}>
                      Log Communication
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {communications.length > 0 ? (
            <div className="space-y-3">
              {communications.map((comm) => (
                <Card key={comm.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-primary/10 rounded-md">
                          {getCommunicationIcon(comm.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize">
                              {comm.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comm.date), "MMM dd, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          {comm.subject && (
                            <h4 className="font-semibold mb-1">{comm.subject}</h4>
                          )}
                          <p className="text-sm text-muted-foreground font-['Open_Sans'] whitespace-pre-line">
                            {comm.message}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCommunicationMutation.mutate(comm.id)}
                        data-testid={`button-delete-comm-${comm.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No communications logged</h3>
                <p className="text-sm text-muted-foreground font-['Open_Sans'] mb-4">
                  Start tracking your interactions with this client
                </p>
                <Button onClick={() => setIsCommunicationDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Log First Communication
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

