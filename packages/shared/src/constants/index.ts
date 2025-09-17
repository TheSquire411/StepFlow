// Shared constants
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.stepflow.com' 
  : 'http://localhost:3001';

export const WEB_APP_URL = process.env.NODE_ENV === 'production'
  ? 'https://app.stepflow.com'
  : 'http://localhost:3000';

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
export const SUPPORTED_VIDEO_FORMATS = ['mp4', 'webm', 'mov'];
export const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];