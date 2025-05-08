import { Poll, PollQuestion, PollAnswer, PollSubmission } from './mockApi';

// Database name and version
const DB_NAME = 'quickPolls';
const DB_VERSION = 1;

// Database schema
const STORES = {
  USERS: 'users',
  POLLS: 'polls',
  SUBMISSIONS: 'submissions',
  COMPLETED_POLLS: 'completedPolls'
};

// Helper function to generate a simple UUID
export const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Open database connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening database');
      reject(new Error('Could not open IndexedDB'));
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: true });
      }
      
      if (!db.objectStoreNames.contains(STORES.POLLS)) {
        db.createObjectStore(STORES.POLLS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.SUBMISSIONS)) {
        const submissionStore = db.createObjectStore(STORES.SUBMISSIONS, { keyPath: 'id' });
        submissionStore.createIndex('pollId', 'pollId', { unique: false });
        submissionStore.createIndex('userId', 'userId', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.COMPLETED_POLLS)) {
        const completedStore = db.createObjectStore(STORES.COMPLETED_POLLS, { keyPath: 'id' });
        completedStore.createIndex('userId', 'userId', { unique: false });
        completedStore.createIndex('pollId', 'pollId', { unique: false });
        completedStore.createIndex('userPoll', ['userId', 'pollId'], { unique: true });
      }
    };
  });
};

// Generic function to perform a database operation
const dbOperation = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    
    const request = operation(store);
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
};

// User operations
export const userOperations = {
  createUser: async (username: string, password: string): Promise<{ success: boolean; userId?: string; error?: string }> => {
    try {
      // Check if username already exists
      const db = await openDB();
      const tx = db.transaction(STORES.USERS, 'readonly');
      const store = tx.objectStore(STORES.USERS);
      const index = store.index('username');
      
      const existingUser = await new Promise<any>((resolve) => {
        const request = index.get(username);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      
      if (existingUser) {
        return { success: false, error: 'Username already taken' };
      }
      
      // Create new user
      const userId = generateId();
      const user = {
        id: userId,
        username,
        password, // In a real app, this would be hashed
        createdAt: new Date().toISOString()
      };
      
      await dbOperation(STORES.USERS, 'readwrite', (store) => store.add(user));
      
      return { success: true, userId };
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, error: 'Failed to create user' };
    }
  },
  
  getUserByCredentials: async (username: string, password: string): Promise<any> => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORES.USERS, 'readonly');
      const store = tx.objectStore(STORES.USERS);
      const index = store.index('username');
      
      const user = await new Promise<any>((resolve) => {
        const request = index.get(username);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      
      if (user && user.password === password) {
        return user;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },
  
  getUserById: async (userId: string): Promise<any> => {
    try {
      return await dbOperation(STORES.USERS, 'readonly', (store) => store.get(userId));
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }
};

// Poll operations
export const pollOperations = {
  createPoll: async (poll: Omit<Poll, 'id' | 'createdAt'>): Promise<{ success: boolean; pollId?: string; error?: string }> => {
    try {
      const pollId = generateId();
      const newPoll = {
        ...poll,
        id: pollId,
        createdAt: new Date().toISOString()
      };
      
      await dbOperation(STORES.POLLS, 'readwrite', (store) => store.add(newPoll));
      
      return { success: true, pollId };
    } catch (error) {
      console.error('Error creating poll:', error);
      return { success: false, error: 'Failed to create poll' };
    }
  },
  
  getPollById: async (pollId: string): Promise<{ success: boolean; poll?: Poll; message?: string }> => {
    try {
      const poll = await dbOperation<Poll>(STORES.POLLS, 'readonly', (store) => store.get(pollId));
      
      if (!poll) {
        return { success: false, message: 'Poll not found' };
      }
      
      return { success: true, poll };
    } catch (error) {
      console.error('Error getting poll:', error);
      return { success: false, message: 'Error retrieving poll' };
    }
  },
  
  getAllPolls: async (): Promise<{ success: boolean; polls?: Poll[]; error?: string }> => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORES.POLLS, 'readonly');
      const store = tx.objectStore(STORES.POLLS);
      
      const polls = await new Promise<Poll[]>((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve([]);
      });
      
      return { success: true, polls };
    } catch (error) {
      console.error('Error getting all polls:', error);
      return { success: false, error: 'Failed to retrieve polls' };
    }
  },
  
  submitPollAnswers: async (pollId: string, answers: PollAnswer[], userId?: string): Promise<{ success: boolean; message: string }> => {
    try {
      // Get the poll
      const { success, poll } = await pollOperations.getPollById(pollId);
      
      if (!success || !poll) {
        return { success: false, message: 'Poll not found' };
      }
      
      // Check if poll is restricted and user is authenticated
      if (poll.isRestricted && !userId) {
        return { success: false, message: 'Authentication required to answer this poll' };
      }
      
      // Check if user has already completed this poll
      if (userId) {
        const hasCompleted = await pollOperations.hasCompletedPoll(pollId, userId);
        if (hasCompleted) {
          return { success: false, message: 'You have already completed this poll' };
        }
      }
      
      // Validate that all questions are answered
      const answeredQuestionIds = answers.map(a => a.questionId);
      const allQuestionIds = poll.questions.map(q => q.id);
      
      const missingQuestions = allQuestionIds.filter(id => !answeredQuestionIds.includes(id));
      
      if (missingQuestions.length > 0) {
        return {
          success: false,
          message: `Please answer all questions. Missing ${missingQuestions.length} question(s).`
        };
      }
      
      // Validate answers
      for (const answer of answers) {
        const question = poll.questions.find(q => q.id === answer.questionId);
        
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
            message: `Question '${question.text}' requires exactly one answer.`
          };
        }
        
        // Validate that selected options exist in the question
        const validOptionIds = question.options.map(o => o.id);
        const invalidOptions = answer.selectedOptions.filter(optId => !validOptionIds.includes(optId));
        
        if (invalidOptions.length > 0) {
          return {
            success: false,
            message: `Invalid option selected for question '${question.text}'.`
          };
        }
      }
      
      // Create submission
      const submissionId = generateId();
      const submission: PollSubmission = {
        id: submissionId,
        pollId,
        userId,
        answers,
        submittedAt: new Date().toISOString()
      };
      
      await dbOperation(STORES.SUBMISSIONS, 'readwrite', (store) => store.add(submission));
      
      // Mark poll as completed for this user
      if (userId) {
        const completedPoll = {
          id: generateId(),
          userId,
          pollId,
          completedAt: new Date().toISOString()
        };
        
        await dbOperation(STORES.COMPLETED_POLLS, 'readwrite', (store) => store.add(completedPoll));
      }
      
      return { success: true, message: 'Thank you for completing the poll!' };
    } catch (error) {
      console.error('Error submitting poll answers:', error);
      return { success: false, message: 'Error submitting answers' };
    }
  },
  
  hasCompletedPoll: async (pollId: string, userId?: string): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      const db = await openDB();
      const tx = db.transaction(STORES.COMPLETED_POLLS, 'readonly');
      const store = tx.objectStore(STORES.COMPLETED_POLLS);
      const index = store.index('userPoll');
      
      const result = await new Promise<any>((resolve) => {
        const request = index.get([userId, pollId]);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      
      return Boolean(result);
    } catch (error) {
      console.error('Error checking completed poll:', error);
      return false;
    }
  }
};

