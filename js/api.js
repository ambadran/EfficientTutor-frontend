import { appState, config } from './config.js';
import { handleLogout } from './auth.js';

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('accessToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const configOptions = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(`${config.backendUrl}${url}`, configOptions);

        if (response.status === 204) {
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            // Check for the specific token validation error
            if (response.status === 401 && data.detail === "Could not validate credentials") {
                handleLogout();
                return new Promise(() => {}); 
            }
            
            // Handle other errors, including structured validation errors
            let errorMsg = `HTTP error! status: ${response.status}`;
            if (data && data.detail) {
                if (Array.isArray(data.detail)) {
                    // Format Pydantic validation errors
                    errorMsg = data.detail.map(err => `${err.loc.join(' -> ')}: ${err.msg}`).join('; ');
                } else {
                    // Handle simple string detail
                    errorMsg = data.detail;
                }
            }
            throw new Error(errorMsg);
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// --- Authentication ---
export async function loginUser(email, password) {
    const details = {
        username: email,
        password: password,
    };

    const formBody = Object.keys(details).map(key => 
        encodeURIComponent(key) + '=' + encodeURIComponent(details[key])).join('&');

    const response = await fetch(`${config.backendUrl}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: formBody
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 400) {
             throw new Error('Incorrect email or password.');
        }
        const errorMsg = (data.detail && Array.isArray(data.detail))
            ? data.detail.map(err => err.msg).join(', ')
            : data.detail || `HTTP error! status: ${response.status}`;
        throw new Error(errorMsg);
    }

    return data;
}

export const signupUser = (email, password, firstName, lastName, role) => {
    const endpoint = role === 'parent' ? '/auth/signup/parent' : '/auth/signup/teacher';
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName, role })
    });
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

export const createMeetingLink = (tuitionId, url, password) => apiRequest(`/tuitions/${tuitionId}/meeting_link`, {
    method: 'POST',
    body: JSON.stringify(buildMeetingLinkPayload(url, password))
});

export const updateMeetingLink = (tuitionId, url, password) => apiRequest(`/tuitions/${tuitionId}/meeting_link`, {
    method: 'PATCH',
    body: JSON.stringify(buildMeetingLinkPayload(url, password))
});

export const deleteMeetingLink = (tuitionId) => apiRequest(`/tuitions/${tuitionId}/meeting_link`, {
    method: 'DELETE'
});

// --- Notes ---
export const fetchNotes = () => apiRequest('/notes/');
export const createNote = (noteData) => apiRequest('/notes/', {
    method: 'POST',
    body: JSON.stringify(noteData)
});
export const updateNote = (noteId, noteData) => apiRequest(`/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(noteData)
});
export const deleteNote = (noteId) => apiRequest(`/notes/${noteId}`, {
    method: 'DELETE'
});
