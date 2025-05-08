import Database from 'better-sqlite3';
import { Poll, PollQuestion, PollAnswer, PollSubmission } from './mockApi';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize the database
const dbPath = path.join(dataDir, 'quickpolls.db');
const db = new Database(dbPath);

// Create tables if they don't exist
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Polls table
  db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      is_restricted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Questions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      text TEXT NOT NULL,
      type TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    )
  `);

  // Options table
  db.exec(`
    CREATE TABLE IF NOT EXISTS options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      text TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // Submissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      user_id TEXT,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE
    )
  `);

  // Completed polls table (to track which polls users have completed)
  db.exec(`
    CREATE TABLE IF NOT EXISTS completed_polls (
      user_id TEXT NOT NULL,
      poll_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      PRIMARY KEY (user_id, poll_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    )
  `);
}

// Initialize the database
initializeDatabase();

// Helper function to generate a simple UUID
export const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// User operations
export const userOperations = {
  createUser: (username: string, password: string) => {
    const id = generateId();
    const createdAt = new Date().toISOString();
    
    try {
      const stmt = db.prepare('INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?)');
      stmt.run(id, username, password, createdAt);
      return { success: true, userId: id };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Username already exists' };
    }
  },
  
  getUserByCredentials: (username: string, password: string) => {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');
      const user = stmt.get(username, password);
      return user || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },
  
  getUserById: (userId: string) => {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(userId);
      return user || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }
};

// Poll operations
export const pollOperations = {
  createPoll: (poll: Omit<Poll, 'id' | 'createdAt'> & { questions: Omit<PollQuestion, 'id'>[] }) => {
    const pollId = generateId();
    const createdAt = new Date().toISOString();
    
    try {
      db.transaction(() => {
        // Insert poll
        const pollStmt = db.prepare('INSERT INTO polls (id, title, description, created_by, created_at, is_restricted) VALUES (?, ?, ?, ?, ?, ?)');
        pollStmt.run(
          pollId,
          poll.title,
          poll.description,
          poll.createdBy,
          createdAt,
          poll.isRestricted ? 1 : 0
        );
        
        // Insert questions and options
        const questionStmt = db.prepare('INSERT INTO questions (id, poll_id, text, type, order_index) VALUES (?, ?, ?, ?, ?)');
        const optionStmt = db.prepare('INSERT INTO options (id, question_id, text, order_index) VALUES (?, ?, ?, ?)');
        
        poll.questions.forEach((question, qIndex) => {
          const questionId = generateId();
          
          questionStmt.run(
            questionId,
            pollId,
            question.text,
            question.type,
            qIndex
          );
          
          question.options.forEach((option, oIndex) => {
            const optionId = generateId();
            
            optionStmt.run(
              optionId,
              questionId,
              option.text,
              oIndex
            );
          });
        });
      })();
      
      return { success: true, pollId };
    } catch (error) {
      console.error('Error creating poll:', error);
      return { success: false, error: 'Failed to create poll' };
    }
  },
  
  getPollById: (pollId: string): { success: boolean; poll?: Poll; message?: string } => {
    try {
      // Get poll
      const pollStmt = db.prepare(`
        SELECT id, title, description, created_by as createdBy, created_at as createdAt, 
               is_restricted as isRestricted
        FROM polls 
        WHERE id = ?
      `);
      const poll = pollStmt.get(pollId);
      
      if (!poll) {
        return { success: false, message: 'Poll not found' };
      }
      
      // Get questions
      const questionsStmt = db.prepare(`
        SELECT id, text, type
        FROM questions
        WHERE poll_id = ?
        ORDER BY order_index
      `);
      const questions = questionsStmt.all(pollId) as Array<{ id: string; text: string; type: 'single' | 'multiple' }>;
      
      // Get options for each question
      const optionsStmt = db.prepare(`
        SELECT id, text
        FROM options
        WHERE question_id = ?
        ORDER BY order_index
      `);
      
      const questionsWithOptions = questions.map(q => {
        const options = optionsStmt.all(q.id) as Array<{ id: string; text: string }>;
        return {
          id: q.id,
          text: q.text,
          type: q.type as 'single' | 'multiple',
          options
        };
      });
      
      const pollData = poll as any;
      
      return {
        success: true,
        poll: {
          id: pollData.id,
          title: pollData.title,
          description: pollData.description,
          createdBy: pollData.createdBy,
          createdAt: pollData.createdAt,
          questions: questionsWithOptions,
          isRestricted: Boolean(pollData.isRestricted)
        }
      };
    } catch (error) {
      console.error('Error getting poll:', error);
      return { success: false, message: 'Error retrieving poll' };
    }
  },
  
  getAllPolls: () => {
    try {
      const stmt = db.prepare(`
        SELECT id, title, description, created_by as createdBy, created_at as createdAt,
               is_restricted as isRestricted
        FROM polls
        ORDER BY created_at DESC
      `);
      const polls = stmt.all();
      
      return { success: true, polls };
    } catch (error) {
      console.error('Error getting all polls:', error);
      return { success: false, error: 'Failed to retrieve polls' };
    }
  },
  
  submitPollAnswers: (pollId: string, answers: PollAnswer[], userId?: string) => {
    try {
      // Check if poll exists
      const pollStmt = db.prepare('SELECT * FROM polls WHERE id = ?');
      const poll = pollStmt.get(pollId);
      
      if (!poll) {
        return { success: false, message: 'Poll not found' };
      }
      
      // Check if poll is restricted and user is authenticated
      const pollData = poll as any;
      if (pollData.is_restricted && !userId) {
        return {
          success: false,
          message: 'Authentication required to answer this poll'
        };
      }
      
      // Check if user has already completed this poll
      if (userId) {
        const completedStmt = db.prepare('SELECT * FROM completed_polls WHERE user_id = ? AND poll_id = ?');
        const completed = completedStmt.get(userId, pollId);
        
        if (completed) {
          return { success: false, message: 'You have already completed this poll' };
        }
      }
      
      // Validate answers
      const questionsStmt = db.prepare('SELECT id, type FROM questions WHERE poll_id = ?');
      const questions = questionsStmt.all(pollId) as Array<{ id: string; type: string }>;
      
      // Check if all questions are answered
      const answeredQuestionIds = answers.map(a => a.questionId);
      const allQuestionIds = questions.map(q => q.id);
      
      const missingQuestions = allQuestionIds.filter(id => !answeredQuestionIds.includes(id));
      
      if (missingQuestions.length > 0) {
        return {
          success: false,
          message: `Please answer all questions. Missing ${missingQuestions.length} question(s).`
        };
      }
      
      // Validate answer types and options
      for (const answer of answers) {
        const question = questions.find(q => q.id === answer.questionId);
        
        if (!question) {
          return {
            success: false,
            message: `Invalid question ID: ${answer.questionId}`
          };
        }
        
        // For single-choice questions, only one option should be selected
        if (question.type === 'single' && answer.selectedOptions.length !== 1) {
          return {
            success: false,
            message: `Single-choice question requires exactly one answer.`
          };
        }
        
        // Validate that selected options exist
        const optionsStmt = db.prepare('SELECT id FROM options WHERE question_id = ?');
        const validOptions = optionsStmt.all(answer.questionId).map((o: any) => o.id);
        
        const invalidOptions = answer.selectedOptions.filter(optId => !validOptions.includes(optId));
        
        if (invalidOptions.length > 0) {
          return {
            success: false,
            message: `Invalid option selected for question.`
          };
        }
      }
      
      // Submit answers
      db.transaction(() => {
        // Create submission
        const submissionId = generateId();
        const submittedAt = new Date().toISOString();
        
        const submissionStmt = db.prepare('INSERT INTO submissions (id, poll_id, user_id, submitted_at) VALUES (?, ?, ?, ?)');
        submissionStmt.run(submissionId, pollId, userId || null, submittedAt);
        
        // Insert answers
        const answerStmt = db.prepare('INSERT INTO answers (id, submission_id, question_id, option_id) VALUES (?, ?, ?, ?)');
        
        for (const answer of answers) {
          for (const optionId of answer.selectedOptions) {
            answerStmt.run(generateId(), submissionId, answer.questionId, optionId);
          }
        }
        
        // Mark poll as completed for this user
        if (userId) {
          const completedStmt = db.prepare('INSERT INTO completed_polls (user_id, poll_id, completed_at) VALUES (?, ?, ?)');
          completedStmt.run(userId, pollId, submittedAt);
        }
      })();
      
      return { success: true, message: 'Thank you for completing the poll!' };
    } catch (error) {
      console.error('Error submitting poll answers:', error);
      return { success: false, message: 'Error submitting answers' };
    }
  },
  
  hasCompletedPoll: (pollId: string, userId?: string) => {
    if (!userId) return false;
    
    try {
      const stmt = db.prepare('SELECT * FROM completed_polls WHERE user_id = ? AND poll_id = ?');
      const completed = stmt.get(userId, pollId);
      
      return Boolean(completed);
    } catch (error) {
      console.error('Error checking completed poll:', error);
      return false;
    }
  }
};

// Insert sample data for testing
export function insertSampleData() {
  try {
    // Check if we already have data
    const result = db.prepare('SELECT COUNT(*) as count FROM polls').get() as { count: number };
    const pollCount = result.count;
    
    if (pollCount > 0) {
      console.log('Sample data already exists, skipping insertion');
      return;
    }
    
    // Create admin user
    const adminId = generateId();
    const adminStmt = db.prepare('INSERT INTO users (id, username, password, created_at) VALUES (?, ?, ?, ?)');
    adminStmt.run(adminId, 'admin', 'admin123', new Date().toISOString());
    
    // Create sample polls
    const samplePolls = [
      {
        title: 'Programming Languages Survey',
        description: 'Help us understand which programming languages are most popular among developers.',
        createdBy: adminId,
        isRestricted: false,
        questions: [
          {
            text: 'What is your primary programming language?',
            type: 'single' as const,
            options: [
              { text: 'JavaScript/TypeScript' },
              { text: 'Python' },
              { text: 'Java' },
              { text: 'C#' },
              { text: 'Other' }
            ]
          },
          {
            text: 'Which frameworks do you use regularly?',
            type: 'multiple' as const,
            options: [
              { text: 'React' },
              { text: 'Angular' },
              { text: 'Vue' },
              { text: 'Django' },
              { text: 'Spring' }
            ]
          },
          {
            text: 'How many years of experience do you have?',
            type: 'single' as const,
            options: [
              { text: 'Less than 1 year' },
              { text: '1-3 years' },
              { text: '4-6 years' },
              { text: '7-10 years' },
              { text: 'More than 10 years' }
            ]
          }
        ]
      },
      {
        title: 'Remote Work Preferences',
        description: 'Share your thoughts on remote work vs. office work.',
        createdBy: adminId,
        isRestricted: true,
        questions: [
          {
            text: 'What is your preferred work arrangement?',
            type: 'single' as const,
            options: [
              { text: 'Fully remote' },
              { text: 'Hybrid (some days remote, some in office)' },
              { text: 'Fully in-office' }
            ]
          },
          {
            text: 'Which aspects of remote work do you enjoy?',
            type: 'multiple' as const,
            options: [
              { text: 'No commute' },
              { text: 'Flexible schedule' },
              { text: 'Better work-life balance' },
              { text: 'Increased productivity' },
              { text: 'Cost savings' }
            ]
          },
          {
            text: 'What challenges do you face with remote work?',
            type: 'multiple' as const,
            options: [
              { text: 'Isolation/loneliness' },
              { text: 'Difficulty collaborating' },
              { text: 'Distractions at home' },
              { text: 'Blurred work/life boundaries' },
              { text: 'Technical issues' }
            ]
          }
        ]
      }
    ];
    
    for (const poll of samplePolls) {
      pollOperations.createPoll(poll as any);
    }
    
    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

// Insert sample data
insertSampleData();

export default {
  db,
  userOperations,
  pollOperations,
  generateId
};
