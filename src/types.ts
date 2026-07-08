export interface Job {
  id: string;
  title: string;
  company: string;
  platform: 'LinkedIn' | 'Indeed';
  location: string;
  summary: string;
  salaryRange: string | null;
  requiredStack: string[];
  postDate: string;
  originalUrl: string;
  dateAdded: string;
  searchId: string;
  isTracked: boolean;
  status: 'Bookmarked' | 'Applied' | 'Interviewing' | 'Offered' | 'Rejected';
  notes: string;
  coverLetter: string | null;
}

export interface SavedSearch {
  id: string;
  name: string;
  roleType: 'front-end' | 'back-end' | 'full-stack' | 'general';
  salaryMin: number | null;
  stackPreference: string[];
  isActive: boolean;
  lastRun: string | null;
  error: string | null;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
}

export interface DatabaseSchema {
  searches: SavedSearch[];
  jobs: Job[];
  telegramConfig: TelegramConfig;
  resumeText?: string;
  geminiApiKey?: string;
}
