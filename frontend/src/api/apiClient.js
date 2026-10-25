import axios from 'axios';

// Instantiate an isolated gateway configuration targeting the server engine endpoint
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Forces browsers to append HttpOnly cookie signatures automatically
  headers: {
    'Content-Type': 'application/json'
  }
});

// Structural variable serving as the in-memory access token storage vault
let memoryAccessToken = null;

export const setInMemoryToken = (token) => {
  memoryAccessToken = token;
};

// INTERCEPTOR A: Dynamic token injection before network dispatching
apiClient.interceptors.request.use(
  (config) => {
    if (memoryAccessToken) {
      config.headers.Authorization = `Bearer ${memoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// INTERCEPTOR B: Zero-Trust automated error validation handling and background refreshing
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Intercept token expirations while making sure we don't loop infinitely
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('🔄 [Client Gateway] Access token expired. Requesting silent background refresh...');
        
        // Call the refresh endpoint to obtain a new short-lived access token
        const refreshResponse = await axios.post(
          'http://localhost:5000/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const { accessToken } = refreshResponse.data;
        setInMemoryToken(accessToken);

        // Update the original request with the fresh token and retry it
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('❌ [Client Gateway] Session expired completely. Forcing re-authentication loop.');
        memoryAccessToken = null;
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
