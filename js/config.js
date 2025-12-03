// --- CONFIGURATION ---
import { Capacitor } from '@capacitor/core';

export const config = {
    // UPDATED: Checks for Native Platform first, then localhost
    backendUrl: Capacitor.isNativePlatform()
        ? 'https://personal-time-manager.onrender.com' // Production backend for mobile apps
        : (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.hostname === '0.0.0.0'
            ? 'http://127.0.0.1:8000' // Local backend for testing
            : 'https://personal-time-manager.onrender.com'), // Production backend for web
    
    subjects: ['Math', 'Physics', 'Chemistry', 'Biology', 'IT'],
    // NEW: Enums for the notes feature, from the backend spec
    noteSubjects: ["Math", "Physics", "Chemistry", "Biology", "IT", "Geography"],
    noteTypes: ["STUDY_NOTES", "HOMEWORK", "PAST_PAPERS"],
    educationalSystems: ["IGCSE", "SAT", "National-EG", "National-KW"], // NEW
    colors: {
        school: 'var(--school-color)',
        sports: 'var(--sports-color)',
        others: 'var(--others-color)',
        tuition: 'var(--tuition-color)',
        sleep: 'var(--sleep-color)',
    },
    defaultSchoolTimes: { start: '06:00', end: '15:00' },
    defaultSleepTimes: { start: '22:00', end: '05:00' },
    daysOfWeek: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    timeSlotsStartHour: 5,
    pixelsPerMinute: 1,
    version: 'v0.2', // Current application version
};

// --- GLOBAL STATE ---
export let appState = {
    currentUser: null, // Will hold { id, email, isFirstSignIn }
    students: [],
    currentStudent: null,
    currentPage: 'login',
    // Set Saturday as 0, Sunday as 1, etc.
    currentTimetableDay: new Date().getDay() + 1 > 6 ? 0 : new Date().getDay() + 1,
    isSidebarOpen: false,
    teacherTuitionLogs: [], // NEW: Cache for the teacher's tuition log view
    // NEW: State for the Notes feature
    notes: [],
    allStudents: [], // Cache for student lists for teachers/parents
    notesStudentFilter: null, // ID of the student whose notes are being viewed
};
