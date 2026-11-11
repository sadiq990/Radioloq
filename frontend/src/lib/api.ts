import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/api/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  register: (data: any) => api.post('/api/auth/register', data),
  logout: (refreshToken: string) => api.post('/api/auth/logout', { refreshToken }),
  me: () => api.get('/api/users/me'),
};

export const consultationApi = {
  list: (params?: any) => api.get('/api/consultations', { params }),
  get: (id: string) => api.get(`/api/consultations/${id}`),
  create: (data: any) => api.post('/api/consultations', data),
  updateStatus: (id: string, status: string) => api.put(`/api/consultations/${id}/status`, { status }),
  getMessages: (id: string) => api.get(`/api/consultations/${id}/messages`),
  addMessage: (id: string, content: string) => api.post(`/api/consultations/${id}/messages`, { content }),
};

export const reportApi = {
  list: (params?: any) => api.get('/api/reports', { params }),
  get: (id: string) => api.get(`/api/reports/${id}`),
  create: (data: any) => api.post('/api/reports', data),
  update: (id: string, data: any) => api.put(`/api/reports/${id}`, data),
  delete: (id: string) => api.delete(`/api/reports/${id}`),
  finalize: (id: string) => api.post(`/api/reports/${id}/finalize`),
  exportPdf: (id: string) => api.post(`/api/reports/${id}/export/pdf`, {}, { responseType: 'blob' }),
  exportDocx: (id: string) => api.post(`/api/reports/${id}/export/docx`, {}, { responseType: 'blob' }),
};

export const voiceApi = {
  status: () => api.get('/api/voice/status'),
  transcribe: (formData: FormData) =>
    api.post('/api/voice/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  structure: (text: string) => api.post('/api/voice/structure', { text }),
};

export const templateApi = {
  list: () => api.get('/api/templates'),
  get: (id: string) => api.get(`/api/templates/${id}`),
  create: (data: any) => api.post('/api/templates', data),
  update: (id: string, data: any) => api.put(`/api/templates/${id}`, data),
  delete: (id: string) => api.delete(`/api/templates/${id}`),
};

export const studyApi = {
  list: (params?: any) => api.get('/api/studies', { params }),
  get: (id: string) => api.get(`/api/studies/${id}`),
  upload: (formData: FormData) =>
    api.post('/api/studies/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/api/studies/${id}`),
  getFileUrl: (studyId: string, filename: string) => {
    const token = localStorage.getItem('accessToken') || '';
    return `${API_BASE}/api/studies/${studyId}/files/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  },
};

export const userApi = {
  updateMe: (data: any) => api.put('/api/users/me', data),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/api/users/me/password', data),
  updateClinic: (data: any) => api.put('/api/users/me/clinic', data),
  getDoctors: (params?: any) => api.get('/api/users/doctors', { params }),
  getDoctor: (id: string) => api.get(`/api/users/doctors/${id}`),
};

export const bridgeApi = {
  status: () => api.get('/api/bridge/status'),
  config: (data: any) => api.put('/api/bridge/config', data),
  test: () => api.post('/api/bridge/test'),
  logs: () => api.get('/api/bridge/logs'),
};
