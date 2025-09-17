import AWS from 'aws-sdk';

export class CDNService {
  private cloudfront: AWS.CloudFront;
  private distributionId: string;
  private domainName: string;

  constructor() {
    this.cloudfront = new AWS.CloudFront({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
    });
    
    this.distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || '';
    this.domainName = process.env.CLOUDFRONT_DOMAIN_NAME || '';
  }

  /**
   * Generate CDN URL for a file
   */
  getCDNUrl(filePath: string): string {
    if (!this.domainName) {
      // Fallback to direct S3 URL if CDN not configured
      return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;
    }
    
    return `https://${this.domainName}/${filePath}`;
  }

  /**
   * Generate signed URL for private content
   */
  getSignedUrl(filePath: string, expiresIn: number = 3600): string {
    if (!this.domainName) {
      // Fallback to S3 signed URL
      const s3 = new AWS.S3();
      return s3.getSignedUrl('getObject', {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: filePath,
        Expires: expiresIn,
      });
    }

    const signer = new AWS.CloudFront.Signer(
      process.env.CLOUDFRONT_KEY_PAIR_ID || '',
      process.env.CLOUDFRONT_PRIVATE_KEY || ''
    );

    const signedUrl = signer.getSignedUrl({
      url: this.getCDNUrl(filePath),
      expires: Math.floor(Date.now() / 1000) + expiresIn,
    });

    return signedUrl;
  }

  /**
   * Invalidate CDN cache for specific files
   */
  async invalidateCache(filePaths: string[]): Promise<void> {
    if (!this.distributionId) {
      console.warn('CloudFront distribution ID not configured, skipping cache invalidation');
      return;
    }

    try {
      const params = {
        DistributionId: this.distributionId,
        InvalidationBatch: {
          CallerReference: `invalidation-${Date.now()}`,
          Paths: {
            Quantity: filePaths.length,
            Items: filePaths.map(path => `/${path}`),
          },
        },
      };

      await this.cloudfront.createInvalidation(params).promise();
      console.log(`CDN cache invalidated for ${filePaths.length} files`);
    } catch (error) {
      console.error('CDN cache invalidation failed:', error);
      throw error;
    }
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedImageUrl(filePath: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}): string {
    const baseUrl = this.getCDNUrl(filePath);
    
    // If using AWS CloudFront with Lambda@Edge for image optimization
    const params = new URLSearchParams();
    
    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    if (options.quality) params.append('q', options.quality.toString());
    if (options.format) params.append('f', options.format);
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Preload content to CDN edge locations
   */
  async preloadContent(filePaths: string[]): Promise<void> {
    // This would typically involve making requests to edge locations
    // or using CDN-specific preloading APIs
    console.log(`Preloading ${filePaths.length} files to CDN edge locations`);
    
    // Make requests to multiple edge locations to warm the cache
    const edgeLocations = [
      'https://cloudfront.amazonaws.com', // Example edge location
    ];
    
    for (const filePath of filePaths) {
      const url = this.getCDNUrl(filePath);
      try {
        // Make HEAD requests to warm the cache
        await fetch(url, { method: 'HEAD' });
      } catch (error) {
        console.warn(`Failed to preload ${url}:`, error);
      }
    }
  }

  /**
   * Get CDN analytics and performance metrics
   */
  async getCDNMetrics(startDate: Date, endDate: Date): Promise<any> {
    if (!this.distributionId) {
      throw new Error('CloudFront distribution ID not configured');
    }

    try {
      const params = {
        DistributionId: this.distributionId,
        StartTime: startDate,
        EndTime: endDate,
        Granularity: 'HOUR',
        Metrics: ['Requests', 'BytesDownloaded', 'OriginLatency'],
      };

      // Note: This would use CloudWatch metrics in a real implementation
      // const result = await this.cloudfront.getDistributionMetrics(params).promise();
      
      return {
        requests: 0,
        bytesDownloaded: 0,
        originLatency: 0,
        cacheHitRate: 0,
      };
    } catch (error) {
      console.error('Failed to get CDN metrics:', error);
      throw error;
    }
  }

  /**
   * Configure cache headers for different content types
   */
  getCacheHeaders(contentType: string): Record<string, string> {
    const headers: Record<string, string> = {};

    if (contentType.startsWith('image/')) {
      // Images can be cached for a long time
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // 1 year
    } else if (contentType.startsWith('video/')) {
      // Videos can be cached for a long time
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // 1 year
    } else if (contentType.startsWith('audio/')) {
      // Audio files can be cached for a long time
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'; // 1 year
    } else if (contentType === 'application/json') {
      // API responses should have shorter cache times
      headers['Cache-Control'] = 'public, max-age=300'; // 5 minutes
    } else {
      // Default cache policy
      headers['Cache-Control'] = 'public, max-age=3600'; // 1 hour
    }

    return headers;
  }
}

export const cdnService = new CDNService();