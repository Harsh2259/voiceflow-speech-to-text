import axios from 'axios';
import { Transcription, TranscriptionRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const transcriptionApi = {
  /**
   * Fetch all historical transcriptions with optional language filter
   */
  async getAll(language?: string): Promise<Transcription[]> {
    const params = language ? { language } : {};
    const response = await apiClient.get<Transcription[]>('/transcriptions', { params });
    return response.data;
  },

  /**
   * Fetch a single transcription by ID
   */
  async getById(id: number): Promise<Transcription> {
    const response = await apiClient.get<Transcription>(`/transcriptions/${id}`);
    return response.data;
  },

  /**
   * Save a newly transcribed speech text to PostgreSQL
   */
  async create(data: TranscriptionRequest): Promise<Transcription> {
    const response = await apiClient.post<Transcription>('/transcriptions', data);
    return response.data;
  },

  /**
   * Delete a transcription by ID
   */
  async delete(id: number): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(`/transcriptions/${id}`);
    return response.data;
  },
};

export default apiClient;
