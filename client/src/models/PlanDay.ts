export interface PlanDay {
  id: string;
  planId: string;
  dayOfWeek: number; // 0 = Pazar, 1 = Pazartesi, ..., 6 = Cumartesi
  dayName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

