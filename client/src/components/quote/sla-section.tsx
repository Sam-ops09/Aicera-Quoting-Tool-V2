import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Shield, Clock } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SLAMetric {
  id: string;
  name: string;
  description: string;
  target: string;
  measurement: string;
  penalty?: string;
}

export interface SLAData {
  overview: string;
  responseTime?: string;
  resolutionTime?: string;
  availability?: string;
  supportHours?: string;
  escalationProcess?: string;
  metrics: SLAMetric[];
}

interface SLASectionProps {
  data: SLAData;
  onChange: (data: SLAData) => void;
  readonly?: boolean;
}

export function SLASection({ data, onChange, readonly = false }: SLASectionProps) {
  const addMetric = () => {
    const newMetric: SLAMetric = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      target: "",
      measurement: "percentage",
      penalty: "",
    };
    onChange({
      ...data,
      metrics: [...data.metrics, newMetric],
    });
  };

  const updateMetric = (id: string, field: keyof SLAMetric, value: any) => {
    onChange({
      ...data,
      metrics: data.metrics.map((metric) =>
        metric.id === id ? { ...metric, [field]: value } : metric
      ),
    });
  };

  const removeMetric = (id: string) => {
    onChange({
      ...data,
      metrics: data.metrics.filter((metric) => metric.id !== id),
    });
  };

  const updateField = (field: keyof SLAData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>Service Level Agreement (SLA)</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Overview</label>
          <Textarea
            value={data.overview}
            onChange={(e) => updateField("overview", e.target.value)}
            placeholder="Provide an overview of the service level commitments"
            disabled={readonly}
            rows={3}
            data-testid="input-sla-overview"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Response Time
            </label>
            <Input
              value={data.responseTime || ""}
              onChange={(e) => updateField("responseTime", e.target.value)}
              placeholder="e.g., 4 business hours"
              disabled={readonly}
              data-testid="input-sla-response-time"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Resolution Time
            </label>
            <Input
              value={data.resolutionTime || ""}
              onChange={(e) => updateField("resolutionTime", e.target.value)}
              placeholder="e.g., 24 business hours"
              disabled={readonly}
              data-testid="input-sla-resolution-time"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">System Availability</label>
            <Input
              value={data.availability || ""}
              onChange={(e) => updateField("availability", e.target.value)}
              placeholder="e.g., 99.9% uptime"
              disabled={readonly}
              data-testid="input-sla-availability"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Support Hours</label>
            <Input
              value={data.supportHours || ""}
              onChange={(e) => updateField("supportHours", e.target.value)}
              placeholder="e.g., 24/7 or Mon-Fri 9AM-6PM"
              disabled={readonly}
              data-testid="input-sla-support-hours"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Escalation Process</label>
          <Textarea
            value={data.escalationProcess || ""}
            onChange={(e) => updateField("escalationProcess", e.target.value)}
            placeholder="Describe the escalation procedure for unresolved issues"
            disabled={readonly}
            rows={3}
            data-testid="input-sla-escalation"
          />
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Performance Metrics</h4>
            {!readonly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMetric}
                data-testid="button-add-sla-metric"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Metric
              </Button>
            )}
          </div>

          {data.metrics.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No performance metrics defined
            </div>
          ) : (
            <div className="space-y-4">
              {data.metrics.map((metric, index) => (
                <div key={metric.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <h5 className="font-medium">Metric {index + 1}</h5>
                    {!readonly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMetric(metric.id)}
                        data-testid={`button-remove-sla-metric-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Metric Name *</label>
                      <Input
                        value={metric.name}
                        onChange={(e) => updateMetric(metric.id, "name", e.target.value)}
                        placeholder="e.g., Ticket Resolution Rate"
                        disabled={readonly}
                        data-testid={`input-sla-metric-name-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target *</label>
                      <Input
                        value={metric.target}
                        onChange={(e) => updateMetric(metric.id, "target", e.target.value)}
                        placeholder="e.g., 95%"
                        disabled={readonly}
                        data-testid={`input-sla-metric-target-${index}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={metric.description}
                      onChange={(e) => updateMetric(metric.id, "description", e.target.value)}
                      placeholder="Describe what this metric measures"
                      disabled={readonly}
                      rows={2}
                      data-testid={`input-sla-metric-description-${index}`}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Measurement Unit</label>
                      <Select
                        value={metric.measurement}
                        onValueChange={(value) => updateMetric(metric.id, "measurement", value)}
                        disabled={readonly}
                      >
                        <SelectTrigger data-testid={`select-sla-metric-measurement-${index}`}>
                          <SelectValue placeholder="Select measurement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="time">Time</SelectItem>
                          <SelectItem value="count">Count</SelectItem>
                          <SelectItem value="ratio">Ratio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Penalty for Non-Compliance</label>
                      <Input
                        value={metric.penalty || ""}
                        onChange={(e) => updateMetric(metric.id, "penalty", e.target.value)}
                        placeholder="e.g., 10% service credit"
                        disabled={readonly}
                        data-testid={`input-sla-metric-penalty-${index}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

