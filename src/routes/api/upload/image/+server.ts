import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';
import type { RequestHandler } from '@sveltejs/kit';

// SECURITY: Allowed image extensions (allowlist)
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

// SECURITY: Magic byte signatures for image formats
const MAGIC_BYTES: Record<string, number[][]> = {
  jpg: [[0xFF, 0xD8, 0xFF]],
  jpeg: [[0xFF, 0xD8, 0xFF]],
  png: [[0x89, 0x50, 0x4E, 0x47]],
  gif: [[0x47, 0x49, 0x46, 0x38]],
  webp: [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  const signatures = MAGIC_BYTES[extension];
  if (!signatures) return true; // SVG has no magic bytes, validated by type
  
  return signatures.some(sig => 
    sig.every((byte, index) => buffer[index] === byte)
  );
}

// GET - Not implemented for image upload
export const GET: RequestHandler = async () => {
  return json({ error: 'Method not allowed' }, { status: 405 });
};

// POST - Upload image
export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role)) {
      return json({ error: 'Only teachers and admins can upload images' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return json({ error: 'No image file provided' }, { status: 400 });
    }

    // SECURITY: Validate file type via Content-Type header
    if (!file.type.startsWith('image/')) {
      return json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return json({ error: 'Image size must be less than 5MB' }, { status: 400 });
    }

    // SECURITY: Validate extension against allowlist
    const originalName = file.name || '';
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return json({ error: `File type .${fileExtension} is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SECURITY: Validate magic bytes to prevent MIME spoofing
    if (!validateMagicBytes(buffer, fileExtension)) {
      return json({ error: 'File content does not match its extension. Upload rejected.' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'static', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, ignore error
    }

    // Generate unique filename with SAFE extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `/uploads/${fileName}`;
    
    return json({ 
      url: publicUrl,
      fileName: fileName,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Image upload error:', error);
    return json({ error: 'Failed to upload image' }, { status: 500 });
  }
};

