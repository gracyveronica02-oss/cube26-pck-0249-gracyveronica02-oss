export interface ApiHeaders {
  orgId: string;
  role: string;
  userId: string;
}

export class PackManagerApiClient {
  private baseUrl: string;

  constructor(baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')) {
    this.baseUrl = baseUrl;
  }

  private async readResponse(res: Response) {
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || `API request failed (${res.status})` };
    }
    if (!res.ok) {
      throw new Error(data.message || data.error || `API request failed (${res.status})`);
    }
    return data;
  }

  private getHeaders(auth: ApiHeaders): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-org-id': auth.orgId,
      'x-user-role': auth.role,
      'x-user-id': auth.userId,
    };
  }

  public async getMetrics(auth: ApiHeaders) {
    const res = await fetch(`${this.baseUrl}/api/v1/dashboard/metrics`, {
      headers: this.getHeaders(auth),
    });
    return res.json();
  }

  public async getQCQueue(auth: ApiHeaders) {
    const res = await fetch(`${this.baseUrl}/api/v1/qc/queue`, {
      headers: this.getHeaders(auth),
    });
    return res.json();
  }

  public async getHealth() {\n    const res = await fetch(this.baseUrl + '/health');\n    return this.readResponse(res);\n  }\n\n  public async getPack(auth: ApiHeaders, packId: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/packs/${packId}`, {
      headers: this.getHeaders(auth),
    });
    return res.json();
  }

  public async getAnalysesForPack(auth: ApiHeaders, packId: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/packs/${packId}/analyses`, {
      headers: this.getHeaders(auth),
    });
    return this.readResponse(res);
  }

  public async getAnalysis(auth: ApiHeaders, analysisId: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/analyses/${analysisId}`, {
      headers: this.getHeaders(auth),
    });
    return this.readResponse(res);
  }

  public async triggerAnalysis(auth: ApiHeaders, packId: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/packs/${packId}/analyze`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(auth),
        'idempotency-key': `web_${Date.now()}`,
      },
      body: JSON.stringify({}),
    });
    return this.readResponse(res);
  }

  public async triggerRescan(auth: ApiHeaders, packId: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/packs/${packId}/rescan`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(auth),
        'idempotency-key': `web_rescan_${Date.now()}`,
      },
    });
    return res.json();
  }

  public async submitReview(
    auth: ApiHeaders,
    analysisId: string,
    data: { action: string; operatorVerdict: string; reasonCode: string; notes?: string }
  ) {
    const res = await fetch(`${this.baseUrl}/api/v1/analyses/${analysisId}/review`, {
      method: 'POST',
      headers: this.getHeaders(auth),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  public async getProducts(auth: ApiHeaders, query?: string) {
    const url = query
      ? `${this.baseUrl}/api/v1/products?query=${encodeURIComponent(query)}`
      : `${this.baseUrl}/api/v1/products`;
    const res = await fetch(url, {
      headers: this.getHeaders(auth),
    });
    return res.json();
  }

  public async createProduct(auth: ApiHeaders, product: any) {
    const res = await fetch(`${this.baseUrl}/api/v1/products`, {
      method: 'POST',
      headers: this.getHeaders(auth),
      body: JSON.stringify(product),
    });
    return res.json();
  }

  public async getOrders(auth: ApiHeaders, query?: string) {
    const url = query
      ? `${this.baseUrl}/api/v1/orders?q=${encodeURIComponent(query)}`
      : `${this.baseUrl}/api/v1/orders`;
    const res = await fetch(url, {
      headers: this.getHeaders(auth),
    });
    return res.json();
  }

  public async lookupOrder(auth: ApiHeaders, code: string) {
    const res = await fetch(`${this.baseUrl}/api/v1/orders/lookup?code=${encodeURIComponent(code)}`, {
      headers: this.getHeaders(auth),
    });
    return res.json();
  }

  public async patchOrder(auth: ApiHeaders, orderId: string, patch: any) {
    const res = await fetch(`${this.baseUrl}/api/v1/orders/${orderId}`, {
      method: 'PATCH',
      headers: this.getHeaders(auth),
      body: JSON.stringify(patch),
    });
    return res.json();
  }

  public async createOrder(auth: ApiHeaders, order: any) {
    const res = await fetch(`${this.baseUrl}/api/v1/orders`, {
      method: 'POST',
      headers: this.getHeaders(auth),
      body: JSON.stringify(order),
    });
    return res.json();
  }

  public async createPack(auth: ApiHeaders, pack: { unitId: string; orderId: string; packingStation?: string; operatorId?: string }) {
    const res = await fetch(`${this.baseUrl}/api/v1/packs`, {
      method: 'POST',
      headers: this.getHeaders(auth),
      body: JSON.stringify(pack),
    });
    return res.json();
  }

  public async uploadImage(auth: ApiHeaders, packId: string, image: { imageBase64: string; viewAngle?: string }) {
    const res = await fetch(`${this.baseUrl}/api/v1/packs/${packId}/images`, {
      method: 'POST',
      headers: this.getHeaders(auth),
      body: JSON.stringify(image),
    });
    return this.readResponse(res);
  }

  public async listPacks(auth: ApiHeaders, params?: { status?: string; orderId?: string }) {
    let url = `${this.baseUrl}/api/v1/packs`;
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.orderId) query.set('orderId', params.orderId);
    if (query.toString()) url += `?${query.toString()}`;

    const res = await fetch(url, {
      headers: this.getHeaders(auth),
    });
    return res.json();
  }
}

export const api = new PackManagerApiClient();
