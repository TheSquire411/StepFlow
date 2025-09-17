import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  CreateUserSchema,
  UpdateUserSchema,
  LoginSchema,
  UserPreferencesSchema,
} from '../user.model.js';
import {
  RecordingSchema,
  CreateRecordingSchema,
  CapturedStepSchema,
  RecordingMetadataSchema,
} from '../recording.model.js';
import {
  GuideSchema,
  CreateGuideSchema,
  ProcessedStepSchema,
  AnnotationSchema,
  GuideSettingsSchema,
} from '../guide.model.js';
import {
  SharingSettingsSchema,
  CreateSharingSettingsSchema,
  SharePermissionSchema,
  CreateSharePermissionSchema,
} from '../sharing.model.js';
import { validateData, ValidationError } from '../../utils/validation.js';

describe('User Models', () => {
  it('should validate a complete user object', () => {
    const validUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      passwordHash: 'hashedpassword123',
      firstName: 'John',
      lastName: 'Doe',
      planType: 'free' as const,
      emailVerified: true,
      preferences: {
        defaultVoice: 'en-US-standard',
        defaultLanguage: 'en',
        brandColors: ['#ff0000', '#00ff00'],
        autoGenerateNarration: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => validateData(UserSchema, validUser)).not.toThrow();
  });

  it('should validate user creation input', () => {
    const createUserInput = {
      email: 'newuser@example.com',
      password: 'SecurePass123',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    expect(() => validateData(CreateUserSchema, createUserInput)).not.toThrow();
  });

  it('should reject invalid email format', () => {
    const invalidUser = {
      email: 'invalid-email',
      password: 'SecurePass123',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    expect(() => validateData(CreateUserSchema, invalidUser)).toThrow(ValidationError);
  });

  it('should reject weak password', () => {
    const invalidUser = {
      email: 'test@example.com',
      password: '123',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    expect(() => validateData(CreateUserSchema, invalidUser)).toThrow(ValidationError);
  });
});

describe('Recording Models', () => {
  it('should validate a complete recording object', () => {
    const validRecording = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Test Recording',
      description: 'A test recording',
      duration: 120,
      fileUrl: 'https://example.com/recording.mp4',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      fileSize: 1024000,
      metadata: {
        browserInfo: {
          name: 'Chrome',
          version: '91.0',
          userAgent: 'Mozilla/5.0...',
        },
        screenResolution: {
          width: 1920,
          height: 1080,
        },
      },
      steps: [],
      status: 'completed' as const,
      processingProgress: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => validateData(RecordingSchema, validRecording)).not.toThrow();
  });

  it('should validate captured step', () => {
    const validStep = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: 5000,
      action: 'click' as const,
      coordinates: { x: 100, y: 200 },
      screenshotUrl: 'https://example.com/screenshot.jpg',
      elementSelector: '#button-id',
    };

    expect(() => validateData(CapturedStepSchema, validStep)).not.toThrow();
  });

  it('should reject invalid recording status', () => {
    const invalidRecording = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Test Recording',
      fileUrl: 'https://example.com/recording.mp4',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      status: 'invalid-status',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => validateData(RecordingSchema, invalidRecording)).toThrow(ValidationError);
  });
});

describe('Guide Models', () => {
  it('should validate a complete guide object', () => {
    const validGuide = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      recordingId: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Test Guide',
      description: 'A comprehensive test guide',
      category: 'Tutorial',
      tags: ['beginner', 'web'],
      steps: [],
      settings: {
        theme: 'light' as const,
        showStepNumbers: true,
        autoPlay: false,
      },
      status: 'published' as const,
      language: 'en',
      difficulty: 'beginner' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => validateData(GuideSchema, validGuide)).not.toThrow();
  });

  it('should validate processed step with annotations', () => {
    const validStep = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      order: 1,
      title: 'Click the button',
      description: 'Click the red button to proceed',
      screenshotUrl: 'https://example.com/step1.jpg',
      annotations: [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          type: 'highlight' as const,
          coordinates: { x: 100, y: 200 },
          style: { color: '#ff0000', thickness: 2, opacity: 0.8 },
          createdAt: new Date(),
        },
      ],
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => validateData(ProcessedStepSchema, validStep)).not.toThrow();
  });

  it('should validate guide creation input', () => {
    const createGuideInput = {
      recordingId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'New Guide',
      description: 'A new guide description',
      category: 'Tutorial',
      tags: ['test'],
      language: 'en',
      difficulty: 'intermediate' as const,
    };

    expect(() => validateData(CreateGuideSchema, createGuideInput)).not.toThrow();
  });
});

describe('Sharing Models', () => {
  it('should validate sharing settings', () => {
    const validSharingSettings = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      guideId: '123e4567-e89b-12d3-a456-426614174001',
      isPublic: true,
      shareUrl: 'https://stepflow.app/share/abc123',
      embedCode: '<iframe src="https://stepflow.app/share/abc123/embed"></iframe>',
      allowedDomains: ['https://example.com'],
      passwordProtected: false,
      requireAuth: false,
      allowComments: true,
      allowDownload: false,
      trackAnalytics: true,
      customBranding: false,
      currentViews: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => validateData(SharingSettingsSchema, validSharingSettings)).not.toThrow();
  });

  it('should validate share permission', () => {
    const validPermission = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      guideId: '123e4567-e89b-12d3-a456-426614174001',
      userId: '123e4567-e89b-12d3-a456-426614174002',
      role: 'viewer' as const,
      grantedBy: '123e4567-e89b-12d3-a456-426614174003',
      grantedAt: new Date(),
      isActive: true,
    };

    expect(() => validateData(SharePermissionSchema, validPermission)).not.toThrow();
  });

  it('should validate share permission creation with email', () => {
    const createPermissionInput = {
      guideId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'user@example.com',
      role: 'editor' as const,
    };

    expect(() => validateData(CreateSharePermissionSchema, createPermissionInput)).not.toThrow();
  });

  it('should reject share permission without user or email', () => {
    const invalidPermission = {
      guideId: '123e4567-e89b-12d3-a456-426614174000',
      role: 'viewer' as const,
    };

    expect(() => validateData(CreateSharePermissionSchema, invalidPermission)).toThrow(ValidationError);
  });
});

describe('Validation Edge Cases', () => {
  it('should handle empty strings appropriately', () => {
    const invalidUser = {
      email: '',
      password: 'SecurePass123',
      firstName: '',
      lastName: 'Smith',
    };

    expect(() => validateData(CreateUserSchema, invalidUser)).toThrow(ValidationError);
  });

  it('should handle null and undefined values', () => {
    const invalidData = {
      email: null,
      password: undefined,
      firstName: 'Jane',
      lastName: 'Smith',
    };

    expect(() => validateData(CreateUserSchema, invalidData)).toThrow(ValidationError);
  });

  it('should validate array fields correctly', () => {
    const validGuideSettings = {
      brandColors: ['#ff0000', '#00ff00', '#0000ff'],
      showStepNumbers: true,
    };

    expect(() => validateData(GuideSettingsSchema.partial(), validGuideSettings)).not.toThrow();
  });

  it('should reject invalid UUID format', () => {
    const invalidGuid = {
      recordingId: 'not-a-uuid',
      title: 'Test Guide',
    };

    expect(() => validateData(CreateGuideSchema, invalidGuid)).toThrow(ValidationError);
  });
});