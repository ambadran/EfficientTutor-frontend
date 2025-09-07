// --- IMPORTS ---
import { appState } from './config.js';
import { checkBackendStatus, postStudent, deleteStudentRequest } from './api.js';
import { checkAuthState, handleLogin, handleSignup, handleLogout, loadInitialData } from './auth.js';
import { navigateTo, renderPage } from './ui/navigation.js';
import { toggleSidebar, displayGlobalError } from './ui/layout.js';
import { showStudentRegistrationWizard } from './ui/studentWizard.js';
import { confirmDeleteStudent } from './ui/templates.js';
import { closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay, showAuthFeedback, clearAuthFeedback } from './ui/modals.js';

// --- DATA HANDLERS ---
async function handleSaveStudent(studentData) {
    if (!appState.currentUser) return;
    showLoadingOverlay('Saving student data...');
    try {
        await postStudent(appState.currentUser.id, studentData);
        if (appState.currentUser.isFirstSignIn) {
            appState.currentUser.isFirstSignIn = false;
            localStorage.setItem('efficientTutorUser', JSON.stringify(appState.currentUser));
        }
        await loadInitialData();
        closeModal();
        showStatusMessage('success', 'Student saved successfully!');
        navigateTo('student-info');
    } catch (error) {
        console.error("Error saving student:", error);
        showStatusMessage('error', error.message);
    }
}

async function handleDeleteStudent(studentId) {
    if (!appState.currentUser) return;
    showLoadingOverlay('Deleting student...');
    try {
        await deleteStudentRequest(appState.currentUser.id, studentId);
        await loadInitialData();
        showStatusMessage('success', 'Student deleted.');
        renderPage(); // Re-render the current page
    } catch (error) {
        console.error("Error deleting student:", error);
        showStatusMessage('error', error.message);
    }
}

// --- VALIDATION HELPER ---
function validateAuthForm() {
    clearAuthFeedback();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !password) {
        showAuthFeedback("Email and password cannot be empty.");
        return null;
    }
    if (!emailRegex.test(email)) {
        showAuthFeedback("Please enter a valid email address.");
        return null;
    }
    return { email, password };
}


// --- GLOBAL EVENT LISTENERS ---
document.body.addEventListener('click', (e) => {
    const target = e.target;
    const closest = (selector) => target.closest(selector);

    // ... (other UI listeners like share, menu, modal, theme)
    if (!closest('.share-container')) {
        document.querySelectorAll('.share-dropdown').forEach(el => el.classList.add('hidden'));
    }
    if (closest('#menu-button')) toggleSidebar();
    if (closest('#modal-close-btn') || (closest('#modal-backdrop') && !closest('.modal-content'))) {
        closeModal();
    }
    if (closest('#theme-toggle-btn')) {
        document.documentElement.classList.toggle('dark');
        document.documentElement.classList.toggle('light');
        renderPage();
    }


    // Navigation
    const navLink = closest('.nav-link');
    if (navLink) {
        e.preventDefault();
        navigateTo(navLink.id.replace('nav-', ''));
    }

    // Authentication with Client-Side Validation
    if (closest('#login-btn')) {
        e.preventDefault();
        const credentials = validateAuthForm();
        if (credentials) {
            handleLogin(credentials.email, credentials.password);
        }
    }
    if (closest('#signup-btn')) {
        e.preventDefault();
        const credentials = validateAuthForm();
        if (credentials) {
            if (credentials.password.length < 6) {
                showAuthFeedback("Password must be at least 6 characters long.");
                return;
            }
            handleSignup(credentials.email, credentials.password);
        }
    }
    if (closest('#logout-button')) handleLogout();

    // Student Info Page
    if (closest('#add-new-student-btn')) showStudentRegistrationWizard(null, handleSaveStudent);
    
    const editStudentBtn = closest('.edit-student-btn');
    if (editStudentBtn) {
        const student = appState.students.find(s => s.id === editStudentBtn.dataset.id);
        if (student) showStudentRegistrationWizard(student, handleSaveStudent);
    }
    
    const deleteStudentBtn = closest('.delete-student-btn');
    if (deleteStudentBtn) {
        const student = appState.students.find(s => s.id === deleteStudentBtn.dataset.id);
        if (student) confirmDeleteStudent(student, handleDeleteStudent);
    }
    
    // Timetable Page
    const mainTimetable = closest('#page-content .timetable-component');
    if (mainTimetable) {
        const dayNavBtn = closest('.day-nav-btn');
        if (dayNavBtn) {
            const dir = parseInt(dayNavBtn.dataset.direction);
            appState.currentTimetableDay = (appState.currentTimetableDay + dir + 7) % 7;
            renderPage();
        }
    }
});

// ... (rest of the file is unchanged)
document.getElementById('page-content').addEventListener('change', (e) => {
    if (e.target.id === 'student-selector') {
        appState.currentStudent = appState.students.find(s => s.id === e.target.value) || null;
        renderPage();
    }
});

async function initialize() {
    navigateTo('login');
    showLoadingOverlay('Connecting to server...');
    try {
        await checkBackendStatus();
        console.log("Backend connection successful.");
        hideStatusOverlay();
        await checkAuthState();
    } catch (error) {
        console.error("Initialization Error:", error);
        hideStatusOverlay();
        displayGlobalError(error.message);
        document.getElementById('retry-connection-btn')?.addEventListener('click', initialize);
    }
}

initialize();
