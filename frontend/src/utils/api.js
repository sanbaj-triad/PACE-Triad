import { log } from './logger';

const API_BASE = ''; // Proxy handles base URL

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

const handleRequest = async (method, endpoint, options = {}) => {
    const start = Date.now();
    log.info('API', `REQUEST: ${method} ${endpoint}`);
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            ...options
        });
        
        const duration = Date.now() - start;
        log.info('API', `RESPONSE: ${method} ${endpoint} | Status: ${response.status} | Duration: ${duration}ms`);

        if (response.status === 401) {
            log.warn('API', `UNAUTHORIZED: ${method} ${endpoint} | Redirecting to login`);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            log.error('API', `FAILURE: ${method} ${endpoint} | Status: ${response.status} | Details:`, errorData);
            if (response.status === 503 && errorData.detail === "MAINTENANCE_MODE") {
                if (window.location.pathname !== '/maintenance') window.location.href = '/maintenance';
                return new Promise(() => {}); // freeze resolving
            }
            const error = new Error('API Error');
            error.response = { data: errorData, status: response.status };
            throw error;
        }

        if (method === 'DELETE') {
            return true;
        }
        return await response.json();
    } catch (error) {
        if (error.message !== 'Unauthorized' && error.message !== 'API Error') {
            log.error('API', `EXCEPTION: ${method} ${endpoint} | Message: ${error.message}`, error);
        }
        throw error;
    }
};

export const api = {
    get: async (endpoint) => {
        return handleRequest('GET', endpoint, {
            headers: getHeaders()
        });
    },
    post: async (endpoint, data) => {
        const isFormData = data instanceof FormData;
        const headers = getHeaders();
        if (isFormData) {
            delete headers['Content-Type'];
        }
        return handleRequest('POST', endpoint, {
            headers,
            body: isFormData ? data : JSON.stringify(data)
        });
    },
    put: async (endpoint, data) => {
        const isFormData = data instanceof FormData;
        const headers = getHeaders();
        if (isFormData) {
            delete headers['Content-Type'];
        }
        return handleRequest('PUT', endpoint, {
            headers,
            body: isFormData ? data : JSON.stringify(data)
        });
    },
    delete: async (endpoint) => {
        return handleRequest('DELETE', endpoint, {
            headers: getHeaders()
        });
    }
};
