const API_BASE = ''; // Proxy handles base URL

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    get: async (endpoint) => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'GET',
            headers: getHeaders(),
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 503 && errorData.detail === "MAINTENANCE_MODE") {
                if (window.location.pathname !== '/maintenance') window.location.href = '/maintenance';
                return new Promise(() => {}); // freeze resolving
            }
            const error = new Error('API Error');
            error.response = { data: errorData, status: response.status };
            throw error;
        }
        return response.json();
    },
    post: async (endpoint, data) => {
        const isFormData = data instanceof FormData;
        const headers = getHeaders();
        if (isFormData) {
            delete headers['Content-Type']; // Let browser set multipart/form-data with boundary
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: isFormData ? data : JSON.stringify(data),
        });
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 503 && errorData.detail === "MAINTENANCE_MODE") {
                if (window.location.pathname !== '/maintenance') window.location.href = '/maintenance';
                return new Promise(() => {}); // freeze resolving
            }
            const error = new Error('API Error');
            error.response = { data: errorData, status: response.status };
            throw error;
        }
        return response.json();
    },
    put: async (endpoint, data) => {
        const isFormData = data instanceof FormData;
        const headers = getHeaders();
        if (isFormData) {
            delete headers['Content-Type'];
        }

        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: headers,
            body: isFormData ? data : JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 503 && errorData.detail === "MAINTENANCE_MODE") {
                if (window.location.pathname !== '/maintenance') window.location.href = '/maintenance';
                return new Promise(() => {}); // freeze resolving
            }
            const error = new Error('API Error');
            error.response = { data: errorData, status: response.status };
            throw error;
        }
        return response.json();
    },
    delete: async (endpoint) => {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 503 && errorData.detail === "MAINTENANCE_MODE") {
                if (window.location.pathname !== '/maintenance') window.location.href = '/maintenance';
                return new Promise(() => {}); // freeze resolving
            }
            const error = new Error('API Error');
            error.response = { data: errorData, status: response.status };
            throw error;
        }
        return true;
    }
};
