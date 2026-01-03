import { appState, config } from './config.js';
import { handleLogout } from './auth.js';
import { hideStatusOverlay } from './ui/modals.js';

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
            if (response.status === 401) {
                hideStatusOverlay();
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

export const signupUser = (email, password, firstName, lastName, role, specialties = [], availabilityIntervals = []) => {
    const endpoint = role === 'parent' ? '/auth/signup/parent' : '/auth/signup/teacher';
    
    const payload = { 
        email, 
        password, 
        first_name: firstName, 
        last_name: lastName 
    };

    if (role === 'teacher') {
        payload.teacher_specialties = specialties;
        payload.availability_intervals = availabilityIntervals;
    }

    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
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

export const addStudentSubject = (studentId, subjectData) => apiRequest(`/students/${studentId}/subjects`, {
    method: 'POST',
    body: JSON.stringify(subjectData)
});

export const deleteStudentSubject = (studentId, subjectId) => apiRequest(`/students/${studentId}/subjects/${subjectId}`, {
    method: 'DELETE'
});

export const addSubjectSharing = (studentId, subjectId, targetId) => apiRequest(`/students/${studentId}/subjects/${subjectId}/share/${targetId}`, {
    method: 'POST'
});

export const removeSubjectSharing = (studentId, subjectId, targetId) => apiRequest(`/students/${studentId}/subjects/${subjectId}/share/${targetId}`, {
    method: 'DELETE'
});

export const deleteStudentRequest = (studentId) => apiRequest(`/students/${studentId}`, {
    method: 'DELETE'
});
export const fetchTimetable = (targetUserId = null) => {
    const query = targetUserId ? `?target_user_id=${targetUserId}` : '';
    return apiRequest(`/timetable/${query}`);
};

// --- Student-Specific Views (Auth Needed) ---
export const fetchMeetingLinks = () => apiRequest(`/timetable/`); // Meeting links are now part of the timetable

// --- Unified Financial Logs & Summary (Auth Needed) ---
const buildQuery = (filters) => {
    if (!filters) return '';
    const params = new URLSearchParams();
    for (const key in filters) {
        if (filters[key]) params.append(key, filters[key]);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
};

export const fetchTuitionLogs = (filters) => apiRequest(`/tuition-logs/${buildQuery(filters)}`);
export const fetchPaymentLogs = (filters) => apiRequest(`/payment-logs/${buildQuery(filters)}`);
export const fetchFinancialSummary = (filters) => apiRequest(`/financial-summary/${buildQuery(filters)}`);
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
const buildMeetingLinkPayload = (url, password, meetingId) => {
    const payload = {
        meeting_link_type: 'GOOGLE_MEET', // Assuming default for now
        meeting_link: url,
        meeting_password: password || null,
        meeting_id: meetingId || null
    };
    // If no meetingId is provided, try to extract it from Google Meet URL
    if (!payload.meeting_id) {
        try {
            const urlObject = new URL(url);
            if (urlObject.hostname === 'meet.google.com') {
                payload.meeting_id = urlObject.pathname.substring(1); // Remove leading '/'
            }
        } catch (e) {
            // Ignore if URL is not valid
        }
    }
    return payload;
};

export const createMeetingLink = (tuitionId, url, password, meetingId) => apiRequest(`/tuitions/${tuitionId}/meeting_link`, {
    method: 'POST',
    body: JSON.stringify(buildMeetingLinkPayload(url, password, meetingId))
});

export const updateTuition = (tuitionId, data) => apiRequest(`/tuitions/${tuitionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data) // Schema: TuitionUpdate
});

export const updateMeetingLink = (tuitionId, url, password, meetingId) => apiRequest(`/tuitions/${tuitionId}/meeting_link`, {
    method: 'PATCH',
    body: JSON.stringify(buildMeetingLinkPayload(url, password, meetingId))
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

// --- User Management & Profiles ---
export const fetchTeacher = (teacherId) => apiRequest(`/teachers/${teacherId}`);
export const fetchParent = (parentId) => apiRequest(`/parents/${parentId}`);

export const updateTeacher = (id, data) => apiRequest(`/teachers/${id}`, {
    method: 'PATCH', body: JSON.stringify(data)
});
export const updateParent = (id, data) => apiRequest(`/parents/${id}`, {
    method: 'PATCH', body: JSON.stringify(data)
});
export const updateStudent = (id, data) => apiRequest(`/students/${id}`, {
    method: 'PATCH', body: JSON.stringify(data)
});

// --- NEW: Availability Management (Immediate Updates) ---
export const addStudentAvailability = (studentId, intervalData) => apiRequest(`/students/${studentId}/availability`, {
    method: 'POST', body: JSON.stringify(intervalData)
});
export const updateStudentAvailability = (studentId, intervalId, intervalData) => apiRequest(`/students/${studentId}/availability/${intervalId}`, {
    method: 'PATCH', body: JSON.stringify(intervalData)
});
export const deleteStudentAvailability = (studentId, intervalId) => apiRequest(`/students/${studentId}/availability/${intervalId}`, {
    method: 'DELETE'
});

export const addTeacherAvailability = (teacherId, intervalData) => apiRequest(`/teachers/${teacherId}/availability`, {
    method: 'POST', body: JSON.stringify(intervalData)
});
export const updateTeacherAvailability = (teacherId, intervalId, intervalData) => apiRequest(`/teachers/${teacherId}/availability/${intervalId}`, {
    method: 'PATCH', body: JSON.stringify(intervalData)
});
export const deleteTeacherAvailability = (teacherId, intervalId) => apiRequest(`/teachers/${teacherId}/availability/${intervalId}`, {
    method: 'DELETE'
});

// --- Metadata (TODO: Replace with actual endpoints) ---
export const fetchTimezones = async () => {
    // TODO: Replace with backend endpoint when available
    return Promise.resolve([
        "UTC", 
        "Asia/Kuwait", 
        "Asia/Riyadh", 
        "Asia/Dubai", 
        "Europe/London", 
        "America/New_York"
    ]);
};

export const fetchCurrencies = async () => {
    // TODO: Replace with backend endpoint when available
    return Promise.resolve(["KWD", "USD", "EUR", "GBP", "SAR", "AED"]);
};

// --- Teacher Specialties ---
export const addTeacherSpecialty = (teacherId, specialtyData) => apiRequest(`/teachers/${teacherId}/specialties`, {
    method: 'POST',
    body: JSON.stringify(specialtyData) // Expects { subject, educational_system, grade }
});

export const deleteTeacherSpecialty = (teacherId, specialtyId) => apiRequest(`/teachers/${teacherId}/specialties/${specialtyId}`, {
    method: 'DELETE'
});

export const fetchTeacherSpecialties = (teacherId) => apiRequest(`/teachers/${teacherId}/specialties`);

export const fetchTeachersBySpecialty = (subject, educationalSystem, grade) => {
    const params = { subject, educational_system: educationalSystem };
    if (grade) params.grade = grade;
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/teachers/by_specialty?${query}`);
};

// --- Notifications ---
export const registerDeviceToken = (userId, token, platform) => apiRequest('/notify/register', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, token, platform }) // Schema: UserDeviceWrite
});

