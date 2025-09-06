/* This file is now responsible for everything related to the user's session: 
 * signing up, logging in, logging out, and checking the initial authentication 
 * state when the app loads. It interacts with the api.js module to perform 
 * the network requests and updates the global appState.
 */
import { api } from './api.js';
import { appState, navigateTo } from './main.js';
import { showStatusMessage, hideStatusOverlay } from './components/modal.js';

/**
 * Checks for a saved user session in localStorage on page load.
 */
export function checkAuth() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        appState.currentUser = JSON.parse(savedUser);
        console.log('Session restored for:', appState.currentUser.email);
        navigateTo('timetable');
    } else {
        // Ensure we're in login mode if there's no session
        appState.authMode = 'login';
        navigateTo('login');
    }
}

export async function handleLogin(email, password) {
    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showStatusMessage('Invalid email format.', 'error');
        setTimeout(hideStatusOverlay, 3000);
        return;
    }

    showStatusMessage('Logging in...', 'loading');
    const { success, data, error } = await api.login(email, password);

    if (success) {
        appState.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        hideStatusOverlay();
        if (data.user.isFirstSignIn) {
            navigateTo('students');
        } else {
            navigateTo('timetable');
        }
    } else {
        showStatusMessage(`Login Failed: ${error}`, 'error');
        setTimeout(hideStatusOverlay, 3000);
    }
}


/**
 * THE FIX: The signup handler is now much simpler.
 * It makes one API call and directly handles the resulting user session.
 * The password length check has been REMOVED as requested.
 */
export async function handleSignup(email, password) {
    // Client-side email validation remains.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showStatusMessage('Invalid email format.', 'error');
        setTimeout(hideStatusOverlay, 3000);
        return;
    }

    showStatusMessage('Creating account...', 'loading');
    // The '/signup' endpoint now returns the full user session data upon success.
    const { success, data, error } = await api.signup(email, password);

    if (success) {
        // The signup was successful, and we already have the user data.
        // No need to call handleLogin again.
        appState.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        hideStatusOverlay();
        // The isFirstSignIn flag will always be true for a new user.
        navigateTo('students');
    } else {
        showStatusMessage(`Signup Failed: ${error}`, 'error');
        setTimeout(hideStatusOverlay, 3000);
    }
}

export function handleLogout() {
    appState.currentUser = null;
    localStorage.removeItem('currentUser');
    console.log('User logged out.');
    
    // THE FIX: Reset authMode to ensure the login page is shown
    appState.authMode = 'login';
    navigateTo('login');
}

