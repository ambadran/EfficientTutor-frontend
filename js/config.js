// --- CONFIGURATION ---
export const config = {
    // UPDATED: Now also checks for the '0.0.0.0' hostname
    backendUrl: (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.hostname === '0.0.0.0')
        ? 'http://127.0.0.1:5000' // Local backend for testing
        : 'https://personal-time-manager.onrender.com', // Production backend
    
    subjects: ['Math', 'Physics', 'Chemistry', 'Biology', 'IT'],
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
};
