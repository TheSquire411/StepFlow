import * as AWS from 'aws-sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { cdnService } from './cdn.service.js';

export interface FileInfo {
  size: number;
  lastModified: Date;
  contentType: string;
}

export interface FileStorageService {
  uploadFile(key: string, data: Buffer, contentType: string): Promise<void>;
  getFile(key: string): Promise<Buffer>;
  getFileUrl(key: string): Promise<string>;
  getFileInfo(key: string): Promise<FileInfo>;
  deleteFile(key: string): Promise<void>;
  listFiles(prefix: string): Promise<string[]>;
  healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }>;
}

/**
 * AWS S3 File Storage Service
 */
export class S3FileStorageService implements FileStorageService {
  private s3: AWS.S3;
  private bucketName: string;
  private region: string;

  constructor(bucketName: string, region: string = 'us-east-1') {
    this.bucketName = bucketName;
    this.region = region;
    
    this.s3 = new AWS.S3({
      region: this.region,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async uploadFile(key: string, data: Buffer, contentType: string): Promise<void> {
    const cacheHeaders = cdnService.getCacheHeaders(contentType);
    
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      CacheControl: cacheHeaders['Cache-Control'],
      Metadata: {
        'uploaded-at': new Date().toISOString(),
      },
    };

    try {
      await this.s3.upload(params).promise();
      
      // Preload to CDN if it's a public file
      if (this.isPublicFile(key)) {
        await cdnService.preloadContent([key]);
      }
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async getFile(key: string): Promise<Buffer> {
    const params: AWS.S3.GetObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      const result = await this.s3.getObject(params).promise();
      return result.Body as Buffer;
    } catch (error) {
      throw new Error(`Failed to get file from S3: ${error.message}`);
    }
  }

  async getFileUrl(key: string): Promise<string> {
    // Use CDN URL for public files, signed URL for private files
    try {
      // For public files, use CDN URL
      if (this.isPublicFile(key)) {
        return cdnService.getCDNUrl(key);
      }
      
      // For private files, use signed URL
      return cdnService.getSignedUrl(key, 3600);
    } catch (error) {
      // Fallback to direct S3 signed URL
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: 3600, // 1 hour
      };
      return this.s3.getSignedUrl('getObject', params);
    }
  }

  private isPublicFile(key: string): boolean {
    // Determine if file should be served via CDN (public) or signed URL (private)
    const publicPrefixes = ['guides/', 'thumbnails/', 'public/'];
    return publicPrefixes.some(prefix => key.startsWith(prefix));
  }

  async getFileInfo(key: string): Promise<FileInfo> {
    const params: AWS.S3.HeadObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      const result = await this.s3.headObject(params).promise();
      return {
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
        contentType: result.ContentType || 'application/octet-stream',
      };
    } catch (error) {
      throw new Error(`Failed to get file info from S3: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      await this.s3.deleteObject(params).promise();
      
      // Invalidate CDN cache for deleted file
      await cdnService.invalidateCache([key]);
    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const params: AWS.S3.ListObjectsV2Request = {
      Bucket: this.bucketName,
      Prefix: prefix,
    };

    try {
      const result = await this.s3.listObjectsV2(params).promise();
      return result.Contents?.map(obj => obj.Key || '') || [];
    } catch (error) {
      throw new Error(`Failed to list files from S3: ${(error as Error).message}`);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
      // Test S3 connectivity by listing objects with a limit
      const params: AWS.S3.ListObjectsV2Request = {
        Bucket: this.bucketName,
        MaxKeys: 1,
      };

      const result = await this.s3.listObjectsV2(params).promise();
      
      return {
        healthy: true,
        details: {
          bucketName: this.bucketName,
          region: this.region,
          objectCount: result.KeyCount || 0,
          accessible: true
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          bucketName: this.bucketName,
          region: this.region,
          error: (error as Error).message,
          accessible: false
        }
      };
    }
  }
}

/**
 * Local File Storage Service (for development)
 */
export class LocalFileStorageService implements FileStorageService {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath: string = './uploads', baseUrl: string = 'http://localhost:3001/uploads') {
    this.basePath = path.resolve(basePath);
    this.baseUrl = baseUrl;
  }

  private getFilePath(key: string): string {
    return path.join(this.basePath, key);
  }

  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async uploadFile(key: string, data: Buffer, contentType: string): Promise<void> {
    const filePath = this.getFilePath(key);
    
    try {
      await this.ensureDirectory(filePath);
      await fs.writeFile(filePath, data);
    } catch (error) {
      throw new Error(`Failed to upload file locally: ${error.message}`);
    }
  }

  async getFile(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new Error(`Failed to get file locally: ${error.message}`);
    }
  }

  async getFileUrl(key: string): Promise<string> {
    // Return a URL that can be served by the API server
    return `${this.baseUrl}/${key}`;
  }

  async getFileInfo(key: string): Promise<FileInfo> {
    const filePath = this.getFilePath(key);
    
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
        contentType: this.getContentType(key),
      };
    } catch (error) {
      throw new Error(`Failed to get file info locally: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file locally: ${error.message}`);
    }
  }

  async listFiles(prefix: string): Promise<string[]> {
    const prefixPath = this.getFilePath(prefix);
    
    try {
      const files: string[] = [];
      
      const scanDirectory = async (dir: string, currentPrefix: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(currentPrefix, entry.name);
            
            if (entry.isDirectory()) {
              await scanDirectory(fullPath, relativePath);
            } else {
              files.push(relativePath.replace(/\\/g, '/'));
            }
          }
        } catch (error) {
          // Directory doesn't exist or can't be read
        }
      };
      
      await scanDirectory(path.dirname(prefixPath), prefix);
      return files.filter(file => file.startsWith(prefix));
    } catch (error) {
      throw new Error(`Failed to list files locally: ${error.message}`);
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, any> }> {
    try {
      // Test local storage by checking if base directory exists and is writable
      await fs.access(this.basePath, fs.constants.F_OK | fs.constants.W_OK);
      
      // Test write capability with a small test file
      const testFile = path.join(this.basePath, '.health-check');
      await fs.writeFile(testFile, 'health-check');
      await fs.unlink(testFile);
      
      return {
        healthy: true,
        details: {
          basePath: this.basePath,
          baseUrl: this.baseUrl,
          writable: true,
          accessible: true
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          basePath: this.basePath,
          baseUrl: this.baseUrl,
          error: (error as Error).message,
          writable: false,
          accessible: false
        }
      };
    }
  }

  private getContentType(key: string): string {
    const ext = path.extname(key).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.webm': 'video/webm',
      '.mp4': 'video/mp4',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.json': 'application/json',
      '.txt': 'text/plain',
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }
}

/**
 * Factory function to create appropriate file storage service
 */
export function createFileStorageService(): FileStorageService {
  const storageType = process.env.FILE_STORAGE_TYPE || 'local';
  
  switch (storageType) {
    case 's3':
      const bucketName = process.env.AWS_S3_BUCKET;
      const region = process.env.AWS_REGION;
      
      if (!bucketName) {
        throw new Error('AWS_S3_BUCKET environment variable is required for S3 storage');
      }
      
      return new S3FileStorageService(bucketName, region);
    
    case 'local':
    default:
      const basePath = process.env.LOCAL_STORAGE_PATH || './uploads';
      const baseUrl = process.env.LOCAL_STORAGE_URL || 'http://localhost:3001/uploads';
      
      return new LocalFileStorageService(basePath, baseUrl);
  }
}

// Export singleton instance
export const fileStorageService = createFileStorageService();