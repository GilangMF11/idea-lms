import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { fileUploadService, validateImageFile, validateDocumentFile, validateAvatarFile } from '$lib/file-upload.js';
import { getAuthUser, apiError, requireTeacher, requireAdmin } from '$lib/api-utils.js';

export const POST: RequestHandler = async ({ request }: { request: any }) => {
  try {
    const user = getAuthUser(request);

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
    return apiError(error);
  }
};
