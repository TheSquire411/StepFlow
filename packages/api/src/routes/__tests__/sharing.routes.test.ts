import request from 'supertest';
import express from 'express';
import sharingRoutes from '../sharing.routes';
import { SharingService } from '../../services/sharing.service';
import { authenticateToken } from '../../middleware/auth.middleware';

// Mock dependencies
jest.mock('../../services/sharing.service');
jest.mock('../../middleware/auth.middleware');
jest.mock('../../config/database', () => ({
  pool: {}
}));

const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('Sharing Routes', () => {
  let app: express.Application;
  let mockSharingService: jest.Mocked<SharingService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    mockAuthenticateToken.mockImplementation((req: any, res, next) => {
      req.user = { id: 'user-123' };
      next();
    });

    app.use('/api/sharing', sharingRoutes);

    mockSharingService = new SharingService({} as any) as jest.Mocked<SharingService>;
    jest.clearAllMocks();
  });

  describe('POST /api/sharing/guides/:guideId/settings', () => {
    it('should create sharing settings', async () => {
      const mockSharingSettings = {
        id: 'sharing-123',
        guideId: 'guide-123',
        isPublic: true,
        shareUrl: 'https://stepflow.app/share/abc123',
        embedCode: '<iframe>...</iframe>',
        allowedDomains: [],
        passwordProtected: false,
        passwordHash: undefined,
        requireAuth: false,
        allowComments: true,
        allowDownload: false,
        trackAnalytics: true,
        customBranding: false,
        expiresAt: undefined,
        maxViews: undefined,
        currentViews: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // We need to mock the service at the module level since it's instantiated in the routes
      const mockCreateSharingSettings = jest.fn().mockResolvedValue(mockSharingSettings);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        createSharingSettings: mockCreateSharingSettings,
      } as any));

      const response = await request(app)
        .post('/api/sharing/guides/guide-123/settings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          guideId: 'guide-123',
          isPublic: true,
          allowedDomains: [],
          passwordProtected: false,
          requireAuth: false,
          allowComments: true,
          allowDownload: false,
          trackAnalytics: true,
          customBranding: false,
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'sharing-123',
          guideId: 'guide-123',
          isPublic: true,
        }),
      });
    });

    it('should require authentication', async () => {
      mockAuthenticateToken.mockImplementation((req: any, res, next) => {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'Access token required',
            timestamp: new Date().toISOString()
          }
        });
      });

      const response = await request(app)
        .post('/api/sharing/guides/guide-123/settings')
        .send({
          guideId: 'guide-123',
          isPublic: true,
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_001');
    });
  });

  describe('GET /api/sharing/guides/:guideId/settings', () => {
    it('should get sharing settings', async () => {
      const mockSharingSettings = {
        id: 'sharing-123',
        guideId: 'guide-123',
        isPublic: true,
        shareUrl: 'https://stepflow.app/share/abc123',
        embedCode: '<iframe>...</iframe>',
        allowedDomains: [],
        passwordProtected: false,
        passwordHash: undefined,
        requireAuth: false,
        allowComments: true,
        allowDownload: false,
        trackAnalytics: true,
        customBranding: false,
        expiresAt: undefined,
        maxViews: undefined,
        currentViews: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockGetSharingSettings = jest.fn().mockResolvedValue(mockSharingSettings);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        getSharingSettings: mockGetSharingSettings,
      } as any));

      const response = await request(app)
        .get('/api/sharing/guides/guide-123/settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'sharing-123',
          guideId: 'guide-123',
        }),
      });
    });

    it('should return 404 when sharing settings not found', async () => {
      const mockGetSharingSettings = jest.fn().mockResolvedValue(null);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        getSharingSettings: mockGetSharingSettings,
      } as any));

      const response = await request(app)
        .get('/api/sharing/guides/guide-123/settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Not Found',
        message: 'Sharing settings not found or access denied',
      });
    });
  });

  describe('POST /api/sharing/guides/:guideId/permissions', () => {
    it('should create share permission', async () => {
      const mockPermission = {
        id: 'permission-123',
        guideId: 'guide-123',
        userId: 'user-456',
        email: undefined,
        role: 'viewer' as const,
        grantedBy: 'user-123',
        grantedAt: new Date(),
        expiresAt: undefined,
        isActive: true,
      };

      const mockCreateSharePermission = jest.fn().mockResolvedValue(mockPermission);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        createSharePermission: mockCreateSharePermission,
      } as any));

      const response = await request(app)
        .post('/api/sharing/guides/guide-123/permissions')
        .set('Authorization', 'Bearer valid-token')
        .send({
          userId: 'user-456',
          role: 'viewer',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: 'permission-123',
          guideId: 'guide-123',
          role: 'viewer',
        }),
      });
    });
  });

  describe('POST /api/sharing/verify/:shareToken', () => {
    it('should verify share access (public endpoint)', async () => {
      const mockAccessResult = {
        allowed: true,
        guideId: 'guide-123',
        requiresAuth: false,
      };

      const mockVerifyShareAccess = jest.fn().mockResolvedValue(mockAccessResult);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        verifyShareAccess: mockVerifyShareAccess,
      } as any));

      const response = await request(app)
        .post('/api/sharing/verify/abc123')
        .send({
          guideId: 'guide-123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          guideId: 'guide-123',
          requiresAuth: false,
        },
      });
    });

    it('should handle access denied', async () => {
      const mockAccessResult = {
        allowed: false,
      };

      const mockVerifyShareAccess = jest.fn().mockResolvedValue(mockAccessResult);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        verifyShareAccess: mockVerifyShareAccess,
      } as any));

      const response = await request(app)
        .post('/api/sharing/verify/abc123')
        .send({
          guideId: 'guide-123',
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Access Denied',
        message: 'You do not have permission to access this guide',
      });
    });

    it('should handle password required', async () => {
      const mockAccessResult = {
        allowed: false,
        requiresAuth: true,
      };

      const mockVerifyShareAccess = jest.fn().mockResolvedValue(mockAccessResult);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        verifyShareAccess: mockVerifyShareAccess,
      } as any));

      const response = await request(app)
        .post('/api/sharing/verify/abc123')
        .send({
          guideId: 'guide-123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        error: 'Authentication Required',
        message: 'Password required to access this guide',
        requiresAuth: true,
      });
    });
  });

  describe('POST /api/sharing/guides/:guideId/embed', () => {
    it('should generate custom embed code', async () => {
      const mockSharingSettings = {
        id: 'sharing-123',
        guideId: 'guide-123',
        isPublic: true,
        shareUrl: 'https://stepflow.app/share/abc123',
        embedCode: '<iframe>...</iframe>',
        allowedDomains: [],
        passwordProtected: false,
        passwordHash: undefined,
        requireAuth: false,
        allowComments: true,
        allowDownload: false,
        trackAnalytics: true,
        customBranding: false,
        expiresAt: undefined,
        maxViews: undefined,
        currentViews: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const customEmbedCode = '<iframe src="https://stepflow.app/share/abc123/embed" width="800" height="600" frameborder="0" allowfullscreen></iframe>';

      const mockGetSharingSettings = jest.fn().mockResolvedValue(mockSharingSettings);
      const mockGenerateCustomEmbedCode = jest.fn().mockReturnValue(customEmbedCode);
      
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        getSharingSettings: mockGetSharingSettings,
        generateCustomEmbedCode: mockGenerateCustomEmbedCode,
      } as any));

      const response = await request(app)
        .post('/api/sharing/guides/guide-123/embed')
        .set('Authorization', 'Bearer valid-token')
        .send({
          width: 800,
          height: 600,
          showTitle: true,
          showProgress: true,
          showControls: true,
          autoPlay: false,
          theme: 'light',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          embedCode: customEmbedCode,
          shareUrl: 'https://stepflow.app/share/abc123',
        },
      });
    });
  });

  describe('GET /api/sharing/guide/:shareToken', () => {
    it('should get shared guide data (public endpoint)', async () => {
      const mockAccessResult = {
        allowed: true,
        guideId: 'guide-123',
        requiresAuth: false,
      };

      const mockVerifyShareAccess = jest.fn().mockResolvedValue(mockAccessResult);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        verifyShareAccess: mockVerifyShareAccess,
      } as any));

      const response = await request(app)
        .get('/api/sharing/guide/abc123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          guideId: 'guide-123',
          shareUrl: 'https://stepflow.app/share/abc123',
        },
      });
    });

    it('should handle access denied for shared guide', async () => {
      const mockAccessResult = {
        allowed: false,
      };

      const mockVerifyShareAccess = jest.fn().mockResolvedValue(mockAccessResult);
      (SharingService as jest.MockedClass<typeof SharingService>).mockImplementation(() => ({
        verifyShareAccess: mockVerifyShareAccess,
      } as any));

      const response = await request(app)
        .get('/api/sharing/guide/abc123');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        error: 'Access Denied',
        message: 'You do not have permission to access this guide',
      });
    });
  });
});