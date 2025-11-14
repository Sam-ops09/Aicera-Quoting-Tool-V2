import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Shield, Calendar, CheckCircle2 } from "lucide-react";

// Type definitions
interface BOMItem {
  id: string;
  partNumber: string;
  description: string;
  manufacturer?: string;
  quantity: number;
  unitOfMeasure: string;
  specifications?: string;
  notes?: string;
}

interface SLAMetric {
  id: string;
  name: string;
  description: string;
  target: string;
  measurement: string;
  penalty?: string;
}

interface SLAData {
  overview: string;
  responseTime?: string;
  resolutionTime?: string;
  availability?: string;
  supportHours?: string;
  escalationProcess?: string;
  metrics: SLAMetric[];
}

interface TimelineMilestone {
  id: string;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  status: "planned" | "in-progress" | "completed" | "delayed";
  deliverables?: string;
  dependencies?: string;
}

interface TimelineData {
  projectOverview: string;
  startDate?: string;
  endDate?: string;
  milestones: TimelineMilestone[];
}

interface AdvancedSectionsDisplayProps {
  bomData?: BOMItem[];
  slaData?: SLAData;
  timelineData?: TimelineData;
}

export function AdvancedSectionsDisplay({ bomData, slaData, timelineData }: AdvancedSectionsDisplayProps) {
  const hasBOM = bomData && bomData.length > 0;
  const hasSLA = slaData && (slaData.overview || slaData.metrics.length > 0);
  const hasTimeline = timelineData && (timelineData.projectOverview || timelineData.milestones.length > 0);

  if (!hasBOM && !hasSLA && !hasTimeline) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned":
        return "text-gray-600 bg-gray-100 dark:bg-gray-800";
      case "in-progress":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900";
      case "completed":
        return "text-green-600 bg-green-100 dark:bg-green-900";
      case "delayed":
        return "text-red-600 bg-red-100 dark:bg-red-900";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Bill of Materials */}
      {hasBOM && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <CardTitle>Bill of Materials (BOM)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bomData.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-lg">Item {index + 1}: {item.partNumber}</h4>
                    <span className="text-sm text-muted-foreground">Qty: {item.quantity} {item.unitOfMeasure}</span>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Description: </span>
                      <span>{item.description}</span>
                    </div>

                    {item.manufacturer && (
                      <div>
                        <span className="text-muted-foreground">Manufacturer: </span>
                        <span>{item.manufacturer}</span>
                      </div>
                    )}

                    {item.specifications && (
                      <div>
                        <span className="text-muted-foreground">Specifications: </span>
                        <span className="whitespace-pre-line">{item.specifications}</span>
                      </div>
                    )}

                    {item.notes && (
                      <div>
                        <span className="text-muted-foreground">Notes: </span>
                        <span className="whitespace-pre-line">{item.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Level Agreement */}
      {hasSLA && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Service Level Agreement (SLA)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {slaData.overview && (
              <div>
                <h4 className="font-medium mb-2">Overview</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{slaData.overview}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {slaData.responseTime && (
                <div className="border rounded-lg p-3">
                  <span className="text-sm font-medium">Response Time</span>
                  <p className="text-sm text-muted-foreground mt-1">{slaData.responseTime}</p>
                </div>
              )}
              {slaData.resolutionTime && (
                <div className="border rounded-lg p-3">
                  <span className="text-sm font-medium">Resolution Time</span>
                  <p className="text-sm text-muted-foreground mt-1">{slaData.resolutionTime}</p>
                </div>
              )}
              {slaData.availability && (
                <div className="border rounded-lg p-3">
                  <span className="text-sm font-medium">System Availability</span>
                  <p className="text-sm text-muted-foreground mt-1">{slaData.availability}</p>
                </div>
              )}
              {slaData.supportHours && (
                <div className="border rounded-lg p-3">
                  <span className="text-sm font-medium">Support Hours</span>
                  <p className="text-sm text-muted-foreground mt-1">{slaData.supportHours}</p>
                </div>
              )}
            </div>

            {slaData.escalationProcess && (
              <div>
                <h4 className="font-medium mb-2">Escalation Process</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{slaData.escalationProcess}</p>
              </div>
            )}

            {slaData.metrics.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  {slaData.metrics.map((metric) => (
                    <div key={metric.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium">{metric.name}</span>
                        <span className="text-sm text-primary font-semibold">Target: {metric.target}</span>
                      </div>
                      {metric.description && (
                        <p className="text-sm text-muted-foreground mb-2">{metric.description}</p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Measurement: {metric.measurement}</span>
                        {metric.penalty && <span>Penalty: {metric.penalty}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Project Timeline */}
      {hasTimeline && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Project Timeline</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {timelineData.projectOverview && (
              <div>
                <h4 className="font-medium mb-2">Project Overview</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{timelineData.projectOverview}</p>
              </div>
            )}

            {(timelineData.startDate || timelineData.endDate) && (
              <div className="grid gap-4 md:grid-cols-2">
                {timelineData.startDate && (
                  <div className="border rounded-lg p-3">
                    <span className="text-sm font-medium">Project Start</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(timelineData.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {timelineData.endDate && (
                  <div className="border rounded-lg p-3">
                    <span className="text-sm font-medium">Project End</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(timelineData.endDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {timelineData.milestones.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Milestones & Phases</h4>
                <div className="space-y-4">
                  {timelineData.milestones.map((milestone) => (
                    <div key={milestone.id} className="border-l-4 border-primary pl-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={`h-5 w-5 ${
                          milestone.status === "completed" ? "text-green-600" : "text-gray-400"
                        }`} />
                        <h5 className="font-medium">{milestone.name}</h5>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(milestone.status)}`}>
                          {milestone.status}
                        </span>
                      </div>

                      {milestone.description && (
                        <p className="text-sm text-muted-foreground">{milestone.description}</p>
                      )}

                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {milestone.startDate && (
                          <span>Start: {new Date(milestone.startDate).toLocaleDateString()}</span>
                        )}
                        {milestone.endDate && (
                          <span>End: {new Date(milestone.endDate).toLocaleDateString()}</span>
                        )}
                        {milestone.duration && (
                          <span>Duration: {milestone.duration}</span>
                        )}
                      </div>

                      {milestone.deliverables && (
                        <div className="text-sm">
                          <span className="font-medium">Deliverables: </span>
                          <span className="text-muted-foreground">{milestone.deliverables}</span>
                        </div>
                      )}

                      {milestone.dependencies && (
                        <div className="text-sm">
                          <span className="font-medium">Dependencies: </span>
                          <span className="text-muted-foreground">{milestone.dependencies}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

