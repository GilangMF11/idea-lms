import { writeFile, mkdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { randomUUID } from 'crypto';

export interface FileUploadOptions {
  allowedTypes: string[];
  maxSize: number; // in bytes
  destination: string;
}

export interface UploadedFile {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
  url: string;
}

export class FileUploadService {
  private uploadDir: string;

  constructor(uploadDir: string = 'uploads') {
    this.uploadDir = uploadDir;
  }

  async uploadFile(
    file: File,
    options: FileUploadOptions
  ): Promise<UploadedFile> {
    // Validate file type
    if (!options.allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Validate file size
    if (file.size > options.maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${options.maxSize} bytes`);
    }

    // Generate unique filename
    const fileExtension = extname(file.name);
    const uniqueFilename = `${randomUUID()}${fileExtension}`;
    const destinationPath = join(options.destination, uniqueFilename);

    // Ensure destination directory exists
    await this.ensureDirectoryExists(options.destination);

    // Convert File to Buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await writeFile(destinationPath, buffer);

    // Generate URL
    const url = `/uploads/${basename(options.destination)}/${uniqueFilename}`;

    return {
      filename: uniqueFilename,
      originalName: file.name,
      path: destinationPath,
      size: file.size,
      mimeType: file.type,
      url,
    };
  }

  async uploadImage(
    file: File,
    destination: string = 'images'
  ): Promise<UploadedFile> {
    return this.uploadFile(file, {
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: 5 * 1024 * 1024, // 5MB
      destination: join(this.uploadDir, destination),
    });
  }

  async uploadDocument(
    file: File,
    destination: string = 'documents'
  ): Promise<UploadedFile> {
    return this.uploadFile(file, {
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
      ],
      maxSize: 10 * 1024 * 1024, // 10MB
      destination: join(this.uploadDir, destination),
    });
  }

  async uploadAvatar(
    file: File
  ): Promise<UploadedFile> {
    return this.uploadFile(file, {
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: 2 * 1024 * 1024, // 2MB
      destination: join(this.uploadDir, 'avatars'),
    });
  }

  async uploadAttachment(
    file: File,
    destination: string = 'attachments'
  ): Promise<UploadedFile> {
    return this.uploadFile(file, {
      allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-rar-compressed',
      ],
      maxSize: 20 * 1024 * 1024, // 20MB
      destination: join(this.uploadDir, destination),
    });
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await stat(dirPath);
    } catch (error) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  getFileUrl(filename: string, subdirectory: string = ''): string {
    const path = subdirectory ? join(subdirectory, filename) : filename;
    return `/uploads/${path}`;
  }

  getFilePath(filename: string, subdirectory: string = ''): string {
    const path = subdirectory ? join(subdirectory, filename) : filename;
    return join(this.uploadDir, path);
  }
}

export const fileUploadService = new FileUploadService();

// File validation utilities
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Maximum size is 5MB.' };
  }

  return { isValid: true };
}

export function validateDocumentFile(file: File): { isValid: boolean; error?: string } {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only PDF, DOC, DOCX, TXT, and CSV files are allowed.' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Maximum size is 10MB.' };
  }

  return { isValid: true };
}

export function validateAvatarFile(file: File): { isValid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 2 * 1024 * 1024; // 2MB

  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' };
  }

  if (file.size > maxSize) {
    return { isValid: false, error: 'File size too large. Maximum size is 2MB.' };
  }

  return { isValid: true };
}

export function getFileExtension(filename: string): string {
  return extname(filename).toLowerCase();
}

export function getFileSizeString(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
