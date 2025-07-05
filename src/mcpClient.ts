// Using native fetch (available in Node.js 18+)

export interface ToolSpec {
  name: string;
  path: string;          // e.g. '/tools/runQuery'
  method?: string;       // POST by default
}

export class McpClient {
  private session?: string;

  constructor(private baseUrl: string, private authToken?: string) {}

  /** One-off handshake */
  async init() {
    const r = await this.request('/initialize', 'POST');
    this.session = (await r.json() as { sessionId: string }).sessionId;
  }

  /** Call an endpoint that streams Server-Sent Events */
  async stream<T = unknown>(path: string, body: unknown, onChunk: (data: T) => void) {
    // For POST requests with body, we need to use fetch with EventSource-like handling
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
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

  /** Fire-and-forget JSON call */
  async json<T = unknown>(path: string, body: unknown): Promise<T> {
    const r = await this.request(path, 'POST', body);
    return r.json() as Promise<T>;
  }

  private request(path: string, method: string, body?: unknown) {
    return fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: body ? JSON.stringify(body) : undefined
    });
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      ...(this.session ? { 'x-session': this.session } : {}),
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      ...extra
    };
  }
}