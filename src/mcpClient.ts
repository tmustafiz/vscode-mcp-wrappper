// Using native fetch (available in Node.js 18+)

export interface ToolSpec {
  name: string;
  path: string;          // e.g. '/tools/runQuery'
  method?: string;       // POST by default
}

export interface McpClientConfig {
  baseUrl: string;
  authToken?: string;
  timeout?: number;
  retries?: number;
  allowInsecure?: boolean;
}

interface InternalConfig {
  baseUrl: string;
  authToken?: string;
  timeout: number;
  retries: number;
  allowInsecure: boolean;
}

export class McpClient {
  private session?: string;
  private config: InternalConfig;
  private isConnected = false;

  constructor(config: string | McpClientConfig) {
    if (typeof config === 'string') {
      this.config = {
        baseUrl: config,
        authToken: undefined,
        timeout: 10000,
        retries: 3,
        allowInsecure: false
      };
    } else {
      this.config = {
        timeout: 10000,
        retries: 3,
        allowInsecure: false,
        ...config
      };
    }
  }

  /** Validate and potentially fix the base URL */
  private async validateAndFixUrl(): Promise<string> {
    const originalUrl = this.config.baseUrl;
    
    // If URL already has protocol, use it
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      return originalUrl;
    }

    // Try HTTPS first, then HTTP if allowed
    const httpsUrl = `https://${originalUrl}`;
    try {
      const response = await fetch(`${httpsUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeout)
      });
      if (response.ok) {
        return httpsUrl;
      }
    } catch (error) {
      console.log(`HTTPS connection failed for ${httpsUrl}:`, error);
    }

    // Fallback to HTTP if allowed
    if (this.config.allowInsecure) {
      const httpUrl = `http://${originalUrl}`;
      try {
        const response = await fetch(`${httpUrl}/health`, { 
          method: 'GET',
          signal: AbortSignal.timeout(this.config.timeout)
        });
        if (response.ok) {
          console.warn(`Using insecure HTTP connection to ${httpUrl}`);
          return httpUrl;
        }
      } catch (error) {
        console.log(`HTTP connection failed for ${httpUrl}:`, error);
      }
    }

    throw new Error(`Cannot connect to MCP server at ${originalUrl}. Tried HTTPS and HTTP (if allowed).`);
  }

  /** One-off handshake with retry logic */
  async init() {
    const validatedUrl = await this.validateAndFixUrl();
    this.config.baseUrl = validatedUrl;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const r = await this.request('/initialize', 'POST');
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        this.session = (await r.json() as { sessionId: string }).sessionId;
        this.isConnected = true;
        console.log(`Successfully connected to MCP server at ${validatedUrl}`);
        return;
      } catch (error) {
        console.error(`Connection attempt ${attempt} failed:`, error);
        if (attempt === this.config.retries) {
          throw new Error(`Failed to connect to MCP server after ${this.config.retries} attempts: ${error}`);
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  /** Check if client is connected */
  isReady(): boolean {
    return this.isConnected && !!this.session;
  }

  /** Call an endpoint that streams Server-Sent Events */
  async stream<T = unknown>(path: string, body: unknown, onChunk: (data: T) => void) {
    if (!this.isReady()) {
      throw new Error('MCP client not initialized. Call init() first.');
    }

    // For POST requests with body, we need to use fetch with EventSource-like handling
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = (response.body as any)?.getReader();
    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    const processChunk = async () => {
      try {
        const { done, value } = await reader.read();
        if (done) return;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              onChunk(JSON.parse(data));
            }
          }
        }

        await processChunk();
      } catch (error) {
        console.error('Stream processing error:', error);
      }
    };

    processChunk();
    return () => reader.cancel();
  }

  /** Fire-and-forget JSON call with retry logic */
  async json<T = unknown>(path: string, body: unknown): Promise<T> {
    if (!this.isReady()) {
      throw new Error('MCP client not initialized. Call init() first.');
    }

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const r = await this.request(path, 'POST', body);
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        return await r.json() as T;
      } catch (error) {
        console.error(`Request attempt ${attempt} failed for ${path}:`, error);
        if (attempt === this.config.retries) {
          throw new Error(`Failed to call ${path} after ${this.config.retries} attempts: ${error}`);
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error('Unexpected error in json method');
  }

  private request(path: string, method: string, body?: unknown) {
    return fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout)
    });
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      ...(this.session ? { 'x-session': this.session } : {}),
      ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
      ...extra
    };
  }
}