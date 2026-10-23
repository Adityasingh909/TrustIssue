/**
 * Reusable API Service Client for TrustIssues.
 * Connects React frontend directly to the Express backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const error = new Error(data?.error?.message || `HTTP ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.details = data?.error?.details;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const networkError = new Error('Unable to connect to TrustIssues backend service. Please verify the server is running on port 5001.');
        networkError.status = 0;
        throw networkError;
      }
      throw err;
    }
  }

  // Health
  async getHealth() {
    return this.request('/health');
  }

  // Model Connectivity Health
  async getModelHealth() {
    return this.request('/health/model');
  }

  // Metrics Summary
  async getMetricsSummary() {
    const res = await this.request('/metrics/summary');
    return res.data;
  }

  // Agents
  async listAgents() {
    const res = await this.request('/agents');
    return res.data;
  }

  async getAgentById(id) {
    const res = await this.request(`/agents/${id}`);
    return res.data;
  }

  async createAgent(payload) {
    const res = await this.request('/agents', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  // Test Cases
  async listTestCases(params = {}) {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.severity) query.append('severity', params.severity);
    if (params.search) query.append('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request(`/test-cases${queryString}`);
    return res.data;
  }

  async getTestCaseById(id) {
    const res = await this.request(`/test-cases/${id}`);
    return res.data;
  }

  // Test Runs
  async createTestRun(payload) {
    const res = await this.request('/test-runs', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  async listTestRuns(params = {}) {
    const query = new URLSearchParams();
    if (params.agentId) query.append('agentId', params.agentId);
    if (params.testCaseId) query.append('testCaseId', params.testCaseId);
    if (params.status) query.append('status', params.status);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await this.request(`/test-runs${queryString}`);
    return res.data;
  }

  async getTestRunById(id) {
    const res = await this.request(`/test-runs/${id}`);
    return res.data;
  }

  // Repeated Security Trials & Agent Comparisons
  async executeTrials(payload) {
    const res = await this.request('/test-runs/trials', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  // Documents
  async inspectDocument(payload) {
    const res = await this.request('/documents/inspect', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  // Evidence-Based Security Reports
  async generateReport(payload = {}) {
    const res = await this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return res.data;
  }

  async listReports() {
    const res = await this.request('/reports');
    return res.data;
  }

  async getReportById(id) {
    const res = await this.request(`/reports/${id}`);
    return res.data;
  }

  async getReportMarkdown(id) {
    const response = await fetch(`${this.baseUrl}/reports/${id}/markdown`);
    if (!response.ok) {
      throw new Error(`Failed to fetch report markdown: HTTP ${response.status}`);
    }
    return response.text();
  }
}

export const api = new ApiClient();
export default api;
