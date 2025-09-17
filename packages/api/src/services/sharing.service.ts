import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { 
  SharingSettings, 
  SharePermission, 
  ShareAccessLog,
  CreateSharingSettingsInput,
  UpdateSharingSettingsInput,
  CreateSharePermissionInput,
  UpdateSharePermissionInput,
  ShareAccessInput,
  EmbedConfiguration
} from '../models/sharing.model';

export class SharingService {
  constructor(private db: Pool) {}

  /**
   * Create sharing settings for a guide
   */
  async createSharingSettings(
    userId: string, 
    input: CreateSharingSettingsInput
  ): Promise<SharingSettings> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify user owns the guide
      const guideCheck = await client.query(
        'SELECT id, user_id FROM guides WHERE id = $1',
        [input.guideId]
      );

      if (guideCheck.rows.length === 0) {
        throw new Error('Guide not found');
      }

      if (guideCheck.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You do not own this guide');
      }

      // Generate unique share URL
      const shareUrl = await this.generateUniqueShareUrl();
      
      // Generate embed code
      const embedCode = this.generateEmbedCode(shareUrl);

      // Hash password if provided
      let passwordHash: string | undefined;
      if (input.passwordProtected && input.password) {
        passwordHash = await bcrypt.hash(input.password, 12);
      }

      const query = `
        INSERT INTO sharing_settings (
          guide_id, is_public, share_url, embed_code, allowed_domains,
          password_protected, password_hash, require_auth, allow_comments,
          allow_download, track_analytics, custom_branding, expires_at, max_views
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (guide_id) DO UPDATE SET
          is_public = EXCLUDED.is_public,
          allowed_domains = EXCLUDED.allowed_domains,
          password_protected = EXCLUDED.password_protected,
          password_hash = EXCLUDED.password_hash,
          require_auth = EXCLUDED.require_auth,
          allow_comments = EXCLUDED.allow_comments,
          allow_download = EXCLUDED.allow_download,
          track_analytics = EXCLUDED.track_analytics,
          custom_branding = EXCLUDED.custom_branding,
          expires_at = EXCLUDED.expires_at,
          max_views = EXCLUDED.max_views,
          updated_at = NOW()
        RETURNING *
      `;

