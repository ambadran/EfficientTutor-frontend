import { checkAuthState, handleLogin, handleSignup, handleLogout } from './auth.js';
import { renderPage, toggleSidebar } from './ui.js';

// --- CONFIGURATION ---
export const config = {
    backendUrl: window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:5000'
        : 'https://personal-time-manager.onrender.com',
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
    currentUser: null,
    students: [],
    currentStudent: null,
    currentPage: 'login',
    currentTimetableDay: new Date().getDay() + 1 > 6 ? 0 : new Date().getDay() + 1,
    isSidebarOpen: false,
};

// --- NAVIGATION ---
export function navigateTo(pageId) {
    appState.currentPage = pageId;
    if (appState.isSidebarOpen) toggleSidebar();
    renderPage();
}

// --- GLOBAL EVENT LISTENERS ---
document.body.addEventListener('click', (e) => {
    const target = e.target;
    const closest = (selector) => target.closest(selector);

    if (closest('#login-btn')) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        handleLogin(email, password);
    }
    if (closest('#signup-btn')) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        handleSignup(email, password);
    }
    if (closest('#logout-button')) {
        handleLogout();
    }
    const navLink = closest('.nav-link');
    if (navLink) {
        e.preventDefault();
        navigateTo(navLink.id.replace('nav-', ''));
    }
    if (closest('#menu-button')) {
        toggleSidebar();
    }
    if (closest('#retry-connection-btn')) {
        initialize();
    }
});

document.getElementById('page-content').addEventListener('change', (e) => {
    if (e.target.id === 'student-selector') {
        appState.currentStudent = appState.students.find(s => s.id === e.target.value) || null;
        renderPage();
    }
});


// --- INITIALIZATION ---
async function initialize() {
    await checkAuthState();
}

initialize();
