import { useState } from "react";
export type Columns = 2 | 3 | 5;
export function nextColumns(current: Columns, scale: number): Columns {
  const values: Columns[] = [2, 3, 5];
  const step = scale > 1.18 ? -1 : scale < 0.84 ? 1 : 0;
  return values[Math.max(0, Math.min(2, values.indexOf(current) + step))];
}
export function useGridColumns() {
  const [columns, setColumns] = useState<Columns>(3);
  return { columns, setColumns };
}