      const values = [
        input.guideId,
        input.isPublic,
        shareUrl,
        embedCode,
        input.allowedDomains,
        input.passwordProtected,
        passwordHash,
        input.requireAuth,
        input.allowComments,
        input.allowDownload,
        input.trackAnalytics,
        input.customBranding,
        input.expiresAt,
        input.maxViews
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return this.mapRowToSharingSettings(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sharing settings for a guide
   */
  async getSharingSettings(guideId: string, userId?: string): Promise<SharingSettings | null> {
    const query = `
      SELECT ss.*, g.user_id as guide_owner_id
      FROM sharing_settings ss
      JOIN guides g ON ss.guide_id = g.id
      WHERE ss.guide_id = $1 AND ss.is_active = true
    `;

    const result = await this.db.query(query, [guideId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // If user is not the owner and settings are not public, check permissions
    if (userId && row.guide_owner_id !== userId && !row.is_public) {
      const hasPermission = await this.checkUserPermission(guideId, userId);
      if (!hasPermission) {
        return null;
      }
    }

    return this.mapRowToSharingSettings(row);
  }

  /**
   * Update sharing settings
   */
  async updateSharingSettings(
    guideId: string,
    userId: string,
    input: UpdateSharingSettingsInput
  ): Promise<SharingSettings> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify user owns the guide
      const guideCheck = await client.query(
        'SELECT user_id FROM guides WHERE id = $1',
        [guideId]
      );

      if (guideCheck.rows.length === 0) {
        throw new Error('Guide not found');
      }

      if (guideCheck.rows[0].user_id !== userId) {
        throw new Error('Unauthorized: You do not own this guide');
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.isPublic !== undefined) {
        updates.push(`is_public = $${paramCount++}`);
        values.push(input.isPublic);
      }

      if (input.allowedDomains !== undefined) {
        updates.push(`allowed_domains = $${paramCount++}`);
        values.push(input.allowedDomains);
      }

      if (input.passwordProtected !== undefined) {
        updates.push(`password_protected = $${paramCount++}`);
        values.push(input.passwordProtected);
      }

      if (input.password) {
        const passwordHash = await bcrypt.hash(input.password, 12);
        updates.push(`password_hash = $${paramCount++}`);
        values.push(passwordHash);
      }

      if (input.requireAuth !== undefined) {
        updates.push(`require_auth = $${paramCount++}`);
        values.push(input.requireAuth);
      }

      if (input.allowComments !== undefined) {
        updates.push(`allow_comments = $${paramCount++}`);
        values.push(input.allowComments);
      }

      if (input.allowDownload !== undefined) {
        updates.push(`allow_download = $${paramCount++}`);
        values.push(input.allowDownload);
      }

      if (input.trackAnalytics !== undefined) {
        updates.push(`track_analytics = $${paramCount++}`);
        values.push(input.trackAnalytics);
      }

      if (input.customBranding !== undefined) {
        updates.push(`custom_branding = $${paramCount++}`);
        values.push(input.customBranding);
      }

      if (input.expiresAt !== undefined) {
        updates.push(`expires_at = $${paramCount++}`);
        values.push(input.expiresAt);
      }

      if (input.maxViews !== undefined) {
        updates.push(`max_views = $${paramCount++}`);
        values.push(input.maxViews);
      }

      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(input.isActive);
      }

      if (updates.length === 0) {
        throw new Error('No updates provided');
      }

      updates.push(`updated_at = NOW()`);
      values.push(guideId);

      const query = `
        UPDATE sharing_settings 
        SET ${updates.join(', ')}
        WHERE guide_id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      if (result.rows.length === 0) {
        throw new Error('Sharing settings not found');
      }

      return this.mapRowToSharingSettings(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create share permission for a user or email
   */
  async createSharePermission(
    guideId: string,
    grantedBy: string,
    input: CreateSharePermissionInput
  ): Promise<SharePermission> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Verify the granter owns the guide or has admin permission
      const canGrant = await this.canGrantPermissions(guideId, grantedBy);
      if (!canGrant) {
        throw new Error('Unauthorized: Cannot grant permissions for this guide');
      }

      const query = `
        INSERT INTO share_permissions (
          guide_id, user_id, email, role, granted_by, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        input.guideId,
        input.userId,
        input.email,
        input.role,
        grantedBy,
        input.expiresAt
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return this.mapRowToSharePermission(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get share permissions for a guide
   */
  async getSharePermissions(guideId: string, userId: string): Promise<SharePermission[]> {
    // Verify user can view permissions
    const canView = await this.canGrantPermissions(guideId, userId);
    if (!canView) {
      throw new Error('Unauthorized: Cannot view permissions for this guide');
    }

    const query = `
      SELECT sp.*, u.email as user_email, u.first_name, u.last_name
      FROM share_permissions sp
      LEFT JOIN users u ON sp.user_id = u.id
      WHERE sp.guide_id = $1 AND sp.is_active = true
      ORDER BY sp.granted_at DESC
    `;

    const result = await this.db.query(query, [guideId]);
    return result.rows.map(row => this.mapRowToSharePermission(row));
  }

  /**
   * Update share permission
   */
  async updateSharePermission(
    permissionId: string,
    userId: string,
    input: UpdateSharePermissionInput
  ): Promise<SharePermission> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get permission and verify authorization
      const permissionCheck = await client.query(
        'SELECT guide_id FROM share_permissions WHERE id = $1',
        [permissionId]
      );

      if (permissionCheck.rows.length === 0) {
        throw new Error('Permission not found');
      }

      const guideId = permissionCheck.rows[0].guide_id;
      const canUpdate = await this.canGrantPermissions(guideId, userId);
      if (!canUpdate) {
        throw new Error('Unauthorized: Cannot update permissions for this guide');
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (input.role !== undefined) {
        updates.push(`role = $${paramCount++}`);
        values.push(input.role);
      }

      if (input.expiresAt !== undefined) {
        updates.push(`expires_at = $${paramCount++}`);
        values.push(input.expiresAt);
      }

      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(input.isActive);
      }

      if (updates.length === 0) {
        throw new Error('No updates provided');
      }

      values.push(permissionId);

      const query = `
        UPDATE share_permissions 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return this.mapRowToSharePermission(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete share permission
   */
  async deleteSharePermission(permissionId: string, userId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get permission and verify authorization
      const permissionCheck = await client.query(
        'SELECT guide_id FROM share_permissions WHERE id = $1',
        [permissionId]
      );

      if (permissionCheck.rows.length === 0) {
        throw new Error('Permission not found');
      }

      const guideId = permissionCheck.rows[0].guide_id;
      const canDelete = await this.canGrantPermissions(guideId, userId);
      if (!canDelete) {
        throw new Error('Unauthorized: Cannot delete permissions for this guide');
      }

      await client.query(
        'UPDATE share_permissions SET is_active = false WHERE id = $1',
        [permissionId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify access to a shared guide
   */
  async verifyShareAccess(
    shareUrl: string,
    input: ShareAccessInput,
    userAgent: string,
    ipAddress: string,
    referrer?: string
  ): Promise<{ allowed: boolean; guideId?: string; requiresAuth?: boolean }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get sharing settings by share URL
      const settingsQuery = `
        SELECT ss.*, g.id as guide_id, g.title, g.status
        FROM sharing_settings ss
        JOIN guides g ON ss.guide_id = g.id
        WHERE ss.share_url = $1 AND ss.is_active = true
      `;

      const settingsResult = await client.query(settingsQuery, [shareUrl]);
      
      if (settingsResult.rows.length === 0) {
        return { allowed: false };
      }

      const settings = settingsResult.rows[0];
      
      // Check if guide is published
      if (settings.status !== 'published') {
        return { allowed: false };
      }

      // Check if sharing has expired
      if (settings.expires_at && new Date(settings.expires_at) < new Date()) {
        return { allowed: false };
      }

      // Check view limits
      if (settings.max_views && settings.current_views >= settings.max_views) {
        return { allowed: false };
      }

      // Check domain restrictions
      if (settings.allowed_domains.length > 0 && referrer) {
        const referrerDomain = new URL(referrer).hostname;
        const isAllowedDomain = settings.allowed_domains.some((domain: string) => {
          const allowedDomain = new URL(domain).hostname;
          return referrerDomain === allowedDomain || referrerDomain.endsWith('.' + allowedDomain);
        });
        
        if (!isAllowedDomain) {
          return { allowed: false };
        }
      }

      // Check password protection
      if (settings.password_protected) {
        if (!input.password) {
          return { allowed: false, requiresAuth: true };
        }

        const passwordValid = await bcrypt.compare(input.password, settings.password_hash);
        if (!passwordValid) {
          return { allowed: false };
        }
      }

      // Log access
      if (settings.track_analytics) {
        await this.logShareAccess(
          settings.guide_id,
          settings.id,
          ipAddress,
          userAgent,
          referrer
        );

        // Increment view count
        await client.query(
          'UPDATE sharing_settings SET current_views = current_views + 1 WHERE id = $1',
          [settings.id]
        );
      }

      await client.query('COMMIT');

      return { 
        allowed: true, 
        guideId: settings.guide_id,
        requiresAuth: settings.require_auth 
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate embed code with custom configuration
   */
  generateCustomEmbedCode(shareUrl: string, config: EmbedConfiguration): string {
    const embedUrl = `${shareUrl}/embed`;
    const params = new URLSearchParams();
    
    if (!config.showTitle) params.append('hideTitle', 'true');
    if (!config.showProgress) params.append('hideProgress', 'true');
    if (!config.showControls) params.append('hideControls', 'true');
    if (config.autoPlay) params.append('autoPlay', 'true');
    if (config.theme !== 'light') params.append('theme', config.theme);

    const finalUrl = params.toString() ? `${embedUrl}?${params.toString()}` : embedUrl;
    
    let iframe = `<iframe src="${finalUrl}" width="${config.width}" height="${config.height}" frameborder="0" allowfullscreen></iframe>`;
    
    if (config.customCss) {
      iframe = `<style>${config.customCss}</style>\n${iframe}`;
    }

    return iframe;
  }

  // Private helper methods

  private async generateUniqueShareUrl(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const urlId = crypto.randomBytes(9).toString('base64')
        .replace(/\+/g, '')
        .replace(/\//g, '')
        .replace(/=/g, '')
        .substring(0, 12);

      const shareUrl = `https://stepflow.app/share/${urlId}`;

      // Check if URL already exists
      const existing = await this.db.query(
        'SELECT id FROM sharing_settings WHERE share_url = $1',
        [shareUrl]
      );

      if (existing.rows.length === 0) {
        return shareUrl;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique share URL');
  }

  private generateEmbedCode(shareUrl: string): string {
    return `<iframe src="${shareUrl}/embed" width="800" height="600" frameborder="0" allowfullscreen></iframe>`;
  }

  private async checkUserPermission(guideId: string, userId: string): Promise<boolean> {
    const query = `
      SELECT id FROM share_permissions 
      WHERE guide_id = $1 AND user_id = $2 AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
    `;

    const result = await this.db.query(query, [guideId, userId]);
    return result.rows.length > 0;
  }

  private async canGrantPermissions(guideId: string, userId: string): Promise<boolean> {
    // Check if user owns the guide
    const ownerCheck = await this.db.query(
      'SELECT id FROM guides WHERE id = $1 AND user_id = $2',
      [guideId, userId]
    );

    if (ownerCheck.rows.length > 0) {
      return true;
    }

    // Check if user has admin permission
    const adminCheck = await this.db.query(
      `SELECT id FROM share_permissions 
       WHERE guide_id = $1 AND user_id = $2 AND role = 'admin' AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [guideId, userId]
    );

    return adminCheck.rows.length > 0;
  }

  private async logShareAccess(
    guideId: string,
    sharingSettingsId: string,
    ipAddress: string,
    userAgent: string,
    referrer?: string,
    userId?: string
  ): Promise<void> {
    const query = `
      INSERT INTO share_access_logs (
        guide_id, sharing_settings_id, user_id, ip_address, user_agent, referrer
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(query, [
      guideId,
      sharingSettingsId,
      userId,
      ipAddress,
      userAgent,
      referrer
    ]);
  }

  private mapRowToSharingSettings(row: any): SharingSettings {
    return {
      id: row.id,
      guideId: row.guide_id,
      isPublic: row.is_public,
      shareUrl: row.share_url,
      embedCode: row.embed_code,
      allowedDomains: row.allowed_domains || [],
      passwordProtected: row.password_protected,
      passwordHash: row.password_hash,
      requireAuth: row.require_auth,
      allowComments: row.allow_comments,
      allowDownload: row.allow_download,
      trackAnalytics: row.track_analytics,
      customBranding: row.custom_branding,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      maxViews: row.max_views,
      currentViews: row.current_views,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToSharePermission(row: any): SharePermission {
    return {
      id: row.id,
      guideId: row.guide_id,
      userId: row.user_id,
      email: row.email || row.user_email,
      role: row.role,
      grantedBy: row.granted_by,
      grantedAt: new Date(row.granted_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      isActive: row.is_active
    };
  }
}