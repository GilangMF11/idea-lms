import { prisma } from './database.js';
import { createHistory } from './history.js';

export async function createClassWithHistory(data: {
  name: string;
  description?: string;
  code: string;
  teacherId: string;
}) {
  const newClass = await prisma.class.create({
    data,
    include: {
      teacher: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  await createHistory({
    tableName: 'classes',
    recordId: newClass.id,
    action: 'CREATE',
    newData: newClass,
    userId: data.teacherId,
    classId: newClass.id,
  });

  return newClass;
}

export async function createReadingTextWithHistory(data: {
  title: string;
  content: string;
  classId: string;
  author?: string;
  source?: string;
  userId: string;
}) {
  const readingText = await prisma.readingText.create({
    data,
  });

  await createHistory({
    tableName: 'reading_texts',
    recordId: readingText.id,
    action: 'CREATE',
    newData: readingText,
    userId: data.userId,
    classId: data.classId,
  });

  return readingText;
}

export async function createWritingDraftWithHistory(data: {
  title: string;
  content: string;
  classId: string;
  userId: string;
  outlineId?: string;
}) {
  const draft = await prisma.writingDraft.create({
    data,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      outline: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  await createHistory({
    tableName: 'writing_drafts',
    recordId: draft.id,
    action: 'CREATE',
    newData: draft,
    userId: data.userId,
    classId: data.classId,
  });

  return draft;
}

export async function updateWritingDraftWithHistory(
  id: string,
  data: {
    title?: string;
    content?: string;
  },
  userId: string,
  classId: string
) {
  const oldDraft = await prisma.writingDraft.findUnique({
    where: { id },
  });

  if (!oldDraft) {
    throw new Error('Draft not found');
  }

  const updatedDraft = await prisma.writingDraft.update({
    where: { id },
    data,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      outline: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  await createHistory({
    tableName: 'writing_drafts',
    recordId: id,
    action: 'UPDATE',
    oldData: oldDraft,
    newData: updatedDraft,
    userId,
    classId,
  });

  return updatedDraft;
}

export async function createPeerReviewWithHistory(data: {
  draftId: string;
  classId: string;
  reviewerId: string;
  type: 'PERSUASIVE' | 'INTERACTIVE';
  comment: string;
  rating?: number;
  isPositive?: boolean;
}) {
  const review = await prisma.peerReview.create({
    data,
    include: {
      reviewer: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  await createHistory({
    tableName: 'peer_reviews',
    recordId: review.id,
    action: 'CREATE',
    newData: review,
    userId: data.reviewerId,
    classId: data.classId,
  });

  return review;
}

export async function createRevisionWithHistory(data: {
  draftId: string;
  classId: string;
  userId: string;
  content: string;
  feedback?: string;
}) {
  const revision = await prisma.revision.create({
    data: {
      ...data,
      status: 'PENDING',
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  await createHistory({
    tableName: 'revisions',
    recordId: revision.id,
    action: 'CREATE',
    newData: revision,
    userId: data.userId,
    classId: data.classId,
  });

  return revision;
}

export async function updateRevisionStatusWithHistory(
  id: string,
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FINISHED',
  userId: string,
  classId: string,
  feedback?: string
) {
  const oldRevision = await prisma.revision.findUnique({
    where: { id },
  });

  if (!oldRevision) {
    throw new Error('Revision not found');
  }

  const updatedRevision = await prisma.revision.update({
    where: { id },
    data: {
      status,
      feedback: feedback || oldRevision.feedback,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  await createHistory({
    tableName: 'revisions',
    recordId: id,
    action: 'UPDATE',
    oldData: oldRevision,
    newData: updatedRevision,
    userId,
    classId,
  });

  return updatedRevision;
}

export async function createFinalProductWithHistory(data: {
  title: string;
  content: string;
  draftId: string;
  classId: string;
  userId: string;
}) {
  const finalProduct = await prisma.finalProduct.create({
    data,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      draft: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  await createHistory({
    tableName: 'final_products',
    recordId: finalProduct.id,
    action: 'CREATE',
    newData: finalProduct,
    userId: data.userId,
    classId: data.classId,
  });

  return finalProduct;
}
