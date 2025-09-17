import { Pool } from 'pg';
import { SharingService } from '../sharing.service';
import { 
  CreateSharingSettingsInput,
  UpdateSharingSettingsInput,
  CreateSharePermissionInput,
  UpdateSharePermissionInput,
  ShareAccessInput,
  EmbedConfiguration
} from '../../models/sharing.model';

// Mock dependencies
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

const mockBcrypt = {
  hash: jest.fn(),
  compare: jest.fn(),
};

describe('SharingService', () => {
  let sharingService: SharingService;
  let mockDb: jest.Mocked<Pool>;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockDb = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
    } as any;

    sharingService = new SharingService(mockDb);
    
    // Reset mocks
    jest.clearAllMocks();
    mockBcrypt.hash.mockResolvedValue('hashed-password' as never);
    mockBcrypt.compare.mockResolvedValue(true as never);
  });

  describe('createSharingSettings', () => {
    const userId = 'user-123';
    const input: CreateSharingSettingsInput = {
      guideId: 'guide-123',
      isPublic: true,
      allowedDomains: ['https://example.com'],
      passwordProtected: true,
      password: 'test-password',
      requireAuth: false,
      allowComments: true,
      allowDownload: false,
      trackAnalytics: true,
      customBranding: false,
    };

    it('should create sharing settings successfully', async () => {
      // Mock guide ownership check
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 'guide-123', user_id: userId }] })
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'sharing-123',
            guide_id: 'guide-123',
            is_public: true,
            share_url: 'https://stepflow.app/share/abc123',
            embed_code: '<iframe>...</iframe>',
            allowed_domains: ['https://example.com'],
            password_protected: true,
            password_hash: 'hashed-password',
            require_auth: false,
            allow_comments: true,
            allow_download: false,
            track_analytics: true,
            custom_branding: false,
            expires_at: null,
            max_views: null,
            current_views: 0,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          }] 
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await sharingService.createSharingSettings(userId, input);

      expect(result).toMatchObject({
        id: 'sharing-123',
        guideId: 'guide-123',
        isPublic: true,
        passwordProtected: true,
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('test-password', 12);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw error if user does not own guide', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 'guide-123', user_id: 'other-user' }] });

      await expect(sharingService.createSharingSettings(userId, input))
        .rejects.toThrow('Unauthorized: You do not own this guide');
    });

    it('should throw error if guide not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] });

      await expect(sharingService.createSharingSettings(userId, input))
        .rejects.toThrow('Guide not found');
    });
  });

  describe('getSharingSettings', () => {
    const guideId = 'guide-123';
    const userId = 'user-123';

    it('should return sharing settings for guide owner', async () => {
      const mockRow = {
        id: 'sharing-123',
        guide_id: 'guide-123',
        guide_owner_id: userId,
        is_public: true,
        share_url: 'https://stepflow.app/share/abc123',
        embed_code: '<iframe>...</iframe>',
        allowed_domains: [],
        password_protected: false,
        password_hash: null,
        require_auth: false,
        allow_comments: true,
        allow_download: false,
        track_analytics: true,
        custom_branding: false,
        expires_at: null,
        max_views: null,
        current_views: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow] } as any);

      const result = await sharingService.getSharingSettings(guideId, userId);

      expect(result).toMatchObject({
        id: 'sharing-123',
        guideId: 'guide-123',
        isPublic: true,
      });
    });

    it('should return null if sharing settings not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await sharingService.getSharingSettings(guideId, userId);

      expect(result).toBeNull();
    });

    it('should return null if user has no permission for private guide', async () => {
      const mockRow = {
        id: 'sharing-123',
        guide_id: 'guide-123',
        guide_owner_id: 'other-user',
        is_public: false,
        // ... other fields
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockRow] } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // No permissions

      const result = await sharingService.getSharingSettings(guideId, userId);

      expect(result).toBeNull();
    });
  });

  describe('createSharePermission', () => {
    const guideId = 'guide-123';
    const grantedBy = 'user-123';
    const input: CreateSharePermissionInput = {
      guideId,
      userId: 'user-456',
      role: 'viewer',
    };

    it('should create share permission successfully', async () => {
      // Mock permission check (user owns guide)
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: guideId }] } as any);

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'permission-123',
            guide_id: guideId,
            user_id: 'user-456',
            email: null,
            role: 'viewer',
            granted_by: grantedBy,
            granted_at: new Date(),
            expires_at: null,
            is_active: true
          }] 
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await sharingService.createSharePermission(guideId, grantedBy, input);

      expect(result).toMatchObject({
        id: 'permission-123',
        guideId,
        userId: 'user-456',
        role: 'viewer',
      });
    });

    it('should throw error if user cannot grant permissions', async () => {
      // Mock permission check (user doesn't own guide and has no admin permission)
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any) // Not owner
        .mockResolvedValueOnce({ rows: [] } as any); // Not admin

      await expect(sharingService.createSharePermission(guideId, grantedBy, input))
        .rejects.toThrow('Unauthorized: Cannot grant permissions for this guide');
    });
  });

  describe('verifyShareAccess', () => {
    const shareUrl = 'https://stepflow.app/share/abc123';
    const input: ShareAccessInput = {
      guideId: 'guide-123',
    };
    const userAgent = 'Mozilla/5.0';
    const ipAddress = '192.168.1.1';

    it('should allow access to public guide', async () => {
      const mockSettings = {
        id: 'sharing-123',
        guide_id: 'guide-123',
        title: 'Test Guide',
        status: 'published',
        is_public: true,
        expires_at: null,
        max_views: null,
        current_views: 0,
        allowed_domains: [],
        password_protected: false,
        track_analytics: true,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSettings] }) // Get settings
        .mockResolvedValueOnce({ rows: [] }) // Log access
        .mockResolvedValueOnce({ rows: [] }) // Increment views
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await sharingService.verifyShareAccess(
        shareUrl,
        input,
        userAgent,
        ipAddress
      );

      expect(result).toEqual({
        allowed: true,
        guideId: 'guide-123',
        requiresAuth: false,
      });
    });

    it('should deny access to unpublished guide', async () => {
      const mockSettings = {
        id: 'sharing-123',
        guide_id: 'guide-123',
        title: 'Test Guide',
        status: 'draft',
        is_public: true,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSettings] }); // Get settings

      const result = await sharingService.verifyShareAccess(
        shareUrl,
        input,
        userAgent,
        ipAddress
      );

      expect(result).toEqual({ allowed: false });
    });

    it('should deny access to expired guide', async () => {
      const mockSettings = {
        id: 'sharing-123',
        guide_id: 'guide-123',
        title: 'Test Guide',
        status: 'published',
        is_public: true,
        expires_at: new Date(Date.now() - 86400000), // Yesterday
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSettings] }); // Get settings

      const result = await sharingService.verifyShareAccess(
        shareUrl,
        input,
        userAgent,
        ipAddress
      );

      expect(result).toEqual({ allowed: false });
    });

    it('should require password for password-protected guide', async () => {
      const mockSettings = {
        id: 'sharing-123',
        guide_id: 'guide-123',
        title: 'Test Guide',
        status: 'published',
        is_public: true,
        expires_at: null,
        max_views: null,
        current_views: 0,
        allowed_domains: [],
        password_protected: true,
        password_hash: 'hashed-password',
        track_analytics: true,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSettings] }); // Get settings

      const result = await sharingService.verifyShareAccess(
        shareUrl,
        { ...input, password: undefined },
        userAgent,
        ipAddress
      );

      expect(result).toEqual({ 
        allowed: false, 
        requiresAuth: true 
      });
    });

    it('should allow access with correct password', async () => {
      const mockSettings = {
        id: 'sharing-123',
        guide_id: 'guide-123',
        title: 'Test Guide',
        status: 'published',
        is_public: true,
        expires_at: null,
        max_views: null,
        current_views: 0,
        allowed_domains: [],
        password_protected: true,
        password_hash: 'hashed-password',
        track_analytics: true,
        require_auth: false,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSettings] }) // Get settings
        .mockResolvedValueOnce({ rows: [] }) // Log access
        .mockResolvedValueOnce({ rows: [] }) // Increment views
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await sharingService.verifyShareAccess(
        shareUrl,
        { ...input, password: 'correct-password' },
        userAgent,
        ipAddress
      );

      expect(result).toEqual({
        allowed: true,
        guideId: 'guide-123',
        requiresAuth: false,
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password');
    });
  });

  describe('generateCustomEmbedCode', () => {
    const shareUrl = 'https://stepflow.app/share/abc123';

    it('should generate basic embed code', async () => {
      const config: EmbedConfiguration = {
        width: 800,
        height: 600,
        showTitle: true,
        showProgress: true,
        showControls: true,
        autoPlay: false,
        theme: 'light',
      };

      const result = sharingService.generateCustomEmbedCode(shareUrl, config);

      expect(result).toBe(
        '<iframe src="https://stepflow.app/share/abc123/embed" width="800" height="600" frameborder="0" allowfullscreen></iframe>'
      );
    });

    it('should generate embed code with custom parameters', async () => {
      const config: EmbedConfiguration = {
        width: 1000,
        height: 700,
        showTitle: false,
        showProgress: false,
        showControls: true,
        autoPlay: true,
        theme: 'dark',
      };

      const result = sharingService.generateCustomEmbedCode(shareUrl, config);

      expect(result).toContain('width="1000"');
      expect(result).toContain('height="700"');
      expect(result).toContain('hideTitle=true');
      expect(result).toContain('hideProgress=true');
      expect(result).toContain('autoPlay=true');
      expect(result).toContain('theme=dark');
    });

    it('should include custom CSS when provided', async () => {
      const config: EmbedConfiguration = {
        width: 800,
        height: 600,
        showTitle: true,
        showProgress: true,
        showControls: true,
        autoPlay: false,
        theme: 'light',
        customCss: '.custom { color: red; }',
      };

      const result = sharingService.generateCustomEmbedCode(shareUrl, config);

      expect(result).toContain('<style>.custom { color: red; }</style>');
    });
  });
});