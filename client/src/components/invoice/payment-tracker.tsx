import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Plus,
    Trash2,
    Loader2,
    CreditCard,
    Calendar,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertCircle,
    DollarSign
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentHistoryEntry {
  id: string;
  amount: string;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  paymentDate: string;
  recordedBy: string;
  recordedByName?: string;
}

interface PaymentTrackerProps {
  invoiceId: string;
  total: number;
  paidAmount: number;
  paymentStatus: string;
  onUpdate?: () => void;
}

export function PaymentTracker({ invoiceId, total, paidAmount, paymentStatus, onUpdate }: PaymentTrackerProps) {
  const { toast } = useToast();
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: "",
    paymentMethod: "",
    transactionId: "",
    notes: "",
    paymentDate: new Date().toISOString().split('T')[0],
  });

  const { data: paymentHistory, isLoading } = useQuery<PaymentHistoryEntry[]>({
    queryKey: [`/api/invoices/${invoiceId}/payment-history-detailed`],
    enabled: !!invoiceId,
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (payment: typeof newPayment) => {
      return await apiRequest("POST", `/api/invoices/${invoiceId}/payment`, payment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/payment-history-detailed`] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Payment recorded successfully.",
      });
      setShowAddPaymentDialog(false);
      setNewPayment({
        amount: "",
        paymentMethod: "",
        transactionId: "",
        notes: "",
        paymentDate: new Date().toISOString().split('T')[0],
      });
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment.",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest("DELETE", `/api/payment-history/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/payment-history-detailed`] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Payment deleted successfully.",
      });
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment.",
        variant: "destructive",
      });
    },
  });

  const handleAddPayment = () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    if (!newPayment.paymentMethod) {
      toast({
        title: "Error",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newPayment.amount);
    const currentPaid = parseFloat(paidAmount.toString());

    if (currentPaid + amount > total) {
      toast({
        title: "Warning",
        description: "Payment amount exceeds outstanding balance. Proceeding anyway.",
      });
    }

    addPaymentMutation.mutate(newPayment);
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: "Bank Transfer",
      credit_card: "Credit Card",
      debit_card: "Debit Card",
      check: "Check",
      cash: "Cash",
      upi: "UPI",
      other: "Other",
    };
    return labels[method] || method;
  };

  const outstanding = total - paidAmount;
  const percentPaid = (paidAmount / total) * 100;
  const isFullyPaid = outstanding <= 0;
  const isOverdue = paymentStatus === 'overdue';

  const getStatusIcon = () => {
    if (isFullyPaid) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (isOverdue) return <AlertCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-orange-600" />;
  };

  return (
    <Card className="border-2 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-[#0046FF]/5 via-blue-50/50 to-[#0046FF]/5 dark:from-[#0046FF]/10 dark:via-blue-950/50 dark:to-[#0046FF]/10 border-b">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#0046FF] to-[#001BB7] rounded-lg shadow-lg shrink-0">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl">Payment Tracking</CardTitle>
              <p className="text-xs text-muted-foreground font-['Open_Sans'] mt-0.5">
                Monitor and record all payments
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-[#0046FF] to-[#001BB7] hover:from-[#001BB7] hover:to-[#0046FF] text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto sm:self-end"
            onClick={() => setShowAddPaymentDialog(true)}
            data-testid="button-add-payment"
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-blue-950 dark:via-blue-900 dark:to-blue-950 p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 font-['Open_Sans'] uppercase tracking-wider">Total</span>
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            </div>
            <span className="font-bold text-xl sm:text-2xl text-[#001BB7] dark:text-blue-200 block">₹{total.toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-green-50 via-green-100 to-green-50 dark:from-green-950 dark:via-green-900 dark:to-green-950 p-4 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-700 dark:text-green-300 font-['Open_Sans'] uppercase tracking-wider">Paid</span>
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
            </div>
            <span className="font-bold text-xl sm:text-2xl text-green-700 dark:text-green-200 block">₹{paidAmount.toLocaleString()}</span>
          </div>
          <div className="bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 dark:from-orange-950 dark:via-orange-900 dark:to-orange-950 p-4 rounded-xl border-2 border-orange-200 dark:border-orange-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 font-['Open_Sans'] uppercase tracking-wider">Balance</span>
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
            </div>
            <span className="font-bold text-xl sm:text-2xl text-[#FF8040] dark:text-orange-200 block">₹{outstanding.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-3 bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-900/50 p-4 rounded-xl border">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <span className="font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#0046FF] shrink-0" />
              <span>Payment Progress</span>
            </span>
            <Badge 
              className={`${
                isFullyPaid 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              } font-bold shrink-0`}
            >
              {percentPaid.toFixed(1)}%
            </Badge>
          </div>
          <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                isFullyPaid 
                  ? 'bg-gradient-to-r from-green-500 via-green-600 to-green-500'
                  : 'bg-gradient-to-r from-[#0046FF] via-blue-600 to-[#001BB7]'
              }`}
              style={{ width: `${Math.min(percentPaid, 100)}%` }}
            >
              <div className="h-full w-full bg-white/30 animate-pulse" />
            </div>
            {isFullyPaid && (
              <CheckCircle2 className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-white drop-shadow-lg z-10" />
            )}
          </div>
          {isFullyPaid && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-300 font-semibold bg-green-50 dark:bg-green-950 py-2 px-3 rounded-lg">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Invoice Fully Paid!</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="font-semibold text-base flex items-center gap-2.5">
              <div className="p-2 bg-[#0046FF]/10 rounded-lg shrink-0">
                <Calendar className="h-4 w-4 text-[#0046FF]" />
              </div>
              <span>Payment History</span>
            </h4>
            {paymentHistory && paymentHistory.length > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1 shrink-0">
                {paymentHistory.length} {paymentHistory.length === 1 ? 'record' : 'records'}
              </Badge>
            )}
          </div>
          
          {isLoading ? (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-900/50 rounded-xl border">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-[#0046FF] mb-3" />
              <p className="text-sm text-muted-foreground font-['Open_Sans']">Loading payment history...</p>
            </div>
          ) : paymentHistory && paymentHistory.length > 0 ? (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {paymentHistory.map((payment, index) => (
                <div
                  key={payment.id}
                  className={`group relative bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-[#0046FF]/40 p-4 shadow-sm hover:shadow-lg transition-all duration-300 ${
                    index === 0 ? 'mt-3' : ''
                  }`}
                >
                  {index === 0 && (
                    <div className="absolute -top-2.5 right-2 z-10">
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg px-2.5 py-0.5 text-xs font-semibold">
                        Latest
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gradient-to-br from-[#0046FF]/10 to-blue-100/50 dark:from-[#0046FF]/20 dark:to-blue-900/30 rounded-lg shrink-0">
                            <DollarSign className="h-4 w-4 text-[#0046FF]" />
                          </div>
                          <span className="font-bold text-xl text-[#001BB7] dark:text-blue-300">
                            ₹{parseFloat(payment.amount).toLocaleString()}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-50 dark:bg-blue-950 border-[#0046FF]/50 text-[#0046FF] font-semibold shrink-0"
                        >
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground font-['Open_Sans'] flex-wrap">
                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md shrink-0">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className="whitespace-nowrap">{new Date(payment.paymentDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                        {payment.recordedByName && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-muted-foreground shrink-0">Recorded by</span>
                            <span className="font-semibold text-foreground truncate">{payment.recordedByName}</span>
                          </div>
                        )}
                      </div>
                      
                      {payment.transactionId && (
                        <div className="flex items-start gap-2 text-xs bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800 dark:to-transparent p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                          <span className="text-muted-foreground font-semibold shrink-0">Transaction ID:</span>
                          <span className="font-mono font-medium break-all">{payment.transactionId}</span>
                        </div>
                      )}
                      
                      {payment.notes && (
                        <div className="text-sm text-muted-foreground bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/50 dark:to-transparent p-3 rounded-lg border-l-4 border-blue-400 break-words">
                          <span className="italic">"{payment.notes}"</span>
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 shrink-0 mt-1"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this payment record?")) {
                          deletePaymentMutation.mutate(payment.id);
                        }
                      }}
                      data-testid={`button-delete-payment-${payment.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50 dark:from-gray-900 dark:via-blue-950/20 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
              <div className="flex flex-col items-center gap-4">
                <div className="p-5 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full">
                  <CreditCard className="h-10 w-10 text-gray-400" />
                </div>
                <div className="px-4">
                  <p className="font-semibold text-base text-gray-700 dark:text-gray-300 mb-1">No payments recorded yet</p>
                  <p className="text-sm text-muted-foreground font-['Open_Sans']">
                    Click "Record Payment" above to add your first payment entry
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-gradient-to-br from-[#0046FF] to-[#001BB7] rounded-lg shadow-lg shrink-0">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold">Record Payment</DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground font-['Open_Sans'] mt-1">
                  Add a new payment transaction to this invoice
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="payment-amount" className="text-sm font-semibold flex items-center gap-1">
                Payment Amount <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg border-2 border-[#0046FF]/30">
                <span className="text-2xl sm:text-3xl font-bold text-[#0046FF] shrink-0">₹</span>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="0.00"
                  className="text-xl sm:text-2xl font-bold border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  min="0"
                  step="0.01"
                  data-testid="input-payment-amount"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-['Open_Sans'] px-1">
                <span className="text-muted-foreground">Outstanding Balance:</span>
                <span className="font-bold text-[#FF8040]">₹{outstanding.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-method" className="text-sm font-semibold flex items-center gap-1">
                  Payment Method <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newPayment.paymentMethod}
                  onValueChange={(value) => setNewPayment({ ...newPayment, paymentMethod: value })}
                >
                  <SelectTrigger id="payment-method" data-testid="select-payment-method" className="h-11">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">
                      <div className="flex items-center gap-2">
                        <span>🏦</span> Bank Transfer
                      </div>
                    </SelectItem>
                    <SelectItem value="credit_card">
                      <div className="flex items-center gap-2">
                        <span>💳</span> Credit Card
                      </div>
                    </SelectItem>
                    <SelectItem value="debit_card">
                      <div className="flex items-center gap-2">
                        <span>💳</span> Debit Card
                      </div>
                    </SelectItem>
                    <SelectItem value="check">
                      <div className="flex items-center gap-2">
                        <span>📝</span> Check
                      </div>
                    </SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <span>💵</span> Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="upi">
                      <div className="flex items-center gap-2">
                        <span>📱</span> UPI
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <span>⚙️</span> Other
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-date" className="text-sm font-semibold">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  className="h-11"
                  value={newPayment.paymentDate}
                  onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                  data-testid="input-payment-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-id" className="text-sm font-semibold">
                Transaction ID / Reference
              </Label>
              <Input
                id="transaction-id"
                type="text"
                placeholder="e.g., TXN123456789 (optional)"
                className="h-11 font-mono text-sm"
                value={newPayment.transactionId}
                onChange={(e) => setNewPayment({ ...newPayment, transactionId: e.target.value })}
                data-testid="input-transaction-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes" className="text-sm font-semibold">
                Additional Notes
              </Label>
              <Textarea
                id="payment-notes"
                placeholder="Add any additional notes about this payment (optional)..."
                className="font-['Open_Sans'] resize-none text-sm min-h-[80px]"
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                rows={3}
                data-testid="textarea-payment-notes"
              />
              <p className="text-xs text-muted-foreground font-['Open_Sans']">
                Any relevant information about this transaction
              </p>
            </div>
          </div>
          <DialogFooter className="border-t pt-4 gap-3 flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowAddPaymentDialog(false)}
              data-testid="button-payment-cancel"
              className="w-full sm:flex-1 sm:min-w-[120px] hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={addPaymentMutation.isPending}
              data-testid="button-payment-save"
              className="w-full sm:flex-1 sm:min-w-[160px] bg-gradient-to-r from-[#0046FF] to-[#001BB7] hover:from-[#001BB7] hover:to-[#0046FF] text-white shadow-lg hover:shadow-xl transition-all"
            >
              {addPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                  <span>Record Payment</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

