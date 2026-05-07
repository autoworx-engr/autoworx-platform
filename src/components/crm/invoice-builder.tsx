"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";

export type ProductOption = {
  id: number;
  name: string;
  sku: string | null;
  unitPrice: number;
};

type LineRow = {
  id: string;
  productId: string;
  description: string;
  qty: number;
  unitPrice: number;
};

function newRow(): LineRow {
  return {
    id: Math.random().toString(36).slice(2),
    productId: "",
    description: "",
    qty: 1,
    unitPrice: 0,
  };
}

function rowAmount(r: LineRow) {
  return Math.round(r.qty * r.unitPrice * 100) / 100;
}

type Props = {
  products: ProductOption[];
};

export function InvoiceBuilder({ products }: Props) {
  const [rows, setRows] = useState<LineRow[]>([newRow()]);
  const [taxPct, setTaxPct] = useState(0);
  const uid = useId();

  const productMap = new Map(products.map((p) => [String(p.id), p]));

  function updateRow(id: string, patch: Partial<LineRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.productId !== undefined) {
          const p = productMap.get(patch.productId);
          if (p) {
            next.description = next.description || p.name;
            next.unitPrice = p.unitPrice;
          }
        }
        return next;
      }),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  const subtotal = rows.reduce((s, r) => s + rowAmount(r), 0);
  const taxAmount = Math.round(subtotal * (taxPct / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  function fmt(n: number) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);
  }

  return (
    <div className="space-y-5">
      {/* Hidden field so the server action knows how many rows to read */}
      <input type="hidden" name="lineCount" value={rows.length} />
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs font-medium uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left w-[200px]">Product</th>
              <th className="px-3 py-2 text-left min-w-[180px]">Description</th>
              <th className="px-3 py-2 text-right w-20">Qty</th>
              <th className="px-3 py-2 text-right w-28">Unit price</th>
              <th className="px-3 py-2 text-right w-28">Amount</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={row.id} className="group">
                <td className="p-2">
                  <select
                    name={`line_product_${i}`}
                    value={row.productId}
                    onChange={(e) => updateRow(row.id, { productId: e.target.value })}
                    className="w-full rounded border border-border bg-card px-2 py-1.5 text-xs"
                  >
                    <option value="">— Custom —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.sku ? ` [${p.sku}]` : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    name={`line_desc_${i}`}
                    required
                    value={row.description}
                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                    placeholder="Description"
                    className="w-full rounded border border-border px-2 py-1.5 text-xs"
                  />
                </td>
                <td className="p-2">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateRow(row.id, { qty: Math.max(1, row.qty - 1) })
                      }
                      className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-slate-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <input
                      name={`line_qty_${i}`}
                      type="number"
                      min={1}
                      value={row.qty}
                      onChange={(e) =>
                        updateRow(row.id, {
                          qty: Math.max(1, Math.trunc(Number(e.target.value)) || 1),
                        })
                      }
                      className="w-14 rounded border border-border px-1 py-1.5 text-center text-xs tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => updateRow(row.id, { qty: row.qty + 1 })}
                      className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground hover:bg-slate-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </td>
                <td className="p-2">
                  <input
                    name={`line_price_${i}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.unitPrice || ""}
                    onChange={(e) =>
                      updateRow(row.id, {
                        unitPrice: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    placeholder="0.00"
                    className="w-full rounded border border-border px-2 py-1.5 text-right text-xs tabular-nums"
                  />
                </td>
                <td className="p-2 text-right text-xs tabular-nums font-medium text-foreground">
                  {fmt(rowAmount(row))}
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60",
                      rows.length > 1
                        ? "hover:bg-red-50 hover:text-red-600"
                        : "cursor-not-allowed opacity-30",
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-4 py-2 text-sm text-muted-foreground hover:border-teal-400 hover:text-teal-700"
      >
        <Plus className="h-4 w-4" />
        Add line
      </button>

      <div className="flex flex-col items-end gap-2">
        <div className="flex w-full max-w-xs items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="tabular-nums font-medium">{fmt(subtotal)}</span>
        </div>
        <div className="flex w-full max-w-xs items-center gap-3">
          <label htmlFor={`${uid}-tax`} className="shrink-0 text-sm text-muted-foreground">
            Tax %
          </label>
          <input
            id={`${uid}-tax`}
            name="taxPercent"
            type="number"
            min={0}
            max={100}
            value={taxPct || ""}
            onChange={(e) => setTaxPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            placeholder="0"
            className="w-20 rounded border border-border px-2 py-1 text-sm"
          />
          <span className="ml-auto tabular-nums text-sm font-medium">{fmt(taxAmount)}</span>
        </div>
        <div className="flex w-full max-w-xs items-center justify-between rounded-lg bg-teal-50 px-3 py-2">
          <span className="text-sm font-semibold text-teal-900">Total</span>
          <span className="tabular-nums text-lg font-bold text-teal-950">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}
