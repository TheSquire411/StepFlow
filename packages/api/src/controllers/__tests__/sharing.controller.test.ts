import { Request, Response } from 'express';
import { SharingController } from '../sharing.controller';
import { SharingService } from '../../services/sharing.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// Mock the sharing service
jest.mock('../../services/sharing.service');

describe('SharingController', () => {
  let sharingController: SharingController;
  let mockSharingService: jest.Mocked<SharingService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockSharingService = new SharingService({} as any) as jest.Mocked<SharingService>;
    sharingController = new SharingController(mockSharingService);

    mockRequest = {
      user: { id: 'user-123' },
      params: {},
      body: {},
      headers: {},
      get: jest.fn(),
      ip: '192.168.1.1',
      connection: { remoteAddress: '192.168.1.1' } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('createSharingSettings', () => {
    it('should create sharing settings successfully', async () => {
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

      mockRequest.body = {
        guideId: 'guide-123',
        isPublic: true,
        allowedDomains: [],
        passwordProtected: false,
        requireAuth: false,
        allowComments: true,
        allowDownload: false,
        trackAnalytics: true,
        customBranding: false,
      };

      mockSharingService.createSharingSettings.mockResolvedValue(mockSharingSettings);

      await sharingController.createSharingSettings(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockSharingService.createSharingSettings).toHaveBeenCalledWith(
        'user-123',
        mockRequest.body
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSharingSettings,
      });
    });

    it('should handle unauthorized error', async () => {
      mockRequest.body = {
        guideId: 'guide-123',
        isPublic: true,
      };

      mockSharingService.createSharingSettings.mockRejectedValue(
        new Error('Unauthorized: You do not own this guide')
      );

      await sharingController.createSharingSettings(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Unauthorized: You do not own this guide',
      });
    });

    it('should handle guide not found error', async () => {
      mockRequest.body = {
        guideId: 'guide-123',
        isPublic: true,
      };

      mockSharingService.createSharingSettings.mockRejectedValue(
        new Error('Guide not found')
      );

      await sharingController.createSharingSettings(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not Found',
        message: 'Guide not found',
      });
    });

    it('should handle validation errors', async () => {
      mockRequest.body = {
        // Missing required fields
      };

      await sharingController.createSharingSettings(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create sharing settings',
      });
    });
  });

  describe('getSharingSettings', () => {
    it('should get sharing settings successfully', async () => {
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

      mockRequest.params = { guideId: 'guide-123' };
      mockSharingService.getSharingSettings.mockResolvedValue(mockSharingSettings);

      await sharingController.getSharingSettings(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockSharingService.getSharingSettings).toHaveBeenCalledWith('guide-123', 'user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSharingSettings,
      });
    });

    it('should handle sharing settings not found', async () => {
      mockRequest.params = { guideId: 'guide-123' };
      mockSharingService.getSharingSettings.mockResolvedValue(null);

      await sharingController.getSharingSettings(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not Found',
        message: 'Sharing settings not found or access denied',
      });
    });
  });

  describe('verifyShareAccess', () => {
    it('should verify share access successfully', async () => {
      mockRequest.params = { shareToken: 'abc123' };
      mockRequest.body = { guideId: 'guide-123' };
      (mockRequest.get as jest.Mock).mockReturnValue('Mozilla/5.0');

      const mockAccessResult = {
        allowed: true,
        guideId: 'guide-123',
        requiresAuth: false,
      };

      mockSharingService.verifyShareAccess.mockResolvedValue(mockAccessResult);

      await sharingController.verifyShareAccess(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockSharingService.verifyShareAccess).toHaveBeenCalledWith(
        'https://stepflow.app/share/abc123',
        { guideId: 'guide-123' },
        'Mozilla/5.0',
        '192.168.1.1',
        undefined
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          guideId: 'guide-123',
          requiresAuth: false,
        },
      });
    });

    it('should handle access denied', async () => {
      mockRequest.params = { shareToken: 'abc123' };
      mockRequest.body = { guideId: 'guide-123' };
      (mockRequest.get as jest.Mock).mockReturnValue('Mozilla/5.0');

      const mockAccessResult = {
        allowed: false,
      };

      mockSharingService.verifyShareAccess.mockResolvedValue(mockAccessResult);

      await sharingController.verifyShareAccess(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access Denied',
        message: 'You do not have permission to access this guide',
      });
    });

    it('should handle password required', async () => {
      mockRequest.params = { shareToken: 'abc123' };
      mockRequest.body = { guideId: 'guide-123' };
      (mockRequest.get as jest.Mock).mockReturnValue('Mozilla/5.0');

      const mockAccessResult = {
        allowed: false,
        requiresAuth: true,
      };

      mockSharingService.verifyShareAccess.mockResolvedValue(mockAccessResult);

      await sharingController.verifyShareAccess(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication Required',
        message: 'Password required to access this guide',
        requiresAuth: true,
      });
    });
  });

  describe('createSharePermission', () => {
    it('should create share permission successfully', async () => {
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

      mockRequest.params = { guideId: 'guide-123' };
      mockRequest.body = {
        userId: 'user-456',
        role: 'viewer',
      };

      mockSharingService.createSharePermission.mockResolvedValue(mockPermission);

      await sharingController.createSharePermission(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockSharingService.createSharePermission).toHaveBeenCalledWith(
        'guide-123',
        'user-123',
        {
          guideId: 'guide-123',
          userId: 'user-456',
          role: 'viewer',
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermission,
      });
    });

    it('should handle unauthorized permission creation', async () => {
      mockRequest.params = { guideId: 'guide-123' };
      mockRequest.body = {
        userId: 'user-456',
        role: 'viewer',
      };

      mockSharingService.createSharePermission.mockRejectedValue(
        new Error('Unauthorized: Cannot grant permissions for this guide')
      );

      await sharingController.createSharePermission(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized',
        message: 'Unauthorized: Cannot grant permissions for this guide',
      });
    });
  });

  describe('generateEmbedCode', () => {
    it('should generate embed code successfully', async () => {
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

      mockRequest.params = { guideId: 'guide-123' };
      mockRequest.body = {
        width: 800,
        height: 600,
        showTitle: true,
        showProgress: true,
        showControls: true,
        autoPlay: false,
        theme: 'light',
      };

      const customEmbedCode = '<iframe src="https://stepflow.app/share/abc123/embed" width="800" height="600" frameborder="0" allowfullscreen></iframe>';

      mockSharingService.getSharingSettings.mockResolvedValue(mockSharingSettings);
      mockSharingService.generateCustomEmbedCode.mockReturnValue(customEmbedCode);

      await sharingController.generateEmbedCode(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockSharingService.getSharingSettings).toHaveBeenCalledWith('guide-123', 'user-123');
      expect(mockSharingService.generateCustomEmbedCode).toHaveBeenCalledWith(
        'https://stepflow.app/share/abc123',
        mockRequest.body
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          embedCode: customEmbedCode,
          shareUrl: 'https://stepflow.app/share/abc123',
        },
      });
    });

    it('should handle sharing settings not found for embed code generation', async () => {
      mockRequest.params = { guideId: 'guide-123' };
      mockRequest.body = {
        width: 800,
        height: 600,
        showTitle: true,
        showProgress: true,
        showControls: true,
        autoPlay: false,
        theme: 'light',
      };

      mockSharingService.getSharingSettings.mockResolvedValue(null);

      await sharingController.generateEmbedCode(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not Found',
        message: 'Sharing settings not found or access denied',
      });
    });
  });
});