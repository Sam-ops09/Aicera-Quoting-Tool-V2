import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export interface BOMItem {
  id: string;
  partNumber: string;
  description: string;
  manufacturer?: string;
  quantity: number;
  unitOfMeasure: string;
  specifications?: string;
  notes?: string;
}

interface BOMSectionProps {
  items: BOMItem[];
  onChange: (items: BOMItem[]) => void;
  readonly?: boolean;
}

export function BOMSection({ items, onChange, readonly = false }: BOMSectionProps) {
  const addItem = () => {
    const newItem: BOMItem = {
      id: crypto.randomUUID(),
      partNumber: "",
      description: "",
      manufacturer: "",
      quantity: 1,
      unitOfMeasure: "pcs",
      specifications: "",
      notes: "",
    };
    onChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof BOMItem, value: any) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Bill of Materials (BOM)</h3>
        </div>
        {!readonly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            data-testid="button-add-bom-item"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>
      <div className="space-y-6">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No BOM items added yet</p>
            {!readonly && <p className="text-sm">Click "Add Item" to get started</p>}
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-start justify-between">
                <h4 className="font-medium">Item {index + 1}</h4>
                {!readonly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    data-testid={`button-remove-bom-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Part Number *</label>
                  <Input
                    value={item.partNumber}
                    onChange={(e) => updateItem(item.id, "partNumber", e.target.value)}
                    placeholder="e.g., PN-12345"
                    disabled={readonly}
                    data-testid={`input-bom-part-number-${index}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Manufacturer</label>
                  <Input
                    value={item.manufacturer || ""}
                    onChange={(e) => updateItem(item.id, "manufacturer", e.target.value)}
                    placeholder="e.g., Acme Corp"
                    disabled={readonly}
                    data-testid={`input-bom-manufacturer-${index}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description *</label>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  placeholder="Detailed description of the component"
                  disabled={readonly}
                  rows={2}
                  data-testid={`input-bom-description-${index}`}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity *</label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                    min="1"
                    disabled={readonly}
                    data-testid={`input-bom-quantity-${index}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit of Measure</label>
                  <Input
                    value={item.unitOfMeasure}
                    onChange={(e) => updateItem(item.id, "unitOfMeasure", e.target.value)}
                    placeholder="pcs, kg, m, etc."
                    disabled={readonly}
                    data-testid={`input-bom-uom-${index}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Specifications</label>
                <Textarea
                  value={item.specifications || ""}
                  onChange={(e) => updateItem(item.id, "specifications", e.target.value)}
                  placeholder="Technical specifications, dimensions, standards, etc."
                  disabled={readonly}
                  rows={2}
                  data-testid={`input-bom-specs-${index}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={item.notes || ""}
                  onChange={(e) => updateItem(item.id, "notes", e.target.value)}
                  placeholder="Additional notes or comments"
                  disabled={readonly}
                  rows={2}
                  data-testid={`input-bom-notes-${index}`}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

