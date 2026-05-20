export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface MaterialInput {
  name: string;
  quantity: number;
  sellPrice: number;
  costPrice?: number;
  discount?: number;
  productId?: number;
}
