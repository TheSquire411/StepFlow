// Core type definitions for StepFlow platform
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  planType: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface Recording {
  id: string;
  userId: string;
  title: string;
  description?: string;
  duration: number;
  fileUrl: string;
  thumbnailUrl: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface Guide {
  id: string;
  userId: string;
  recordingId: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}