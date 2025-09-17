// Guide editor types
export interface Guide {
  id: string;
  userId: string;
  recordingId: string;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  estimatedDuration?: number;
  steps: ProcessedStep[];
  settings: GuideSettings;
  sharing: SharingSettings;
  analytics: GuideAnalytics;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessedStep {
  id: string;
  order: number;
  title: string;
  description: string;
  screenshotUrl: string;
  annotations: Annotation[];
  audioUrl?: string;
}

export interface Annotation {
  id: string;
  type: 'highlight' | 'arrow' | 'blur' | 'text' | 'rectangle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  text?: string;
  strokeWidth?: number;
  rotation?: number;
}

export interface GuideSettings {
  theme: string;
  brandColors: string[];
  logoUrl?: string;
  showStepNumbers: boolean;
  autoPlay: boolean;
  fontFamily?: string;
  fontSize?: number;
}

export interface SharingSettings {
  isPublic: boolean;
  shareUrl: string;
  embedCode: string;
  allowedDomains: string[];
  passwordProtected: boolean;
  expiresAt?: Date;
  permissions: SharePermission[];
}

export interface SharePermission {
  userId?: string;
  email?: string;
  role: 'viewer' | 'editor' | 'admin';
  grantedAt: Date;
}

export interface GuideAnalytics {
  views: number;
  uniqueViews: number;
  totalViews: number;
  completionRate: number;
  averageTimeSpent: number;
  lastViewed?: Date;
}

export interface BrandCustomization {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  fontFamily: string;
  fontSize: number;
}

export interface EditorState {
  selectedStep: number;
  selectedAnnotation?: string;
  isEditing: boolean;
  isDragging: boolean;
  tool: 'select' | 'highlight' | 'arrow' | 'blur' | 'text' | 'rectangle';
}

export interface GuideFilters {
  search?: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}