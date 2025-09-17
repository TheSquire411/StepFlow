import { executeQuery, executeTransaction } from '../config/database.js';
import {
    Guide,
    CreateGuideInput,
    UpdateGuideInput,
    GuideFilters
} from '../models/guide.model.js';
import { cacheService } from './cache.service.js';

export class GuideService {
    /**
     * Create a new guide
     */
    async createGuide(userId: string, input: CreateGuideInput): Promise<Guide> {
        return executeTransaction(async (client) => {
            // Check if recording exists and belongs to user
            const recordingCheck = await client.query(
                'SELECT id, user_id FROM recordings WHERE id = $1 AND user_id = $2',
                [input.recordingId, userId]
            );

            if (recordingCheck.rows.length === 0) {
                throw new Error('Recording not found or access denied');
            }

            // Create the guide
            const guideResult = await client.query(`
        INSERT INTO guides (
          user_id, recording_id, title, description, category, tags, 
          settings, language, difficulty
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
                userId,
                input.recordingId,
                input.title,
                input.description || null,
                input.category || null,
                input.tags || [],
                JSON.stringify(input.settings || {}),
                input.language || 'en',
                input.difficulty || null
            ]);

            return this.mapDatabaseRowToGuide(guideResult.rows[0]);
        });
    }

    /**
     * Get a guide by ID
     */
    async getGuide(guideId: string, userId?: string): Promise<Guide | null> {
        // Try cache first for public guides (no userId restriction)
        if (!userId) {
            const cached = await cacheService.getGuide(guideId);
            if (cached) {
                return cached;
            }
        }

        const query = `
      SELECT g.*, 
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ps.id,
                   'order', ps.step_order,
                   'title', ps.title,
                   'description', ps.description,
                   'screenshotUrl', ps.screenshot_url,
                   'audioUrl', ps.audio_url,
                   'duration', ps.duration,
                   'actionType', ps.action_type,
                   'coordinates', ps.coordinates,
                   'annotations', ps.annotations
                 ) ORDER BY ps.step_order
               ) FILTER (WHERE ps.id IS NOT NULL), 
               '[]'::json
             ) as steps
      FROM guides g
      LEFT JOIN processed_steps ps ON g.id = ps.guide_id
      WHERE g.id = $1 ${userId ? 'AND g.user_id = $2' : ''}
      GROUP BY g.id
    `;

        const params = userId ? [guideId, userId] : [guideId];
        const result = await executeQuery(query, params);

        if (result.rows.length === 0) {
            return null;
        }

        const guide = this.mapDatabaseRowToGuide(result.rows[0]);
        
        // Cache public guides
        if (!userId && guide.status === 'published') {
            await cacheService.setGuide(guide);
        }

        return guide;
    }

    /**
     * Update a guide
     */
    async updateGuide(guideId: string, userId: string, input: UpdateGuideInput): Promise<Guide | null> {
        return executeTransaction(async (client) => {
            // Check if guide exists and belongs to user
            const existingGuide = await client.query(
                'SELECT id FROM guides WHERE id = $1 AND user_id = $2',
                [guideId, userId]
            );

            if (existingGuide.rows.length === 0) {
                throw new Error('Guide not found or access denied');
            }

            // Build dynamic update query
            const updateFields = [];
            const values = [];
            let paramCount = 1;

            if (input.title !== undefined) {
                updateFields.push(`title = $${paramCount++}`);
                values.push(input.title);
            }
            if (input.description !== undefined) {
                updateFields.push(`description = $${paramCount++}`);
                values.push(input.description);
            }
            if (input.category !== undefined) {
                updateFields.push(`category = $${paramCount++}`);
                values.push(input.category);
            }
            if (input.tags !== undefined) {
                updateFields.push(`tags = $${paramCount++}`);
                values.push(input.tags);
            }
            if (input.settings !== undefined) {
                updateFields.push(`settings = $${paramCount++}`);
                values.push(JSON.stringify(input.settings));
            }
            if (input.status !== undefined) {
                updateFields.push(`status = $${paramCount++}`);
                values.push(input.status);
            }
            if (input.language !== undefined) {
                updateFields.push(`language = $${paramCount++}`);
                values.push(input.language);
            }
            if (input.difficulty !== undefined) {
                updateFields.push(`difficulty = $${paramCount++}`);
                values.push(input.difficulty);
            }

            if (updateFields.length === 0) {
                // No fields to update, return existing guide
                return this.getGuide(guideId, userId);
            }

            updateFields.push(`updated_at = NOW()`);
            values.push(guideId, userId);

            const updateQuery = `
        UPDATE guides 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount++} AND user_id = $${paramCount++}
        RETURNING *
      `;

            const result = await client.query(updateQuery, values);
            return this.mapDatabaseRowToGuide(result.rows[0]);
        });
    }

    /**
     * Delete a guide
     */
    async deleteGuide(guideId: string, userId: string): Promise<boolean> {
        const deleted = await executeTransaction(async (client) => {
            const result = await client.query(
                'DELETE FROM guides WHERE id = $1 AND user_id = $2',
                [guideId, userId]
            );

            return result.rowCount > 0;
        });

        if (deleted) {
            // Invalidate cache after deletion
            await cacheService.invalidateGuide(guideId);
            await cacheService.invalidateUserGuides(userId);
        }

        return deleted;
    }

    /**
     * List guides with filtering and pagination
     */
    async listGuides(userId: string, filters: GuideFilters = {}): Promise<{
        guides: Guide[];
        total: number;
        page: number;
        limit: number;
    }> {
        // Try cache for simple user guide lists (no complex filters)
        const isSimpleQuery = !filters.search && !filters.category && !filters.tags && !filters.status;
        if (isSimpleQuery && filters.page === 1) {
            const cached = await cacheService.getUserGuides(userId);
            if (cached) {
                return {
                    guides: cached.slice(0, filters.limit || 20),
                    total: cached.length,
                    page: 1,
                    limit: filters.limit || 20
                };
            }
        }
        const {
            search,
            category,
            tags,
            status,
            difficulty,
            language,
            page = 1,
            limit = 20,
            sortBy = 'updated_at',
            sortOrder = 'DESC'
        } = filters;

        // Build WHERE conditions
        const conditions = ['g.user_id = $1'];
        const values = [userId];
        let paramCount = 2;

        if (search) {
            conditions.push(`(g.title ILIKE $${paramCount} OR g.description ILIKE $${paramCount})`);
            values.push(`%${search}%`);
            paramCount++;
        }

        if (category) {
            conditions.push(`g.category = $${paramCount++}`);
            values.push(category);
        }

        if (tags && tags.length > 0) {
            conditions.push(`g.tags && $${paramCount++}`);
            values.push(tags);
        }

        if (status) {
            conditions.push(`g.status = $${paramCount++}`);
            values.push(status);
        }

        if (difficulty) {
            conditions.push(`g.difficulty = $${paramCount++}`);
            values.push(difficulty);
        }

        if (language) {
            conditions.push(`g.language = $${paramCount++}`);
            values.push(language);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Validate sort column
        const allowedSortColumns = ['title', 'created_at', 'updated_at', 'status', 'category'];
        const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'updated_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Get total count
        const countQuery = `
      SELECT COUNT(*) as total
      FROM guides g
      ${whereClause}
    `;
        const countResult = await executeQuery(countQuery, values);
        const total = parseInt(countResult.rows[0].total);

        // Get guides with pagination
        const offset = (page - 1) * limit;
        const guidesQuery = `
      SELECT g.*
      FROM guides g
      ${whereClause}
      ORDER BY g.${sortColumn} ${order}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