export const unregisterDeviceToken = (userId, token) => apiRequest('/notify/unregister', {
    method: 'DELETE',
    body: JSON.stringify({ user_id: userId, token }) // Schema: UserDeviceUpdate
});

export const softSyncDevice = (userId, token, platform) => apiRequest('/notify/soft_sync', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, token, platform })
});

export const forceSyncDevice = (userId, token, platform) => apiRequest('/notify/force_sync', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, token, platform })
});

// For bulk operations where token might be null/omitted if the backend allows, 
// or usually for these endpoints the schema allows token to be optional/null.
export const softSyncAllDevices = (userId) => apiRequest('/notify/soft_sync_all', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, token: null })
});

export const forceSyncAllDevices = (userId) => apiRequest('/notify/force_sync_all', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, token: null })
});

export const pingUser = (notificationDetails) => apiRequest('/notify/ping_user', {
    method: 'POST',
    body: JSON.stringify(notificationDetails) // Schema: NotificationDetails
});

export const pingTuitionStudents = (notificationDetails) => apiRequest('/notify/ping_tuition_students', {
    method: 'POST',
    body: JSON.stringify(notificationDetails) // Schema: NotificationDetails
});

export const pingTuitionStudentsParents = (notificationDetails) => apiRequest('/notify/ping_tuition_students_parents', {
    method: 'POST',
    body: JSON.stringify(notificationDetails) // Schema: NotificationDetails
});

// --- User Account Management ---
export const deactivateUser = (userId) => apiRequest(`/users/${userId}/deactivate`, {
    method: 'POST'
});

export const deleteUser = (userId) => apiRequest(`/users/${userId}`, {
    method: 'DELETE'
});
