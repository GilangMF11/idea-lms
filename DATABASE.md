# Database Schema - LMS IDEA

## Overview
Database schema untuk Learning Management System (LMS) Light yang mendukung fitur collaborative learning, writing, dan peer review.

## Setup Database

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Buat file `.env` di root project dengan konfigurasi berikut:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/lms_light?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# OpenAI API Key (untuk AI features)
OPENAI_API_KEY="your-openai-api-key-here"

# App Configuration
NODE_ENV="development"
PORT=3000
```

### 3. Setup PostgreSQL Database
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb lms_light
```

### 4. Run Migration
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run migration with seed data
npm run db:migrate
```

### 5. Reset Database (jika diperlukan)
```bash
npm run db:reset
```

## Database Schema

### Core Tables

#### Users
- **id**: Primary key (CUID)
- **email**: Unique email address
- **username**: Unique username
- **password**: Hashed password
- **firstName**: First name
- **lastName**: Last name
- **role**: User role (STUDENT, TEACHER, ADMIN)
- **avatar**: Optional avatar URL
- **isActive**: Account status
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### Classes
- **id**: Primary key (CUID)
- **name**: Class name
- **description**: Class description
- **code**: Unique class code
- **teacherId**: Foreign key to Users
- **isActive**: Class status
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### ClassStudents
- **id**: Primary key (CUID)
- **classId**: Foreign key to Classes
- **studentId**: Foreign key to Users
- **joinedAt**: Join timestamp

### Reading Features

#### ReadingTexts
- **id**: Primary key (CUID)
- **title**: Text title
- **content**: Text content
- **classId**: Foreign key to Classes
- **author**: Text author
- **source**: Text source
- **isActive**: Text status
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### Annotations
- **id**: Primary key (CUID)
- **readingTextId**: Foreign key to ReadingTexts
- **userId**: Foreign key to Users
- **classId**: Foreign key to Classes
- **content**: Annotation content
- **startPos**: Start position in text
- **endPos**: End position in text
- **color**: Highlight color
- **isPublic**: Public visibility
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### ChatMessages
- **id**: Primary key (CUID)
- **classId**: Foreign key to Classes
- **userId**: Foreign key to Users
- **content**: Message content
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

### Writing Features

#### WritingOutlines
- **id**: Primary key (CUID)
- **title**: Outline title
- **content**: JSON data for mind map
- **userId**: Foreign key to Users
- **classId**: Foreign key to Classes
- **isActive**: Outline status
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### WritingDrafts
- **id**: Primary key (CUID)
- **title**: Draft title
- **content**: Draft content
- **outlineId**: Foreign key to WritingOutlines (optional)
- **userId**: Foreign key to Users
- **classId**: Foreign key to Classes
- **isActive**: Draft status
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### PeerReviews
- **id**: Primary key (CUID)
- **draftId**: Foreign key to WritingDrafts
- **reviewerId**: Foreign key to Users
- **classId**: Foreign key to Classes
- **type**: Review type (PERSUASIVE, INTERACTIVE)
- **comment**: Review comment
- **rating**: Rating (1-5 scale)
- **isPositive**: Positive/negative feedback
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### Revisions
- **id**: Primary key (CUID)
- **draftId**: Foreign key to WritingDrafts
- **userId**: Foreign key to Users
- **classId**: Foreign key to Classes
- **status**: Revision status (PENDING, APPROVED, REJECTED, FINISHED)
- **content**: Revision content
- **feedback**: Teacher feedback
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### RevisionComments
- **id**: Primary key (CUID)
- **revisionId**: Foreign key to Revisions
- **userId**: Foreign key to Users
- **comment**: Comment content
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### FinalProducts
- **id**: Primary key (CUID)
- **title**: Final product title
- **content**: Final product content
- **draftId**: Foreign key to WritingDrafts
- **userId**: Foreign key to Users
- **classId**: Foreign key to Classes
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

### Exercise Features

#### Exercises
- **id**: Primary key (CUID)
- **title**: Exercise title
- **description**: Exercise description
- **content**: Exercise content
- **type**: Exercise type (INDIVIDUAL, GROUP)
- **readingTextId**: Foreign key to ReadingTexts (optional)
- **classId**: Foreign key to Classes
- **dueDate**: Due date
- **isActive**: Exercise status
- **createdAt**: Creation timestamp
- **updatedAt**: Last update timestamp

#### ExerciseSubmissions
- **id**: Primary key (CUID)
- **exerciseId**: Foreign key to Exercises
- **userId**: Foreign key to Users
- **answer**: Student answer
- **score**: Score (optional)
- **feedback**: Teacher feedback (optional)
- **submittedAt**: Submission timestamp
- **updatedAt**: Last update timestamp

### History Tracking

#### Histories
- **id**: Primary key (CUID)
- **tableName**: Table name
- **recordId**: Record ID
- **action**: Action type (CREATE, UPDATE, DELETE)
- **oldData**: Old data (JSON)
- **newData**: New data (JSON)
- **userId**: Foreign key to Users (optional)
- **classId**: Foreign key to Classes (optional)
- **createdAt**: Creation timestamp

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Classes
- `GET /api/classes` - Get classes
- `POST /api/classes` - Create class

### Reading Texts
- `GET /api/reading-texts` - Get reading texts
- `POST /api/reading-texts` - Create reading text

### Annotations
- `GET /api/annotations` - Get annotations
- `POST /api/annotations` - Create annotation

### Chat
- `GET /api/chat` - Get chat messages
- `POST /api/chat` - Send chat message

### Writing Drafts
- `GET /api/writing-drafts` - Get writing drafts
- `POST /api/writing-drafts` - Create writing draft

### Peer Reviews
- `GET /api/peer-reviews` - Get peer reviews
- `POST /api/peer-reviews` - Create peer review

### Revisions
- `GET /api/revisions` - Get revisions
- `POST /api/revisions` - Create revision
- `PATCH /api/revisions` - Update revision status

### Final Products
- `GET /api/final-products` - Get final products
- `POST /api/final-products` - Create final product

### History
- `GET /api/history` - Get history records

### AI Features
- `POST /api/ai/feedback` - Generate AI feedback

## Default Users

Setelah migration, tersedia user default:
- **Admin**: admin@lms.com / admin123
- **Teacher**: teacher@lms.com / teacher123
- **Student**: student@lms.com / student123

## Features

### Collaborative Learning
- Real-time chat per kelas
- Collaborative annotation pada reading texts
- Peer review system dengan rating dan feedback

### Writing Process
- Mind map/outline creation
- Draft writing dengan rich text editor
- Revision workflow dengan approval system
- Final product generation

### AI Integration
- AI feedback generation (terbatas 5 request per hari per user)
- Document analysis dan suggestions

### History Tracking
- Complete audit trail untuk semua perubahan
- Before/after comparison
- User activity tracking

## Security Features
- JWT-based authentication
- Role-based access control
- Password hashing dengan bcrypt
- Input validation dan sanitization
- Rate limiting untuk AI requests
