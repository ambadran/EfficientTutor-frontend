import { config } from './config.js';

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${config.backendUrl}${endpoint}`, options);
    // Handle cases where the response might not have a JSON body (e.g., DELETE success)
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!response.ok) {
        throw new Error(data.error || `Request to ${endpoint} failed with status ${response.status}.`);
    }
    return data;
}

// -- Authentication --
export const checkBackendStatus = () => fetch(config.backendUrl);

export const loginUser = (email, password) => apiRequest('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});

export const signupUser = (email, password) => apiRequest('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});

// -- Parent & Student Data
export const fetchStudents = (userId) => apiRequest(`/students?userId=${userId}`);
export const postStudent = (userId, student) => apiRequest('/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, student }),
});
export const deleteStudentRequest = (userId, studentId) => apiRequest('/students', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, studentId }),
});
export const fetchTimetable = (studentId) => apiRequest(`/timetable?student_id=${studentId}`);
export const fetchStudentCredentials = (parentId, studentId) => 
    apiRequest(`/student-credentials?userId=${parentId}&studentId=${studentId}`);
export const fetchStudentProfile = (studentId) => 
    apiRequest(`/student-profile?studentId=${studentId}`);

// -- student specific stuff --
export const fetchNotes = (studentId) => 
    apiRequest(`/notes?studentId=${studentId}`);
export const fetchMeetingLinks = (studentId) => 
    apiRequest(`/meeting-links?studentId=${studentId}`);

// -- Parent specific stuff
export const fetchLogs = (parentId) => apiRequest(`/financial-report/${parentId}`);

// --- Teacher Financial System ---

// --- Unified Financial Logs & Summary ---

export const fetchTuitionLogs = (viewerId) => apiRequest(`/tuition-logs?viewer_id=${viewerId}`);
export const fetchPaymentLogs = (viewerId) => apiRequest(`/payment-logs?viewer_id=${viewerId}`);

// NEW: Endpoint for the financial summary
export const fetchFinancialSummary = (viewerId) => apiRequest(`/financial-summary?viewer_id=${viewerId}`);

export const fetchTeacherTuitionLogs = (viewerId) => apiRequest(`/tuition-logs?viewer_id=${viewerId}`);

// UPDATED: Now requires viewer_id
export const fetchSchedulableTuitions = (viewerId) => apiRequest(`/schedulable-tuitions?viewer_id=${viewerId}`);

// UPDATED: Now requires viewer_id
export const fetchCustomLogEntryData = (viewerId) => apiRequest(`/custom-log-entry-data?viewer_id=${viewerId}`);

export const postTuitionLog = (logData) => apiRequest('/tuition-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData),
});
export const voidTuitionLog = (logId) => apiRequest(`/tuition-logs/${logId}/void`, { method: 'POST' });
export const postTuitionLogCorrection = (logId, correctionData) => apiRequest(`/tuition-logs/${logId}/correction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(correctionData),
});

// --- NEW: Payment Log API Functions ---
export const fetchParentList = (viewerId) => apiRequest(`/parent-list?viewer_id=${viewerId}`);

export const postPaymentLog = (logData) => apiRequest('/payment-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData),
});

export const voidPaymentLog = (logId) => apiRequest(`/payment-logs/${logId}/void`, { method: 'POST' });

export const postPaymentLogCorrection = (logId, correctionData) => apiRequest(`/payment-logs/${logId}/correction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(correctionData),
});
