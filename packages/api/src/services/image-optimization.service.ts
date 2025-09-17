import sharp from 'sharp';
import { fileStorageService } from './file-storage.service.js';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  progressive?: boolean;
  blur?: number;
  sharpen?: boolean;
}

export interface OptimizedImageResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  url: string;
  format: string;
}

export class ImageOptimizationService {
  private readonly supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff'];
  private readonly maxWidth = 2048;
  private readonly maxHeight = 2048;

  /**
   * Optimize a single image
   */
  async optimizeImage(
    imageBuffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<Buffer> {
    const {
      width,
      height,
      quality = 85,
      format = 'webp',
      progressive = true,
      blur,
      sharpen = false,
    } = options;

    let pipeline = sharp(imageBuffer);

    // Get original image metadata
    const metadata = await pipeline.metadata();
    
    // Resize if dimensions are specified or if image is too large
    const targetWidth = width || (metadata.width && metadata.width > this.maxWidth ? this.maxWidth : metadata.width);
    const targetHeight = height || (metadata.height && metadata.height > this.maxHeight ? this.maxHeight : metadata.height);

    if (targetWidth || targetHeight) {
      pipeline = pipeline.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Apply blur if specified
    if (blur && blur > 0) {
      pipeline = pipeline.blur(blur);
    }

    // Apply sharpening if requested
    if (sharpen) {
      pipeline = pipeline.sharpen();
    }

    // Convert to target format with quality settings
    switch (format) {
      case 'webp':
        pipeline = pipeline.webp({
          quality,
          progressive,
          effort: 6, // Higher effort for better compression
        });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({
          quality,
          progressive,
          mozjpeg: true, // Use mozjpeg encoder for better compression
        });
        break;
      case 'png':
        pipeline = pipeline.png({
          quality,
          progressive,
          compressionLevel: 9,
        });
        break;
    }

    return pipeline.toBuffer();
  }

  /**
   * Generate multiple sizes/formats of an image
   */
  async generateImageVariants(
    imageBuffer: Buffer,
    basePath: string
  ): Promise<OptimizedImageResult[]> {
    const variants = [
      { suffix: 'thumbnail', width: 150, height: 150, quality: 80, format: 'webp' as const },
      { suffix: 'small', width: 400, height: 300, quality: 85, format: 'webp' as const },
      { suffix: 'medium', width: 800, height: 600, quality: 85, format: 'webp' as const },
      { suffix: 'large', width: 1200, height: 900, quality: 90, format: 'webp' as const },
      { suffix: 'original', quality: 95, format: 'jpeg' as const },
    ];

    const results: OptimizedImageResult[] = [];
    const originalSize = imageBuffer.length;

    for (const variant of variants) {
      try {
        const optimizedBuffer = await this.optimizeImage(imageBuffer, variant);
        const optimizedSize = optimizedBuffer.length;
        const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

        // Generate file path
        const extension = variant.format === 'jpeg' ? 'jpg' : variant.format;
        const filePath = `${basePath}_${variant.suffix}.${extension}`;

        // Upload optimized image
        await fileStorageService.uploadFile(
          filePath,
          optimizedBuffer,
          `image/${variant.format}`
        );

        const url = await fileStorageService.getFileUrl(filePath);

        results.push({
          originalSize,
          optimizedSize,
          compressionRatio,
          url,
          format: variant.format,
        });
      } catch (error) {
        console.error(`Failed to generate ${variant.suffix} variant:`, error);
      }
    }

    return results;
  }

  /**
   * Optimize screenshot for guide steps
   */
  async optimizeScreenshot(
    imageBuffer: Buffer,
    stepId: string,
    options: {
      addAnnotations?: boolean;
      highlightAreas?: Array<{ x: number; y: number; width: number; height: number }>;
      blurAreas?: Array<{ x: number; y: number; width: number; height: number }>;
    } = {}
  ): Promise<OptimizedImageResult> {
    let pipeline = sharp(imageBuffer);

    // Apply blur to sensitive areas
    if (options.blurAreas && options.blurAreas.length > 0) {
      for (const area of options.blurAreas) {
        const blurredRegion = await sharp(imageBuffer)
          .extract({
            left: area.x,
            top: area.y,
            width: area.width,
            height: area.height,
          })
          .blur(10)
          .toBuffer();

        pipeline = pipeline.composite([{
          input: blurredRegion,
          left: area.x,
          top: area.y,
        }]);
      }
    }

    // Add highlight overlays
    if (options.highlightAreas && options.highlightAreas.length > 0) {
      const overlays = options.highlightAreas.map(area => ({
        input: Buffer.from(`
          <svg width="${area.width}" height="${area.height}">
            <rect x="0" y="0" width="${area.width}" height="${area.height}" 
                  fill="none" stroke="#ff6b35" stroke-width="3" rx="4"/>
          </svg>
        `),
        left: area.x,
        top: area.y,
      }));

      pipeline = pipeline.composite(overlays);
    }

    // Optimize for web delivery
    const optimizedBuffer = await pipeline
      .webp({ quality: 85, progressive: true })
      .toBuffer();

    const originalSize = imageBuffer.length;
    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

    // Upload optimized screenshot
    const filePath = `screenshots/${stepId}_optimized.webp`;
    await fileStorageService.uploadFile(
      filePath,
      optimizedBuffer,
      'image/webp'
    );

    const url = await fileStorageService.getFileUrl(filePath);

    return {
      originalSize,
      optimizedSize,
      compressionRatio,
      url,
      format: 'webp',
    };
  }

  /**
   * Create responsive image srcset
   */
  async generateResponsiveImages(
    imageBuffer: Buffer,
    basePath: string
  ): Promise<{ srcset: string; sizes: string }> {
    const breakpoints = [320, 640, 768, 1024, 1280, 1920];
    const srcsetEntries: string[] = [];

    for (const width of breakpoints) {
      try {
        const optimizedBuffer = await this.optimizeImage(imageBuffer, {
          width,
          quality: 85,
          format: 'webp',
        });

        const filePath = `${basePath}_${width}w.webp`;
        await fileStorageService.uploadFile(
          filePath,
          optimizedBuffer,
          'image/webp'
        );

        const url = await fileStorageService.getFileUrl(filePath);
        srcsetEntries.push(`${url} ${width}w`);
      } catch (error) {
        console.error(`Failed to generate ${width}w variant:`, error);
      }
    }

    const srcset = srcsetEntries.join(', ');
    const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

    return { srcset, sizes };
  }

  /**
   * Batch optimize images
   */
  async batchOptimize(
    images: Array<{ buffer: Buffer; path: string; options?: ImageOptimizationOptions }>
  ): Promise<OptimizedImageResult[]> {
    const results: OptimizedImageResult[] = [];

    // Process images in parallel with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map(async ({ buffer, path, options = {} }) => {
          const originalSize = buffer.length;
          const optimizedBuffer = await this.optimizeImage(buffer, options);
          const optimizedSize = optimizedBuffer.length;
          const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

          await fileStorageService.uploadFile(
            path,
            optimizedBuffer,
            `image/${options.format || 'webp'}`
          );

          const url = await fileStorageService.getFileUrl(path);

          return {
            originalSize,
            optimizedSize,
            compressionRatio,
            url,
            format: options.format || 'webp',
          };
        })
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch optimization failed:', result.reason);
        }
      }
    }

    return results;
  }

  /**
   * Check if file is a supported image format
   */
  isSupportedImageFormat(filename: string): boolean {
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? this.supportedFormats.includes(extension) : false;
  }

  /**
   * Get optimal format for browser
   */
  getOptimalFormat(userAgent: string): 'webp' | 'jpeg' {
    // Check if browser supports WebP
    const supportsWebP = userAgent.includes('Chrome') || 
                        userAgent.includes('Firefox') || 
                        userAgent.includes('Edge');
    
    return supportsWebP ? 'webp' : 'jpeg';
  }

  /**
   * Calculate image quality based on file size and dimensions
   */
  calculateOptimalQuality(width: number, height: number, targetSizeKB: number): number {
    const pixels = width * height;
    const baseQuality = 85;
    
    // Adjust quality based on image size and target file size
    if (pixels > 1000000) { // Large images (>1MP)
      return Math.max(70, baseQuality - 10);
    } else if (pixels > 500000) { // Medium images (>0.5MP)
      return Math.max(75, baseQuality - 5);
    }
    
    return baseQuality;
  }
}

export const imageOptimizationService = new ImageOptimizationService();