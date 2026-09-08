export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Tu będą funkcje fetch/axios do komunikacji z API
export const fetchHealth = async () => {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
};
