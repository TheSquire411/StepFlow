import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { logger } from './sentry.service';

export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag?: string;
}

export interface DecryptionInput {
  encrypted: string;
  iv: string;
  tag?: string;
}

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_ROUNDS = 12;
  
  private static encryptionKey: Buffer;

  /**
   * Initialize encryption service with key
   */
  static initialize() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    
    // Derive key from environment variable
    this.encryptionKey = crypto.scryptSync(key, 'salt', this.KEY_LENGTH);
    logger.info('Encryption service initialized');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  static encrypt(plaintext: string): EncryptionResult {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipher(this.ALGORITHM, this.encryptionKey);
      cipher.setAAD(Buffer.from('stepflow-auth-data'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      logger.error('Encryption failed', { error: error.message });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(data: DecryptionInput): string {
    try {
      const decipher = crypto.createDecipher(this.ALGORITHM, this.encryptionKey);
      decipher.setAAD(Buffer.from('stepflow-auth-data'));
      
      if (data.tag) {
        decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
      }

      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error: error.message });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      logger.error('Password hashing failed', { error: error.message });
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed', { error: error.message });
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate cryptographically secure UUID
   */
  static generateSecureUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Hash data using SHA-256
   */
  static hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Create HMAC signature
   */
  static createHMAC(data: string, secret?: string): string {
    const key = secret || process.env.HMAC_SECRET || 'default-secret';
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data: string, signature: string, secret?: string): boolean {
    const expectedSignature = this.createHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Encrypt database field
   */
  static encryptField(value: string | null): string | null {
    if (!value) return null;
    
    const encrypted = this.encrypt(value);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt database field
   */
  static decryptField(encryptedValue: string | null): string | null {
    if (!encryptedValue) return null;
    
    try {
      const data = JSON.parse(encryptedValue) as DecryptionInput;
      return this.decrypt(data);
    } catch (error) {
      logger.error('Field decryption failed', { error: error.message });
      return null;
    }
  }

  /**
   * Encrypt PII data for GDPR compliance
   */
  static encryptPII(data: Record<string, any>): Record<string, any> {
    const piiFields = ['email', 'firstName', 'lastName', 'phone', 'address'];
    const encrypted = { ...data };

    for (const field of piiFields) {
      if (encrypted[field]) {
        encrypted[field] = this.encryptField(encrypted[field]);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt PII data
   */
  static decryptPII(data: Record<string, any>): Record<string, any> {
    const piiFields = ['email', 'firstName', 'lastName', 'phone', 'address'];
    const decrypted = { ...data };

    for (const field of piiFields) {
      if (decrypted[field]) {
        decrypted[field] = this.decryptField(decrypted[field]);
      }
    }

    return decrypted;
  }

  /**
   * Generate API key
   */
  static generateAPIKey(): string {
    const prefix = 'sk_';
    const randomPart = this.generateSecureToken(24);
    return prefix + randomPart;
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: any): any {
    if (typeof data === 'string') {
      // Mask email addresses
      if (data.includes('@')) {
        const [local, domain] = data.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      }
      // Mask other sensitive strings
      if (data.length > 4) {
        return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
      }
      return '***';
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    if (data && typeof data === 'object') {
      const masked: any = {};
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'email', 'phone'];
      
      for (const [key, value] of Object.entries(data)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          masked[key] = this.maskSensitiveData(value);
        } else {
          masked[key] = value;
        }
      }
      return masked;
    }

    return data;
  }
}