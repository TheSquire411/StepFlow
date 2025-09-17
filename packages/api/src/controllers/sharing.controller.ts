import { Request, Response } from 'express';
import { SharingService } from '../services/sharing.service';
import { 
  CreateSharingSettingsSchema,
  UpdateSharingSettingsSchema,
  CreateSharePermissionSchema,
  UpdateSharePermissionSchema,
  ShareAccessInputSchema,
  EmbedConfigurationSchema
} from '../models/sharing.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class SharingController {
  constructor(private sharingService: SharingService) {}

  /**
   * Create or update sharing settings for a guide
   */
  createSharingSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const validatedInput = CreateSharingSettingsSchema.parse(req.body);

      const sharingSettings = await this.sharingService.createSharingSettings(
        userId,
        validatedInput
      );

      res.status(201).json({
        success: true,
        data: sharingSettings
      });
    } catch (error) {
      console.error('Error creating sharing settings:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          res.status(403).json({
            success: false,
            error: 'Unauthorized',
            message: error.message
          });
          return;
        }
        
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create sharing settings'
      });
    }
  };

  /**
   * Get sharing settings for a guide
   */
  getSharingSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { guideId } = req.params;
      const userId = req.user?.id;

      const sharingSettings = await this.sharingService.getSharingSettings(guideId, userId);

      if (!sharingSettings) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Sharing settings not found or access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: sharingSettings
      });
    } catch (error) {
      console.error('Error getting sharing settings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get sharing settings'
      });
    }
  };

  /**
   * Update sharing settings for a guide
   */
  updateSharingSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { guideId } = req.params;
      const userId = req.user!.id;
      const validatedInput = UpdateSharingSettingsSchema.parse(req.body);

      const sharingSettings = await this.sharingService.updateSharingSettings(
        guideId,
        userId,
        validatedInput
      );

      res.json({
        success: true,
        data: sharingSettings
      });
    } catch (error) {
      console.error('Error updating sharing settings:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          res.status(403).json({
            success: false,
            error: 'Unauthorized',
            message: error.message
          });
          return;
        }
        
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update sharing settings'
      });
    }
  };

  /**
   * Create share permission for a user
   */
  createSharePermission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { guideId } = req.params;
      const grantedBy = req.user!.id;
      const validatedInput = CreateSharePermissionSchema.parse({
        ...req.body,
        guideId
      });

      const permission = await this.sharingService.createSharePermission(
        guideId,
        grantedBy,
        validatedInput
      );

      res.status(201).json({
        success: true,
        data: permission
      });
    } catch (error) {
      console.error('Error creating share permission:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          res.status(403).json({
            success: false,
            error: 'Unauthorized',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create share permission'
      });
    }
  };

  /**
   * Get share permissions for a guide
   */
  getSharePermissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { guideId } = req.params;
      const userId = req.user!.id;

      const permissions = await this.sharingService.getSharePermissions(guideId, userId);

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('Error getting share permissions:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          res.status(403).json({
            success: false,
            error: 'Unauthorized',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get share permissions'
      });
    }
  };

  /**
   * Update share permission
   */
  updateSharePermission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { permissionId } = req.params;
      const userId = req.user!.id;
      const validatedInput = UpdateSharePermissionSchema.parse(req.body);

      const permission = await this.sharingService.updateSharePermission(
        permissionId,
        userId,
        validatedInput
      );

      res.json({
        success: true,
        data: permission
      });
    } catch (error) {
      console.error('Error updating share permission:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          res.status(403).json({
            success: false,
            error: 'Unauthorized',
            message: error.message
          });
          return;
        }
        
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update share permission'
      });
    }
  };

  /**
   * Delete share permission
   */
  deleteSharePermission = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { permissionId } = req.params;
      const userId = req.user!.id;

      await this.sharingService.deleteSharePermission(permissionId, userId);

      res.json({
        success: true,
        message: 'Share permission deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting share permission:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized')) {
          res.status(403).json({
            success: false,
            error: 'Unauthorized',
            message: error.message
          });
          return;
        }
        
        if (error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            error: 'Not Found',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete share permission'
      });
    }
  };

  /**
   * Verify access to a shared guide (public endpoint)
   */
  verifyShareAccess = async (req: Request, res: Response): Promise<void> => {
    try {
      const { shareToken } = req.params;
      const shareUrl = `https://stepflow.app/share/${shareToken}`;
      
      const validatedInput = ShareAccessInputSchema.parse(req.body);
      const userAgent = req.get('User-Agent') || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const referrer = req.get('Referer');

      const accessResult = await this.sharingService.verifyShareAccess(
        shareUrl,
        validatedInput,
        userAgent,
        ipAddress,
        referrer
      );

      if (!accessResult.allowed) {
        if (accessResult.requiresAuth) {
          res.status(401).json({
            success: false,
            error: 'Authentication Required',
            message: 'Password required to access this guide',
            requiresAuth: true
          });
          return;
        }

        res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'You do not have permission to access this guide'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          guideId: accessResult.guideId,
          requiresAuth: accessResult.requiresAuth
        }
      });
    } catch (error) {
      console.error('Error verifying share access:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to verify share access'
      });
    }
  };

  /**
   * Generate custom embed code
   */
  generateEmbedCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { guideId } = req.params;
      const userId = req.user?.id;
      const config = EmbedConfigurationSchema.parse(req.body);

      // Get sharing settings to get the share URL
      const sharingSettings = await this.sharingService.getSharingSettings(guideId, userId);

      if (!sharingSettings) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Sharing settings not found or access denied'
        });
        return;
      }

      const embedCode = this.sharingService.generateCustomEmbedCode(
        sharingSettings.shareUrl,
        config
      );

      res.json({
        success: true,
        data: {
          embedCode,
          shareUrl: sharingSettings.shareUrl
        }
      });
    } catch (error) {
      console.error('Error generating embed code:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to generate embed code'
      });
    }
  };

  /**
   * Get public guide data for shared access (public endpoint)
   */
  getSharedGuide = async (req: Request, res: Response): Promise<void> => {
    try {
      const { shareToken } = req.params;
      const shareUrl = `https://stepflow.app/share/${shareToken}`;
      
      // First verify access
      const userAgent = req.get('User-Agent') || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const referrer = req.get('Referer');

      const accessResult = await this.sharingService.verifyShareAccess(
        shareUrl,
        { guideId: '' }, // We'll get the guideId from the verification
        userAgent,
        ipAddress,
        referrer
      );

      if (!accessResult.allowed || !accessResult.guideId) {
        res.status(403).json({
          success: false,
          error: 'Access Denied',
          message: 'You do not have permission to access this guide'
        });
        return;
      }

      // Get the guide data (this would typically be handled by the guide service)
      // For now, we'll return the guideId and let the frontend handle the guide fetching
      res.json({
        success: true,
        data: {
          guideId: accessResult.guideId,
          shareUrl: shareUrl
        }
      });
    } catch (error) {
      console.error('Error getting shared guide:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to get shared guide'
      });
    }
  };
}