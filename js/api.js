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

// UPDATED: Signup endpoint and JSON body structure
export const signupUser = (email, password, firstName, lastName) => {
    const userData = {
        email: email,
        password: password,
        first_name: firstName,
        last_name: lastName,
        role: 'parent' // Default role for signup form
    };
    // Signup doesn't require prior auth, sends JSON
    return apiRequest('/auth/signup', {
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
export const fetchStudents = (userId) => apiRequest(`/students?userId=${userId}`);
export const postStudent = (userId, student) => apiRequest('/students', {
    method: 'POST', body: JSON.stringify({ userId, student })
});
export const deleteStudentRequest = (userId, studentId) => apiRequest('/students', {
    method: 'DELETE', body: JSON.stringify({ userId, studentId })
});
export const fetchTimetable = (studentId) => apiRequest(`/timetable?student_id=${studentId}`);
export const fetchStudentCredentials = (parentId, studentId) => apiRequest(`/student-credentials?userId=${parentId}&studentId=${studentId}`);
export const fetchStudentProfile = (studentId) => apiRequest(`/student-profile?studentId=${studentId}`);

// --- Student-Specific Views (Auth Needed) ---
export const fetchNotes = (studentId) => apiRequest(`/notes?studentId=${studentId}`);
export const fetchMeetingLinks = (studentId) => apiRequest(`/meeting-links?studentId=${studentId}`);

// --- Unified Financial Logs & Summary (Auth Needed) ---
export const fetchTuitionLogs = (viewerId) => apiRequest(`/tuition-logs?viewer_id=${viewerId}`);
export const fetchPaymentLogs = (viewerId) => apiRequest(`/payment-logs?viewer_id=${viewerId}`);
export const fetchFinancialSummary = (viewerId) => apiRequest(`/financial-summary?viewer_id=${viewerId}`);

// --- Teacher Financial Actions (Auth Needed) ---
export const fetchSchedulableTuitions = (viewerId) => apiRequest(`/schedulable-tuitions?viewer_id=${viewerId}`);
export const fetchCustomLogEntryData = (viewerId) => apiRequest(`/custom-log-entry-data?viewer_id=${viewerId}`);
export const postTuitionLog = (logData) => apiRequest('/tuition-logs', {
    method: 'POST', body: JSON.stringify(logData)
});
export const voidTuitionLog = (logId) => apiRequest(`/tuition-logs/${logId}/void`, { method: 'POST' });
export const postTuitionLogCorrection = (logId, correctionData) => apiRequest(`/tuition-logs/${logId}/correction`, {
    method: 'POST', body: JSON.stringify(correctionData)
});
export const fetchParentList = (viewerId) => apiRequest(`/parent-list?viewer_id=${viewerId}`);
export const postPaymentLog = (logData) => apiRequest('/payment-logs', {
    method: 'POST', body: JSON.stringify(logData)
});
export const voidPaymentLog = (logId) => apiRequest(`/payment-logs/${logId}/void`, { method: 'POST' });
export const postPaymentLogCorrection = (logId, correctionData) => apiRequest(`/payment-logs/${logId}/correction`, {
    method: 'POST', body: JSON.stringify(correctionData)
});

// // -- Parent & Student Data
// export const fetchStudents = (userId) => apiRequest(`/students?userId=${userId}`);
// export const postStudent = (userId, student) => apiRequest('/students', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ userId, student }),
// });
// export const deleteStudentRequest = (userId, studentId) => apiRequest('/students', {
//     method: 'DELETE',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ userId, studentId }),
// });
// export const fetchTimetable = (studentId) => apiRequest(`/timetable?student_id=${studentId}`);
// export const fetchStudentCredentials = (parentId, studentId) => 
//     apiRequest(`/student-credentials?userId=${parentId}&studentId=${studentId}`);
// export const fetchStudentProfile = (studentId) => 
//     apiRequest(`/student-profile?studentId=${studentId}`);

// // -- student specific stuff --
// export const fetchNotes = (studentId) => 
//     apiRequest(`/notes?studentId=${studentId}`);
// export const fetchMeetingLinks = (studentId) => 
//     apiRequest(`/meeting-links?studentId=${studentId}`);

// // -- Parent specific stuff
// export const fetchLogs = (parentId) => apiRequest(`/financial-report/${parentId}`);

// // --- Teacher Financial System ---

// // --- Unified Financial Logs & Summary ---

// export const fetchTuitionLogs = (viewerId) => apiRequest(`/tuition-logs?viewer_id=${viewerId}`);
// export const fetchPaymentLogs = (viewerId) => apiRequest(`/payment-logs?viewer_id=${viewerId}`);

// // NEW: Endpoint for the financial summary
// export const fetchFinancialSummary = (viewerId) => apiRequest(`/financial-summary?viewer_id=${viewerId}`);

// export const fetchTeacherTuitionLogs = (viewerId) => apiRequest(`/tuition-logs?viewer_id=${viewerId}`);

// // UPDATED: Now requires viewer_id
// export const fetchSchedulableTuitions = (viewerId) => apiRequest(`/schedulable-tuitions?viewer_id=${viewerId}`);

// // UPDATED: Now requires viewer_id
// export const fetchCustomLogEntryData = (viewerId) => apiRequest(`/custom-log-entry-data?viewer_id=${viewerId}`);

// export const postTuitionLog = (logData) => apiRequest('/tuition-logs', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(logData),
// });
// export const voidTuitionLog = (logId) => apiRequest(`/tuition-logs/${logId}/void`, { method: 'POST' });
// export const postTuitionLogCorrection = (logId, correctionData) => apiRequest(`/tuition-logs/${logId}/correction`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(correctionData),
// });

// // --- NEW: Payment Log API Functions ---
// export const fetchParentList = (viewerId) => apiRequest(`/parent-list?viewer_id=${viewerId}`);

// export const postPaymentLog = (logData) => apiRequest('/payment-logs', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(logData),
// });

// export const voidPaymentLog = (logId) => apiRequest(`/payment-logs/${logId}/void`, { method: 'POST' });

// export const postPaymentLogCorrection = (logId, correctionData) => apiRequest(`/payment-logs/${logId}/correction`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(correctionData),
// });
