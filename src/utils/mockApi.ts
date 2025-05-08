// This is a mock API service to simulate backend functionality
// In a real application, this would be replaced with actual API calls
// Now using IndexedDB for browser-based persistence

import indexedDB, { userOperations, pollOperations, generateId, initializeDatabase } from './indexedDB';

export interface PollQuestion {
  id: string;
  text: string;
  type: 'single' | 'multiple';
  options: {
    id: string;
    text: string;
  }[];
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  questions: PollQuestion[];
  isRestricted: boolean; // If true, only authenticated users can answer
}

export interface PollAnswer {
  questionId: string;
  selectedOptions: string[];
}

export interface PollSubmission {
  id: string;
  pollId: string;
  userId?: string; // Optional for anonymous submissions
  answers: PollAnswer[];
  submittedAt: string;
}

// Mock delay to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Track current user session
let currentUserId: string | null = null;

// Initialize the database when the app starts
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

// Mock API functions
export const mockApi = {
  // Signup function
  signup: async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // Simulate network delay
    await delay(800);
    
    const result = await userOperations.createUser(username, password);
    
    if (!result.success) {
      return {
        success: false,
        message: 'Username already taken. Please choose another one.'
      };
    }
    
    return {
      success: true,
      message: 'Signup successful!'
    };
  },
  
  // Login function
  login: async (username: string, password: string): Promise<{ success: boolean; message?: string; userId?: string }> => {
    // Simulate network delay
    await delay(800);
    
    // Find user
    const user = await userOperations.getUserByCredentials(username, password);
    
    if (!user) {
      return {
        success: false,
        message: 'Invalid username or password.'
      };
    }
    
    // Set current user
    currentUserId = user.id;
    
    // Store in localStorage for persistence across page refreshes
    if (typeof window !== 'undefined') {
      localStorage.setItem('userId', user.id);
    }
    
    return {
      success: true,
      message: 'Login successful!',
      userId: user.id
    };
  },
  
  // Get poll by ID
  getPoll: async (pollId: string): Promise<{ success: boolean; poll?: Poll; message?: string }> => {
    await delay(500);
    
    return pollOperations.getPollById(pollId);
  },
  
  // Submit poll answers
  submitPollAnswers: async (pollId: string, answers: PollAnswer[], userId?: string): Promise<{ success: boolean; message: string }> => {
    await delay(800);
    
    return pollOperations.submitPollAnswers(pollId, answers, userId);
  },
  
  // Check if user has already completed a poll
  hasCompletedPoll: async (pollId: string, userId?: string): Promise<boolean> => {
    await delay(300);
    
    return pollOperations.hasCompletedPoll(pollId, userId);
  },
  
  // Get current user (if logged in)
  getCurrentUser: () => {
    if (!currentUserId) return null;
    return userOperations.getUserById(currentUserId);
  },
  
  // Get all polls
  getAllPolls: async () => {
    await delay(500);
    return pollOperations.getAllPolls();
  }
};

// Setup a global fetch mock to intercept API calls
const originalFetch = window.fetch;

window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  
  // Handle signup endpoint
  if (url === '/api/signup' && init?.method === 'POST') {
    const body = JSON.parse(init.body as string);
    const result = await mockApi.signup(body.username, body.password);
    
    return {
      ok: result.success,
      status: result.success ? 200 : 400,
      json: async () => ({ message: result.message })
    } as Response;
  }
  
  // Handle login endpoint
  if (url === '/api/login' && init?.method === 'POST') {
    const body = JSON.parse(init.body as string);
    const result = await mockApi.login(body.username, body.password);
    
    return {
      ok: result.success,
      status: result.success ? 200 : 401,
      json: async () => ({ message: result.message, userId: result.userId })
    } as Response;
  }
  
  // Handle get all polls endpoint
  if (url === '/api/polls' && (!init || init.method === 'GET')) {
    const result = await mockApi.getAllPolls();
    
    return {
      ok: true,
      status: 200,
      json: async () => result
    } as Response;
  }
  
  // Handle poll creation endpoint
  if (url === '/api/polls/create' && init?.method === 'POST') {
    const body = JSON.parse(init.body as string);
    const result = await pollOperations.createPoll(body);
    
    return {
      ok: result.success,
      status: result.success ? 201 : 400,
      json: async () => ({ message: result.success ? 'Poll created successfully' : result.error, pollId: result.pollId })
    } as Response;
  }
  
  // Handle get poll endpoint
  if (url.match(/\/api\/polls\/[\w-]+$/) && (!init || init.method === 'GET')) {
    const urlParts = url.split('/');
    const pollId = urlParts[urlParts.length - 1];
    
    console.log('Fetching poll with ID:', pollId);
    
    const result = await mockApi.getPoll(pollId);
    
    // If poll not found, return 404
    if (!result.success) {
      return {
        ok: false,
        status: 404,
        json: async () => ({ message: result.message || 'Poll not found' })
      } as Response;
    }
    
    return {
      ok: true,
      status: 200,
      json: async () => result
    } as Response;
  }
  
  // Handle check if poll is completed endpoint
  if (url.match(/\/api\/polls\/[\w-]+\/completed/) && (!init || init.method === 'GET')) {
    const pollId = url.split('/')[3]; // Extract pollId from URL
    const userId = new URL(url, 'http://localhost').searchParams.get('userId');
    const result = await mockApi.hasCompletedPoll(pollId, userId || undefined);
    
    return {
      ok: true,
      status: 200,
      json: async () => result
    } as Response;
  }
  
  // Handle poll submission endpoint
  if (url.match(/\/api\/polls\/submit\/[\w-]+$/) && init?.method === 'POST') {
    const pollId = url.split('/').pop();
    const body = JSON.parse(init.body as string);
    const result = await mockApi.submitPollAnswers(pollId!, body.answers, body.userId);
    
    return {
      ok: result.success,
      status: result.success ? 200 : 400,
      json: async () => ({ message: result.message })
    } as Response;
  }
  
  // For all other requests, use the original fetch
  return originalFetch(input, init);
};

export default mockApi;
