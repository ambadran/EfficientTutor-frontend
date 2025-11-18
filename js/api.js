import { config } from './config.js';

// --- Helper: Get Token
function getAuthToken() {
    return localStorage.getItem('accessToken');
}

// --- UPDATED: apiRequest now handles Auth Header ---
async function apiRequest(endpoint, options = {}, requiresAuth = true) {
    const token = getAuthToken();
    const headers = new Headers(options.headers || {}); // Use Headers object

    // Add Authorization header if a token exists and the request requires auth
    if (requiresAuth && token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Adjust Content-Type if sending form data
    if (options.body instanceof URLSearchParams) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
    } else if (!(options.body instanceof FormData) && options.body) {
        // Default to JSON if body exists and is not FormData/URLSearchParams
        headers.set('Content-Type', 'application/json');
    }

    const fetchOptions = {
        ...options,
        headers: headers,
    };

    const response = await fetch(`${config.backendUrl}${endpoint}`, fetchOptions);
    const text = await response.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch (e) {
        // Handle cases where the response might not be JSON (e.g., plain text error)
        console.error("Failed to parse JSON response:", text);
        // Re-throw specific error if needed, or rely on response.ok check
    }

    if (!response.ok) {
        throw new Error(data.detail || data.error || `Request to ${endpoint} failed with status ${response.status}.`);
    }
    return data;
}

// --- Authentication ---

// UPDATED: Login endpoint and request format
export const loginUser = (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // Key is 'username' now
    formData.append('password', password);

    // Login doesn't require prior auth, and sends form data
    return apiRequest('/auth/login', {
        method: 'POST',
        body: formData,
    }, false); // requiresAuth = false
};

// UPDATED: Signup endpoint now handles different roles
export const signupUser = (email, password, firstName, lastName, role) => {
    const endpoint = `/auth/signup/${role}`; // Dynamic endpoint based on role
    const userData = {
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
    };
    // Signup doesn't require prior auth, sends JSON
    return apiRequest(endpoint, {
        method: 'POST',
        // apiRequest handles stringifying JSON and setting Content-Type
        body: JSON.stringify(userData),
    }, false); // requiresAuth = false
};

// NEW: Fetch current user details using the token
export const fetchCurrentUser = () => apiRequest('/users/me'); // Defaults to GET, requiresAuth=true
//
// --- Backend Status (No Auth Needed) ---
export const checkBackendStatus = () => fetch(config.backendUrl);

// --- Parent & Student Data (Auth Needed) ---
export const fetchStudents = () => apiRequest(`/students/`);
export const fetchStudent = (studentId) => apiRequest(`/students/${studentId}`);
export const postStudent = (parentId, studentData) => {
    const payload = {
        ...studentData,
        parent_id: parentId,
    };
    return apiRequest('/students/', {
        method: 'POST', body: JSON.stringify(payload)
    });
};
export const deleteStudentRequest = (studentId) => apiRequest(`/students/${studentId}`, {
    method: 'DELETE'
});
export const fetchTimetable = () => apiRequest(`/timetable/`);

// --- Student-Specific Views (Auth Needed) ---
export const fetchNotes = () => apiRequest(`/notes/`);
export const fetchMeetingLinks = () => apiRequest(`/timetable/`); // Meeting links are now part of the timetable

// --- Unified Financial Logs & Summary (Auth Needed) ---
export const fetchTuitionLogs = () => apiRequest(`/tuition-logs/`);
export const fetchPaymentLogs = () => apiRequest(`/payment-logs/`);
export const fetchFinancialSummary = () => apiRequest(`/financial-summary/`);
export const fetchTuitions = () => apiRequest(`/tuitions/`);

// --- Teacher Financial Actions (Auth Needed) ---
export const fetchSchedulableTuitions = () => apiRequest(`/tuitions/`); // Endpoint changed
export const postTuitionLog = (logData) => apiRequest('/tuition-logs', {
    method: 'POST', body: JSON.stringify(logData)
});
export const voidTuitionLog = (logId) => apiRequest(`/tuition-logs/${logId}/void`, { method: 'PATCH' });
export const postTuitionLogCorrection = (logId, correctionData) => apiRequest(`/tuition-logs/${logId}/correction`, {
    method: 'POST', body: JSON.stringify(correctionData)
});
export const fetchParentList = () => apiRequest(`/parents/`); // Endpoint changed
export const postPaymentLog = (logData) => apiRequest('/payment-logs', {
    method: 'POST', body: JSON.stringify(logData)
});
export const voidPaymentLog = (logId) => apiRequest(`/payment-logs/${logId}/void`, { method: 'PATCH' });
export const postPaymentLogCorrection = (logId, correctionData) => apiRequest(`/payment-logs/${logId}/correction`, {
    method: 'POST', body: JSON.stringify(correctionData)
});

// --- NEW: Meeting Link Management (Auth Needed) ---
// Helper to build the meeting link payload
const buildMeetingLinkPayload = (url, password) => {
    const payload = {
        meeting_link_type: 'GOOGLE_MEET', // Assuming default for now
        meeting_link: url,
        meeting_password: password || null
    };
    // Try to extract meeting ID from Google Meet URL
    try {
        const urlObject = new URL(url);
        if (urlObject.hostname === 'meet.google.com') {
            payload.meeting_id = urlObject.pathname.substring(1); // Remove leading '/'
        }
    } catch (e) {
        // Ignore if URL is not valid, backend will handle it
    }
    return payload;
};

export const createMeetingLink = (tuitionId, url, password) => apiRequest(`/tuitions/${tuitionId}/meeting-link`, {
    method: 'POST',
    body: JSON.stringify(buildMeetingLinkPayload(url, password))
});

export const updateMeetingLink = (tuitionId, url, password) => apiRequest(`/tuitions/${tuitionId}/meeting-link`, {
    method: 'PATCH',
    body: JSON.stringify(buildMeetingLinkPayload(url, password))
});

export const deleteMeetingLink = (tuitionId) => apiRequest(`/tuitions/${tuitionId}/meeting_link`, {
    method: 'DELETE'
});