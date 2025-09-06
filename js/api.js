/* This file's only job is to handle all communication with your backend. 
 * By centralizing every fetch call here, you make it incredibly easy to 
 * manage API endpoints or change how you handle requests in the future. 
 * If you ever need to add authentication headers to every request, 
 * for example, you would only have to change it in this one file.
 */
// THE FIX: Import the config object to get the backendUrl
import { config } from './main.js';

/**
 * A centralized handler for all API fetch requests.
 * @param {string} endpoint - The API endpoint to call (e.g., '/login').
 * @param {object} options - The options for the fetch request (method, headers, body).
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function handleRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${config.backendUrl}${endpoint}`, options);

        const data = await response.json();

        if (!response.ok) {
            // Use the error message from the backend, or a default one
            return { success: false, error: data.error || `HTTP error! status: ${response.status}` };
        }
        return { success: true, data };
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        // Provide a user-friendly message for network failures
        return { success: false, error: 'Could not connect to the server. Please check your connection and try again.' };
    }
}


export const api = {
    async login(email, password) {
        return handleRequest('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
    },

    async signup(email, password) {
        return handleRequest('/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
    },

    async getStudents(userId) {
        return handleRequest(`/students?userId=${userId}`);
    },

    async saveStudent(userId, student) {
        return handleRequest('/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, student }),
        });
    },

    async deleteStudent(userId, studentId) {
        return handleRequest('/students', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, studentId }),
        });
    },
    
    // Mocks - to be replaced with real backend calls
    async getTimetable(userId) {
         // In the future, this will be its own real endpoint
        return handleRequest(`/timetable?student_id=${userId}`);
    },

    async getLogs(userId) {
        // In the future, this will be its own real endpoint
        return handleRequest(`/logs?student_id=${userId}`);
    }
};

