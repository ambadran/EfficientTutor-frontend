import { appState } from './config.js';
import { loginUser, signupUser, fetchStudents, fetchStudentProfile } from './api.js';
import { showLoadingOverlay, hideStatusOverlay, showAuthFeedback, showStatusMessage } from './ui/modals.js';
import { navigateTo } from './ui/navigation.js';
import { renderSidebar } from './ui/templates.js';

export async function loadInitialData() {
    if (!appState.currentUser) return;

    if (appState.currentUser.role === 'parent') {
        try {
            const students = await fetchStudents(appState.currentUser.id);
            appState.students = students;
            appState.currentStudent = students[0] || null;
        } catch (error) {
            console.error("Error loading students:", error);
            showAuthFeedback(error.message);
        }
    } else if (appState.currentUser.role === 'student') {
        try {
            // For students, fetch their own full profile to get availability data
            const studentProfile = await fetchStudentProfile(appState.currentUser.id);
            // Merge the profile data into the currentUser object
            appState.currentUser = { ...appState.currentUser, ...studentProfile };
        } catch (error) {
            console.error("Error loading student profile:", error);
            showAuthFeedback(error.message);
        }
    }
  // No initial data is loaded for a teacher at this stage
}

export async function checkAuthState() {
    const user = JSON.parse(localStorage.getItem('efficientTutorUser'));

    if (user && user.id && user.role) {
        appState.currentUser = user;
        renderSidebar(user.role); // Render the correct sidebar
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('logout-button').classList.remove('hidden');
        document.getElementById('user-email').textContent = user.email;
        
        await loadInitialData();
        
        // Navigation logic based on role
        if (user.role === 'parent') {
            if (appState.currentUser.isFirstSignIn && appState.students.length === 0) {
                navigateTo('student-info');
            } else {
                navigateTo('timetable');
            }

        } else if (user.role === 'student') {
            // Students are directed to their timetable by default
            navigateTo('timetable');

        } else if (user.role === 'teacher') {
            // Teachers are directed to the tuition logs page by default
            navigateTo('teacher-tuition-logs');
        }

    } else {
        renderSidebar(null); // Render no sidebar items if logged out
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
    
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('logout-button').classList.add('hidden');
    renderSidebar(null); // Clear the sidebar on logout

    navigateTo('login');
}
