import { appState } from './config.js';
import { loginUser, signupUser, fetchStudents } from './api.js';
import { showLoadingOverlay, hideStatusOverlay, showAuthFeedback, showStatusMessage } from './ui/modals.js';
import { navigateTo } from './ui/navigation.js';

export async function loadInitialData() {
    if (!appState.currentUser) return;
    try {
        const students = await fetchStudents(appState.currentUser.id);
        appState.students = students;
        appState.currentStudent = students[0] || null;
    } catch (error) {
        console.error("Error loading students:", error);
        if (appState.currentPage === 'login') {
            showAuthFeedback(error.message);
        }
    }
}

export async function checkAuthState() {
    const user = JSON.parse(localStorage.getItem('efficientTutorUser'));
    const nav = document.getElementById('sidebar-nav');

    if (user && user.id) {
        appState.currentUser = user;
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('logout-button').classList.remove('hidden');
        document.getElementById('user-email').textContent = user.email;
        nav.classList.remove('hidden'); // CHANGED: Show nav menu
        
        await loadInitialData();
        
        if (appState.currentUser.isFirstSignIn && appState.students.length === 0) {
            navigateTo('student-info');
        } else {
            navigateTo('timetable');
        }
    } else {
        nav.classList.add('hidden'); // CHANGED: Ensure nav menu is hidden
        navigateTo('login');
    }
}

export async function handleLogin(email, password) {
    showLoadingOverlay('Logging in...');
    try {
        const data = await loginUser(email, password);
        localStorage.setItem('efficientTutorUser', JSON.stringify(data.user));
        await checkAuthState();
    } catch (error) {
        showAuthFeedback(error.message);
    } finally {
        hideStatusOverlay();
    }
}

export async function handleSignup(email, password) {
    showLoadingOverlay('Signing up...');
    try {
        const data = await signupUser(email, password);
        localStorage.setItem('efficientTutorUser', JSON.stringify(data.user));
        
        showStatusMessage('success', data.message || 'Signup successful!');

        setTimeout(() => {
            checkAuthState();
        }, 2000);

    } catch (error) {
        hideStatusOverlay();
        showAuthFeedback(error.message);
    }
}

export function handleLogout() {
    localStorage.removeItem('efficientTutorUser');
    appState.currentUser = null;
    appState.students = [];
    appState.currentStudent = null;
    
    // CHANGED: Hide user info, logout button, and nav menu
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('logout-button').classList.add('hidden');
    document.getElementById('sidebar-nav').classList.add('hidden');

    navigateTo('login');
}