        values.push(limit, offset);
        const guidesResult = await executeQuery(guidesQuery, values);

        const guides = guidesResult.rows.map(row => this.mapDatabaseRowToGuide(row));

        // Cache simple user guide lists
        if (isSimpleQuery && filters.page === 1) {
            await cacheService.setUserGuides(userId, guides);
        }

        return {
            guides,
            total,
            page,
            limit
        };
    }

    /**
     * Get guide analytics
     */
    async getGuideAnalytics(guideId: string, userId: string): Promise<any> {
        const result = await executeQuery(`
      SELECT ga.*, g.title
      FROM guide_analytics ga
      JOIN guides g ON ga.guide_id = g.id
      WHERE ga.guide_id = $1 AND g.user_id = $2
    `, [guideId, userId]);

        if (result.rows.length === 0) {
            throw new Error('Guide not found or access denied');
        }

        return result.rows[0];
    }

    /**
     * Increment guide view count
     */
    async incrementViewCount(guideId: string): Promise<void> {
        await executeQuery(`
      UPDATE guide_analytics 
      SET view_count = view_count + 1,
          last_viewed_at = NOW()
      WHERE guide_id = $1
    `, [guideId]);
    }

    /**
     * Track guide view
     */
    async trackView(guideId: string, data: {
        timestamp: string;
        userAgent?: string;
        referrer?: string;
        viewport?: { width: number; height: number };
    }): Promise<void> {
        await executeQuery(`
      INSERT INTO guide_view_events (guide_id, timestamp, user_agent, referrer, viewport)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT DO NOTHING
    `, [
            guideId,
            data.timestamp,
            data.userAgent || null,
            data.referrer || null,
            data.viewport ? JSON.stringify(data.viewport) : null
        ]);

        // Also update the main analytics
        await this.incrementViewCount(guideId);
    }

    /**
     * Track step view
     */
    async trackStepView(guideId: string, stepIndex: number, timestamp: string): Promise<void> {
        await executeQuery(`
      INSERT INTO guide_step_events (guide_id, step_index, event_type, timestamp)
      VALUES ($1, $2, 'view', $3)
    `, [guideId, stepIndex, timestamp]);
    }

    /**
     * Track step time
     */
    async trackStepTime(guideId: string, stepIndex: number, timeSpent: number, timestamp: string): Promise<void> {
        await executeQuery(`
      INSERT INTO guide_step_events (guide_id, step_index, event_type, timestamp, data)
      VALUES ($1, $2, 'time', $3, $4)
    `, [guideId, stepIndex, timestamp, JSON.stringify({ timeSpent })]);
    }

    /**
     * Track guide completion
     */
    async trackCompletion(guideId: string, data: {
        totalTime: number;
        timestamp: string;
        completedSteps: number;
    }): Promise<void> {
        await executeQuery(`
      INSERT INTO guide_completion_events (guide_id, total_time, completed_steps, timestamp)
      VALUES ($1, $2, $3, $4)
    `, [guideId, data.totalTime, data.completedSteps, data.timestamp]);

        // Update completion analytics
        await executeQuery(`
      UPDATE guide_analytics 
      SET completion_count = completion_count + 1,
          total_completion_time = total_completion_time + $2
      WHERE guide_id = $1
    `, [guideId, data.totalTime]);
    }

    /**
     * Track engagement
     */
    async trackEngagement(guideId: string, action: string, data: any, timestamp: string): Promise<void> {
        await executeQuery(`
      INSERT INTO guide_engagement_events (guide_id, action, data, timestamp)
      VALUES ($1, $2, $3, $4)
    `, [guideId, action, data ? JSON.stringify(data) : null, timestamp]);
    }

    /**
     * Map database row to Guide model
     */
    private mapDatabaseRowToGuide(row: any): Guide {
        return {
            id: row.id,
            userId: row.user_id,
            recordingId: row.recording_id,
            title: row.title,
            description: row.description,
            category: row.category,
            tags: row.tags || [],
            status: row.status,
            settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
            language: row.language,
            difficulty: row.difficulty,
            steps: row.steps || [],
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
