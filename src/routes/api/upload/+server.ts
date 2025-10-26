import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { fileUploadService, validateImageFile, validateDocumentFile, validateAvatarFile } from '$lib/file-upload.js';
import { verifyToken } from '$lib/auth.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (!user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type) {
      return json({ error: 'File type is required' }, { status: 400 });
    }

    let uploadedFile;

    switch (type) {
      case 'image':
        const imageValidation = validateImageFile(file);
        if (!imageValidation.isValid) {
          return json({ error: imageValidation.error }, { status: 400 });
        }
        uploadedFile = await fileUploadService.uploadImage(file);
        break;

      case 'document':
        const documentValidation = validateDocumentFile(file);
        if (!documentValidation.isValid) {
          return json({ error: documentValidation.error }, { status: 400 });
        }
        uploadedFile = await fileUploadService.uploadDocument(file);
        break;

      case 'avatar':
        const avatarValidation = validateAvatarFile(file);
        if (!avatarValidation.isValid) {
          return json({ error: avatarValidation.error }, { status: 400 });
        }
        uploadedFile = await fileUploadService.uploadAvatar(file);
        break;

      case 'attachment':
        uploadedFile = await fileUploadService.uploadAttachment(file);
        break;

      default:
        return json({ error: 'Invalid file type' }, { status: 400 });
    }

    return json({ 
      message: 'File uploaded successfully',
      file: uploadedFile,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
