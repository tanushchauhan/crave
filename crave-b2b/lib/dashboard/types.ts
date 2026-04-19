export type LiveBookingTableRow = {
  id: string;
  food: string;
  phone: string;
  notes: string;
  size: string;
  date: string;
  time: string;
};

export type MenuPerformanceTableRow = {
  id: string;
  item: string;
  rate: string;
  up: boolean;
  upCount: number;
  downCount: number;
};
