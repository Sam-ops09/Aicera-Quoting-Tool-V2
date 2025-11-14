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
import { Plus, Trash2, Loader2, CreditCard, Calendar } from "lucide-react";
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payment Tracking</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowAddPaymentDialog(true)}
            data-testid="button-add-payment"
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Amount</span>
            <span className="font-semibold">₹{total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Paid Amount</span>
            <span className="font-semibold text-green-600">₹{paidAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Outstanding</span>
            <span className="font-semibold text-orange-600">₹{outstanding.toLocaleString()}</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Payment Progress</span>
              <span>{percentPaid.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-green-600 h-full transition-all duration-300"
                style={{ width: `${Math.min(percentPaid, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment History */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Payment History</h4>
          {isLoading ? (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : paymentHistory && paymentHistory.length > 0 ? (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">₹{parseFloat(payment.amount).toLocaleString()}</span>
                        <Badge variant="outline" className="text-xs">
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(payment.paymentDate).toLocaleDateString()}</span>
                        {payment.recordedByName && (
                          <span>• Recorded by {payment.recordedByName}</span>
                        )}
                      </div>
                      {payment.transactionId && (
                        <div className="text-xs text-muted-foreground">
                          Ref: {payment.transactionId}
                        </div>
                      )}
                      {payment.notes && (
                        <div className="text-xs text-muted-foreground italic">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this payment record?")) {
                          deletePaymentMutation.mutate(payment.id);
                        }
                      }}
                      data-testid={`button-delete-payment-${payment.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No payments recorded yet
            </div>
          )}
        </div>
      </CardContent>

      {/* Add Payment Dialog */}
      <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Amount *</Label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">₹</span>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="0.00"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  min="0"
                  step="0.01"
                  data-testid="input-payment-amount"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Outstanding: ₹{outstanding.toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select
                value={newPayment.paymentMethod}
                onValueChange={(value) => setNewPayment({ ...newPayment, paymentMethod: value })}
              >
                <SelectTrigger id="payment-method" data-testid="select-payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={newPayment.paymentDate}
                onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                data-testid="input-payment-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID / Reference</Label>
              <Input
                id="transaction-id"
                type="text"
                placeholder="Optional reference number"
                value={newPayment.transactionId}
                onChange={(e) => setNewPayment({ ...newPayment, transactionId: e.target.value })}
                data-testid="input-transaction-id"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea
                id="payment-notes"
                placeholder="Optional payment notes..."
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                rows={3}
                data-testid="textarea-payment-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddPaymentDialog(false)}
              data-testid="button-payment-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={addPaymentMutation.isPending}
              data-testid="button-payment-save"
            >
              {addPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

