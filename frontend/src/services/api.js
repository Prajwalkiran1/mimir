const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getAuthHeaders(token = null) {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async uploadVideo(file, options) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    try {
      const response = await fetch(`${this.baseURL}/api/v1/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async getStatus(taskId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/status/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Status check error:', error);
      throw error;
    }
  }

  async getResults(taskId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/results/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Results fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Results fetch error:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/task/${taskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Task deletion failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Task deletion error:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  }

  // Poll for status updates
  async pollStatus(taskId, onUpdate, interval = 1000) {
    console.log(`Starting polling for task ${taskId}`);
    let pollCount = 0;
    const maxPolls = 300; // Maximum 10 minutes of polling
    
    const poll = async () => {
      pollCount++;
      console.log(`Poll attempt ${pollCount} for task ${taskId}`);
      
      try {
        const status = await this.getStatus(taskId);
        console.log(`Poll ${pollCount}: Status = ${status.status}, Progress = ${status.progress}%`);
        
        // Always call onUpdate to ensure UI updates
        onUpdate(status);
        
        // Continue polling if task is still processing or queued
        if (status.status === 'processing' || status.status === 'queued') {
          if (pollCount < maxPolls) {
            setTimeout(poll, interval);
          } else {
            console.error(`Max polling attempts reached for task ${taskId}`);
            onUpdate({ status: 'error', error: 'Maximum polling time exceeded' });
          }
        } else if (status.status === 'completed') {
          console.log(`Task ${taskId} completed successfully`);
          // Ensure final update is sent
          onUpdate(status);
        } else if (status.status === 'failed') {
          console.log(`Task ${taskId} failed`);
          // Ensure final update is sent
          onUpdate(status);
        }
      } catch (error) {
        console.error(`Polling error for task ${taskId}:`, error);
        // Continue polling even on errors to prevent blank pages
        if (pollCount < maxPolls) {
          setTimeout(poll, interval);
        } else {
          onUpdate({ status: 'error', error: 'Maximum polling time exceeded' });
        }
      }
    };

    poll();
  }

  // Authentication methods
  async login(username, password) {
    try {
      console.log('API: Logging in user:', { username });
      const response = await fetch(`${this.baseURL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('API: Login response status:', response.status);
      console.log('API: Login response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API: Login error response:', errorText);
        throw new Error(`Login failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('API: Login success result:', result);
      return result;
    } catch (error) {
      console.error('API: Login error:', error);
      throw error;
    }
  }

  async register(username, email, password) {
    try {
      console.log('API: Registering user:', { username, email });
      const response = await fetch(`${this.baseURL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      console.log('API: Register response status:', response.status);
      console.log('API: Register response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API: Register error response:', errorText);
        throw new Error(`Registration failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('API: Register success result:', result);
      return result;
    } catch (error) {
      console.error('API: Registration error:', error);
      throw error;
    }
  }

  async getCurrentUser(token) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/me`, {
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`Get current user failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  async logout(token) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        throw new Error(`Logout failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  async get(path, token = null) {
    const response = await fetch(`${this.baseURL}${path}`, {
      headers: this.getAuthHeaders(token),
    });
    if (!response.ok) throw new Error(`GET ${path} failed: ${response.statusText}`);
    return await response.json();
  }

  async post(path, body, token = null) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.getAuthHeaders(token) },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`POST ${path} failed: ${response.statusText}`);
    return await response.json();
  }
}

export const apiService = new ApiService();
export default apiService;
