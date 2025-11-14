import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calendar, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TimelineMilestone {
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

export interface TimelineData {
  projectOverview: string;
  startDate?: string;
  endDate?: string;
  milestones: TimelineMilestone[];
}

interface TimelineSectionProps {
  data: TimelineData;
  onChange: (data: TimelineData) => void;
  readonly?: boolean;
}

export function TimelineSection({ data, onChange, readonly = false }: TimelineSectionProps) {
  const addMilestone = () => {
    const newMilestone: TimelineMilestone = {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      duration: "",
      status: "planned",
      deliverables: "",
      dependencies: "",
    };
    onChange({
      ...data,
      milestones: [...data.milestones, newMilestone],
    });
  };

  const updateMilestone = (id: string, field: keyof TimelineMilestone, value: any) => {
    onChange({
      ...data,
      milestones: data.milestones.map((milestone) =>
        milestone.id === id ? { ...milestone, [field]: value } : milestone
      ),
    });
  };

  const removeMilestone = (id: string) => {
    onChange({
      ...data,
      milestones: data.milestones.filter((milestone) => milestone.id !== id),
    });
  };

  const updateField = (field: keyof TimelineData, value: any) => {
    onChange({ ...data, [field]: value });
  };

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
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Project Timeline</h3>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Project Overview</label>
          <Textarea
            value={data.projectOverview}
            onChange={(e) => updateField("projectOverview", e.target.value)}
            placeholder="Provide an overview of the project timeline and approach"
            disabled={readonly}
            rows={3}
            data-testid="input-timeline-overview"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Start Date</label>
            <Input
              type="date"
              value={data.startDate || ""}
              onChange={(e) => updateField("startDate", e.target.value)}
              disabled={readonly}
              data-testid="input-timeline-start-date"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Project End Date</label>
            <Input
              type="date"
              value={data.endDate || ""}
              onChange={(e) => updateField("endDate", e.target.value)}
              disabled={readonly}
              data-testid="input-timeline-end-date"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Milestones & Phases</h4>
            {!readonly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMilestone}
                data-testid="button-add-milestone"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            )}
          </div>

          {data.milestones.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No milestones defined yet
            </div>
          ) : (
            <div className="space-y-4">
              {data.milestones.map((milestone, index) => (
                <div key={milestone.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className={`h-5 w-5 ${
                        milestone.status === "completed" ? "text-green-600" : "text-gray-400"
                      }`} />
                      <h5 className="font-medium">Phase {index + 1}</h5>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(milestone.status)}`}>
                        {milestone.status}
                      </span>
                    </div>
                    {!readonly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMilestone(milestone.id)}
                        data-testid={`button-remove-milestone-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Milestone Name *</label>
                    <Input
                      value={milestone.name}
                      onChange={(e) => updateMilestone(milestone.id, "name", e.target.value)}
                      placeholder="e.g., Requirements Gathering"
                      disabled={readonly}
                      data-testid={`input-milestone-name-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={milestone.description}
                      onChange={(e) => updateMilestone(milestone.id, "description", e.target.value)}
                      placeholder="Describe the activities and goals for this phase"
                      disabled={readonly}
                      rows={2}
                      data-testid={`input-milestone-description-${index}`}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        type="date"
                        value={milestone.startDate || ""}
                        onChange={(e) => updateMilestone(milestone.id, "startDate", e.target.value)}
                        disabled={readonly}
                        data-testid={`input-milestone-start-date-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        type="date"
                        value={milestone.endDate || ""}
                        onChange={(e) => updateMilestone(milestone.id, "endDate", e.target.value)}
                        disabled={readonly}
                        data-testid={`input-milestone-end-date-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration</label>
                      <Input
                        value={milestone.duration || ""}
                        onChange={(e) => updateMilestone(milestone.id, "duration", e.target.value)}
                        placeholder="e.g., 2 weeks"
                        disabled={readonly}
                        data-testid={`input-milestone-duration-${index}`}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={milestone.status}
                      onValueChange={(value: any) => updateMilestone(milestone.id, "status", value)}
                      disabled={readonly}
                    >
                      <SelectTrigger data-testid={`select-milestone-status-${index}`}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="delayed">Delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deliverables</label>
                    <Textarea
                      value={milestone.deliverables || ""}
                      onChange={(e) => updateMilestone(milestone.id, "deliverables", e.target.value)}
                      placeholder="List the expected deliverables for this milestone"
                      disabled={readonly}
                      rows={2}
                      data-testid={`input-milestone-deliverables-${index}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dependencies</label>
                    <Textarea
                      value={milestone.dependencies || ""}
                      onChange={(e) => updateMilestone(milestone.id, "dependencies", e.target.value)}
                      placeholder="List any dependencies or prerequisites"
                      disabled={readonly}
                      rows={2}
                      data-testid={`input-milestone-dependencies-${index}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

