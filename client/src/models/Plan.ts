export interface Plan {
  id: string;
  planName: string;
  description?: string;
  year: number;
  week: number;
  weekName: string;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: Date;
  lastOpenedAt?: Date;
}

