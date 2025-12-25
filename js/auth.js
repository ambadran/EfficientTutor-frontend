import { appState } from './config.js';
import { loginUser, signupUser, fetchStudents, fetchCurrentUser } from './api.js';
import { showLoadingOverlay, hideStatusOverlay, showAuthFeedback, showStatusMessage } from './ui/modals.js';
import { navigateTo } from './ui/navigation.js';
import { renderSidebar, renderBottomNav } from './ui/templates.js';

// --- UPDATED: Split data loading based on role ---
export async function loadInitialParentData() {
    try {
        const students = await fetchStudents();
        appState.students = students;
        appState.currentStudent = students[0] || null;
    } catch (error) {
        console.error("Error loading parent students:", error);
        // Optionally show feedback if needed
    }
}

export async function loadInitialStudentData() {
    try {
        // The /users/me endpoint now returns all necessary student profile data,
        // so a separate profile fetch is no longer needed.
        // The data is already in appState.currentUser.
    } catch (error) {
        console.error("Error loading student profile:", error);
        // Optionally show feedback if needed
    }
}

// --- UPDATED: checkAuthState now fetches user data if token exists ---
export async function checkAuthState() {
    const token = localStorage.getItem('accessToken');

    if (token) {
        try {
            // If token exists, try to fetch user details
            const userDetails = await fetchCurrentUser();
            appState.currentUser = userDetails; // Store fetched details

            renderSidebar(userDetails.role);
            renderBottomNav(userDetails.role); // Render Mobile Bottom Nav
            
            document.getElementById('user-info').classList.remove('hidden');
            document.getElementById('logout-button').classList.remove('hidden');
            document.getElementById('user-email').textContent = userDetails.email;

            // Load role-specific data AFTER getting user details
            if (userDetails.role === 'parent') {
                await loadInitialParentData();
                 // Parent specific navigation
                if (appState.students.length === 0) { // Check for first sign in concept if needed
                    navigateTo('student-info');
                    return;
                }
            } else if (userDetails.role === 'student') {
                await loadInitialStudentData();
            }

            // Redirect all roles to Dashboard
            navigateTo('dashboard');

        } catch (error) {
            // If fetching user fails (e.g., token expired), clear token and log out
            console.error("Failed to fetch user with token:", error);
            handleLogout(); // Effectively logs the user out
            showAuthFeedback("Your session may have expired. Please log in again.");
        }
    } else {
        // No token, ensure user is logged out
        renderSidebar(null);
        renderBottomNav(null);
        appState.currentUser = null;
        appState.students = [];
        appState.currentStudent = null;
        document.getElementById('user-info').classList.add('hidden');
        document.getElementById('logout-button').classList.add('hidden');
        navigateTo('login');
    }
}

// --- UPDATED: handleLogin stores token, then calls checkAuthState ---
export async function handleLogin(email, password) {
    showLoadingOverlay('Logging in...');
    try {
        const data = await loginUser(email, password); // Gets {access_token: ..., token_type: ...}
        localStorage.setItem('accessToken', data.access_token);
        await checkAuthState(); // checkAuthState will now fetch user details
    } catch (error) {
        showAuthFeedback(error.message);
    } finally {
        hideStatusOverlay();
    }
}

// --- UPDATED: handleSignup no longer logs in, shows message ---
export async function handleSignup(email, password, firstName, lastName, role, specialties = [], availabilityIntervals = []) {
    showLoadingOverlay('Signing up...');
    try {
        // Signup returns user details (UserRead) but doesn't log them in
        await signupUser(email, password, firstName, lastName, role, specialties, availabilityIntervals);

        // Don't store token or user data
        hideStatusOverlay(); // Hide loading
        showAuthFeedback('Signup successful! Please log in with your new account.', 'success');

    } catch (error) {
        hideStatusOverlay();
        showAuthFeedback(error.message);
    }
    // No 'finally' needed here as overlay is handled in try/catch
}

// --- UPDATED: handleLogout clears token ---
export function handleLogout() {
    localStorage.removeItem('accessToken'); // Clear the token
    appState.currentUser = null;
    appState.students = [];
    appState.currentStudent = null;

    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('logout-button').classList.add('hidden');
    renderSidebar(null);
    renderBottomNav(null);

    navigateTo('login');
}
