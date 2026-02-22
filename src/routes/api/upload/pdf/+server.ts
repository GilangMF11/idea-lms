import { json } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { verifyToken } from '$lib/auth.js';
import type { RequestHandler } from '@sveltejs/kit';

const ALLOWED_TYPES = ['application/pdf'];
const MAX_SIZE = 15 * 1024 * 1024; // 15MB

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user || !['TEACHER', 'ADMIN'].includes(user.role || '')) {
      return json({ error: 'Only teachers and admins can upload PDFs' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('pdf') as File || formData.get('file') as File;

    if (!file) {
      return json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return json({ error: 'File must be a PDF' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return json({ error: 'PDF size must be less than 15MB' }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), 'static', 'uploads', 'reading-texts');
    await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const fileName = `${timestamp}-${randomString}.${ext}`;
    const filePath = join(uploadsDir, fileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/reading-texts/${fileName}`;

    return json({
      url: publicUrl,
      fileName,
      size: file.size,
      type: file.type
    });
  } catch (err) {
    console.error('PDF upload error:', err);
    return json({ error: 'Failed to upload PDF' }, { status: 500 });
  }
};
