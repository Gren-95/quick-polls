// This is a mock API service to simulate backend functionality
// In a real application, this would be replaced with actual API calls

interface User {
  username: string;
  password: string;
}

// Simulate a database of users
const users: User[] = [];

// Mock delay to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export const mockApi = {
  // Signup function
  signup: async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // Simulate network delay
    await delay(800);
    
    // Check if username already exists
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
      return {
        success: false,
        message: 'Username already taken. Please choose another one.'
      };
    }
    
    // Add new user to our "database"
    users.push({ username, password });
    
    return {
      success: true,
      message: 'Signup successful!'
    };
  },
  
  // Login function (for future implementation)
  login: async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // Simulate network delay
    await delay(800);
    
    // Find user
    const user = users.find(user => user.username === username && user.password === password);
    
    if (!user) {
      return {
        success: false,
        message: 'Invalid username or password.'
      };
    }
    
    return {
      success: true,
      message: 'Login successful!'
    };
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
      json: async () => ({ message: result.message })
    } as Response;
  }
  
  // For all other requests, use the original fetch
  return originalFetch(input, init);
};

export default mockApi;
