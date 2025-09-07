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

export const fetchLogs = (studentId) => apiRequest(`/logs?student_id=${studentId}`);
