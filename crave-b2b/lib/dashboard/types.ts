export type LiveBookingTableRow = {
  id: string;
  food: string;
  phone: string;
  notes: string;
  size: string;
  date: string;
  time: string;
  /** Sort key and pagination cursor (UTC epoch ms) */
  atMs: number;
};

export type DashboardKpi = {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  caption: string;
};

export type MenuPerformanceTableRow = {
  id: string;
  item: string;
  rate: string;
  up: boolean;
  upCount: number;
  downCount: number;
};
