import { showPage } from './ui.js';
import { handleLogin, handleSignup, checkAuth, handleLogout } from './auth.js';
import { api } from './api.js';
import { openWizard } from './components/wizard.js';
import { showStatusMessage, hideStatusOverlay } from './components/modal.js';


// --- CONFIGURATION ---
export const config = {
    backendUrl: ['127.0.0.1', 'localhost', '0.0.0.0'].includes(window.location.hostname)
        ? 'http://127.0.0.1:5000' 
        : 'https://personal-time-manager.onrender.com',
};

// --- GLOBAL STATE ---
export const appState = {
    currentUser: null,
    students: null,
    currentPage: 'login',
    authMode: 'login',
    // THE FIX: Added state for the main timetable view
    selectedStudentIdForTimetable: null,
    currentTimetableDayIndex: null, // Saturday=0, Sunday=1, etc.
};


// --- EVENT LISTENERS ---
function initializeEventListeners() {
    const app = document.getElementById('app');

    app.addEventListener('submit', (e) => {
        if (e.target.id === 'auth-form') {
            e.preventDefault();
            const form = e.target;
            const email = form.elements.email.value;
            const password = form.elements.password.value;
            
            if (appState.authMode === 'login') {
                handleLogin(email, password);
            } else {
                handleSignup(email, password);
            }
        }
    });
    
    app.addEventListener('click', (e) => {
        const target = e.target;

        if (target.id === 'signup-link') {
            e.preventDefault();
            appState.authMode = 'signup';
            navigateTo('login');
        }
        if (target.id === 'login-link') {
            e.preventDefault();
            appState.authMode = 'login';
            navigateTo('login');
        }

        if (target.id === 'add-student-btn' || target.closest('#add-student-btn')) {
            openWizard();
            return;
        }

        if (target.closest('.nav-link')) {
            e.preventDefault();
            const page = target.closest('.nav-link').dataset.page;
            navigateTo(page);
        }

        if (target.closest('#logout-btn')) {
            e.preventDefault();
            handleLogout();
        }
        
        if(target.closest('.edit-student-btn')) {
            const studentId = target.closest('.edit-student-btn').dataset.studentId;
            const student = appState.students.find(s => s.id === studentId);
            openWizard(student);
        }
        
        if(target.closest('.delete-student-btn')) {
            const studentId = target.closest('.delete-student-btn').dataset.studentId;
            handleDeleteStudent(studentId);
        }
    });
}

async function handleDeleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student?')) {
        showStatusMessage('Deleting student...', 'loading');
        const { success, error } = await api.deleteStudent(appState.currentUser.id, studentId);
        if (success) {
            showStatusMessage('Student deleted.', 'success');
            navigateTo('students');
        } else {
            showStatusMessage(`Error: ${error}`, 'error');
        }
        setTimeout(hideStatusOverlay, 2000);
    }
}


// --- NAVIGATION ---
export function navigateTo(pageName) {
    showPage(pageName);
}


// --- INITIALIZATION ---
function initializeApp() {
    checkAuth();
    initializeEventListeners();
}

initializeApp();

