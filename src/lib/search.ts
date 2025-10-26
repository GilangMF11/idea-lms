import { prisma } from './database.js';

export interface SearchOptions {
  query: string;
  classId?: string;
  userId?: string;
  type?: 'all' | 'reading' | 'drafts' | 'exercises' | 'chat' | 'annotations';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class SearchService {
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { query, classId, userId, type = 'all', limit = 20, offset = 0 } = options;
    
    if (!query.trim()) {
      return [];
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const results: SearchResult[] = [];

    try {
      if (type === 'all' || type === 'reading') {
        const readingTexts = await this.searchReadingTexts(searchTerm, classId, limit, offset);
        results.push(...readingTexts);
      }

      if (type === 'all' || type === 'drafts') {
        const drafts = await this.searchWritingDrafts(searchTerm, classId, userId, limit, offset);
        results.push(...drafts);
      }

      if (type === 'all' || type === 'exercises') {
        const exercises = await this.searchExercises(searchTerm, classId, limit, offset);
        results.push(...exercises);
      }

      if (type === 'all' || type === 'chat') {
        const chatMessages = await this.searchChatMessages(searchTerm, classId, limit, offset);
        results.push(...chatMessages);
      }

      if (type === 'all' || type === 'annotations') {
        const annotations = await this.searchAnnotations(searchTerm, classId, limit, offset);
        results.push(...annotations);
      }

      // Sort by relevance and date
      return results.sort((a, b) => {
        const aRelevance = this.calculateRelevance(a, query);
        const bRelevance = this.calculateRelevance(b, query);
        
        if (aRelevance !== bRelevance) {
          return bRelevance - aRelevance;
        }
        
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async searchReadingTexts(
    searchTerm: string,
    classId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      AND: [
        {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
            { author: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        { isActive: true },
      ],
    };

    if (classId) {
      whereClause.AND.push({ classId });
    }

    const texts = await prisma.readingText.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
    });

    return texts.map((text: any) => ({
      type: 'reading',
      id: text.id,
      title: text.title,
      content: text.content,
      createdAt: text.createdAt,
      updatedAt: text.updatedAt,
      metadata: {
        author: text.author,
        source: text.source,
        classId: text.classId,
      },
    }));
  }

  private async searchWritingDrafts(
    searchTerm: string,
    classId?: string,
    userId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      AND: [
        {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        { isActive: true },
      ],
    };

    if (classId) {
      whereClause.AND.push({ classId });
    }

    if (userId) {
      whereClause.AND.push({ userId });
    }

    const drafts = await prisma.writingDraft.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return drafts.map((draft: any) => ({
      type: 'draft',
      id: draft.id,
      title: draft.title,
      content: draft.content,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      metadata: {
        author: `${draft.user.firstName} ${draft.user.lastName}`,
        username: draft.user.username,
        classId: draft.classId,
        userId: draft.userId,
      },
    }));
  }

  private async searchExercises(
    searchTerm: string,
    classId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      AND: [
        {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        { isActive: true },
      ],
    };

    if (classId) {
      whereClause.AND.push({ classId });
    }

    const exercises = await prisma.exercise.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
    });

    return exercises.map((exercise: any) => ({
      type: 'exercise',
      id: exercise.id,
      title: exercise.title,
      content: exercise.description || exercise.content,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
      metadata: {
        type: exercise.type,
        dueDate: exercise.dueDate,
        classId: exercise.classId,
      },
    }));
  }

  private async searchChatMessages(
    searchTerm: string,
    classId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      content: { contains: searchTerm, mode: 'insensitive' },
    };

    if (classId) {
      whereClause.classId = classId;
    }

    const messages = await prisma.chatMessage.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return messages.map((message: any) => ({
      type: 'chat',
      id: message.id,
      title: `Message from ${message.user.username}`,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      metadata: {
        author: `${message.user.firstName} ${message.user.lastName}`,
        username: message.user.username,
        classId: message.classId,
      },
    }));
  }

  private async searchAnnotations(
    searchTerm: string,
    classId?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResult[]> {
    const whereClause: any = {
      content: { contains: searchTerm, mode: 'insensitive' },
      isPublic: true,
    };

    if (classId) {
      whereClause.classId = classId;
    }

    const annotations = await prisma.annotation.findMany({
      where: whereClause,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        readingText: {
          select: {
            title: true,
          },
        },
      },
    });

    return annotations.map((annotation: any) => ({
      type: 'annotation',
      id: annotation.id,
      title: `Annotation on ${annotation.readingText.title}`,
      content: annotation.content,
      createdAt: annotation.createdAt,
      updatedAt: annotation.updatedAt,
      metadata: {
        author: `${annotation.user.firstName} ${annotation.user.lastName}`,
        username: annotation.user.username,
        classId: annotation.classId,
        readingTextId: annotation.readingTextId,
        startPos: annotation.startPos,
        endPos: annotation.endPos,
      },
    }));
  }

  private calculateRelevance(result: SearchResult, query: string): number {
    const queryLower = query.toLowerCase();
    const titleLower = result.title.toLowerCase();
    const contentLower = result.content.toLowerCase();

    let relevance = 0;

    // Title matches are more relevant
    if (titleLower.includes(queryLower)) {
      relevance += 10;
    }

    // Content matches
    if (contentLower.includes(queryLower)) {
      relevance += 5;
    }

    // Exact matches are more relevant
    if (titleLower === queryLower) {
      relevance += 20;
    }

    // Recent content is slightly more relevant
    const daysSinceUpdate = (Date.now() - result.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      relevance += 2;
    }

    return relevance;
  }

  async getSearchSuggestions(query: string, classId?: string): Promise<string[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const suggestions: string[] = [];

    try {
      // Get unique titles from reading texts
      const readingTexts = await prisma.readingText.findMany({
        where: {
          title: { contains: searchTerm, mode: 'insensitive' },
          classId: classId || undefined,
          isActive: true,
        },
        select: { title: true },
        take: 5,
      });

      suggestions.push(...readingTexts.map((text: any) => text.title));

      // Get unique titles from writing drafts
      const drafts = await prisma.writingDraft.findMany({
        where: {
          title: { contains: searchTerm, mode: 'insensitive' },
          classId: classId || undefined,
          isActive: true,
        },
        select: { title: true },
        take: 5,
      });

      suggestions.push(...drafts.map((draft: any) => draft.title));

      // Get unique titles from exercises
      const exercises = await prisma.exercise.findMany({
        where: {
          title: { contains: searchTerm, mode: 'insensitive' },
          classId: classId || undefined,
          isActive: true,
        },
        select: { title: true },
        take: 5,
      });

      suggestions.push(...exercises.map((exercise: any) => exercise.title));

      // Remove duplicates and return top 10
      return [...new Set(suggestions)].slice(0, 10);
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  }
}

export const searchService = new SearchService();
