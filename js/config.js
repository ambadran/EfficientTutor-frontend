// --- CONFIGURATION ---
import { Capacitor } from '@capacitor/core';

export const config = {
    // DETERMINISTIC BACKEND SELECTION:
    // Uses VITE_API_URL from .env file (e.g. VITE_API_URL=http://192.168.1.7:8000)
    backendUrl: import.meta.env.VITE_API_URL,
    
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
        work: 'var(--tuition-color)', // Reusing tuition color for teacher's work
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
    teacherTimetableTarget: null, // NEW: Filter for Teacher Timetable View (null = My Schedule)
    // NEW: State for the Notes feature
    notes: [],
    allStudents: [], // Cache for student lists for teachers/parents
    notesStudentFilter: null, // ID of the student whose notes are being viewed
};