// Insert sample data for testing
export const insertSampleData = async (): Promise<void> => {
  try {
    // Check if we already have data
    const { success, polls } = await pollOperations.getAllPolls();
    
    if (success && polls && polls.length > 0) {
      console.log('Sample data already exists, skipping insertion');
      return;
    }
    
    // Create admin user
    const { userId: adminId } = await userOperations.createUser('admin', 'admin123');
    
    if (!adminId) {
      console.error('Failed to create admin user');
      return;
    }
    
    // Create sample polls
    const samplePolls = [
      {
        title: 'Programming Languages Survey',
        description: 'Help us understand which programming languages are most popular among developers.',
        createdBy: adminId,
        isRestricted: false,
        questions: [
          {
            id: generateId(),
            text: 'What is your primary programming language?',
            type: 'single' as const,
            options: [
              { id: generateId(), text: 'JavaScript/TypeScript' },
              { id: generateId(), text: 'Python' },
              { id: generateId(), text: 'Java' },
              { id: generateId(), text: 'C#' },
              { id: generateId(), text: 'Other' }
            ]
          },
          {
            id: generateId(),
            text: 'Which frameworks do you use regularly?',
            type: 'multiple' as const,
            options: [
              { id: generateId(), text: 'React' },
              { id: generateId(), text: 'Angular' },
              { id: generateId(), text: 'Vue' },
              { id: generateId(), text: 'Django' },
              { id: generateId(), text: 'Spring' }
            ]
          },
          {
            id: generateId(),
            text: 'How many years of experience do you have?',
            type: 'single' as const,
            options: [
              { id: generateId(), text: 'Less than 1 year' },
              { id: generateId(), text: '1-3 years' },
              { id: generateId(), text: '4-6 years' },
              { id: generateId(), text: '7-10 years' },
              { id: generateId(), text: 'More than 10 years' }
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
            id: generateId(),
            text: 'What is your preferred work arrangement?',
            type: 'single' as const,
            options: [
              { id: generateId(), text: 'Fully remote' },
              { id: generateId(), text: 'Hybrid (some days remote, some in office)' },
              { id: generateId(), text: 'Fully in-office' }
            ]
          },
          {
            id: generateId(),
            text: 'Which aspects of remote work do you enjoy?',
            type: 'multiple' as const,
            options: [
              { id: generateId(), text: 'No commute' },
              { id: generateId(), text: 'Flexible schedule' },
              { id: generateId(), text: 'Better work-life balance' },
              { id: generateId(), text: 'Increased productivity' },
              { id: generateId(), text: 'Cost savings' }
            ]
          },
          {
            id: generateId(),
            text: 'What challenges do you face with remote work?',
            type: 'multiple' as const,
            options: [
              { id: generateId(), text: 'Isolation/loneliness' },
              { id: generateId(), text: 'Difficulty collaborating' },
              { id: generateId(), text: 'Distractions at home' },
              { id: generateId(), text: 'Blurred work/life boundaries' },
              { id: generateId(), text: 'Technical issues' }
            ]
          }
        ]
      }
    ];
    
    for (const poll of samplePolls) {
      await pollOperations.createPoll(poll);
    }
    
    console.log('Sample data inserted successfully');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};

// Initialize the database and insert sample data
export const initializeDatabase = async (): Promise<void> => {
  try {
    await openDB();
    await insertSampleData();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

export default {
  userOperations,
  pollOperations,
  generateId,
  initializeDatabase
};
