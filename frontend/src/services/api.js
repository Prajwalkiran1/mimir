export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  // Poll for status updates — time-based limit, adaptive interval
  async pollStatus(taskId, onUpdate) {
    const MAX_DURATION_MS = 30 * 60 * 1000; // 30-minute wall-clock cap
    const FAST_INTERVAL = 2000;  // first 30s: check every 2s
    const SLOW_INTERVAL = 5000;  // after 30s: back off to every 5s
    const FAST_PHASE_MS = 30000;

    const startTime = Date.now();

    const poll = async () => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= MAX_DURATION_MS) {
        console.error(`Polling timed out after 30 minutes for task ${taskId}`);
        onUpdate({ status: 'error', error: 'Processing timed out after 30 minutes' });
        return;
      }

      try {
        const status = await this.getStatus(taskId);

        onUpdate(status);

        if (status.status === 'processing' || status.status === 'queued') {
          const interval = elapsed < FAST_PHASE_MS ? FAST_INTERVAL : SLOW_INTERVAL;
          setTimeout(poll, interval);
        }
        // completed / failed — stop polling; onUpdate already called above
      } catch (error) {
        console.error(`Polling error for task ${taskId}:`, error);
        const interval = elapsed < FAST_PHASE_MS ? FAST_INTERVAL : SLOW_INTERVAL;
        setTimeout(poll, interval);
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

  async getPipelineLogs(taskId) {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/pipeline-logs/${taskId}`);
      if (!response.ok) throw new Error(`Pipeline logs fetch failed: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('Pipeline logs error:', error);
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
