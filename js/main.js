// --- IMPORTS ---
import { appState } from './config.js';
import { checkBackendStatus, postStudent, deleteStudentRequest, fetchStudentCredentials } from './api.js';
import { checkAuthState, handleLogin, handleSignup, handleLogout, loadInitialData } from './auth.js';
import { navigateTo, renderPage } from './ui/navigation.js';
import { toggleSidebar, displayGlobalError } from './ui/layout.js';
import { showStudentRegistrationWizard } from './ui/studentWizard.js';
import { confirmDeleteStudent } from './ui/templates.js';
import { closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay, showAuthFeedback, clearAuthFeedback, showModal } from './ui/modals.js';
import { showAddTuitionLogModal, handleVoidLog, showChargesDetail, showAddPaymentLogModal, handleVoidPaymentLog } from './ui/teacher.js';

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

async function handleViewCredentials(studentId) {
    showLoadingOverlay('Fetching credentials...');
    try {
        const creds = await fetchStudentCredentials(appState.currentUser.id, studentId);
        const content = `
            <div class="space-y-4">
                <div>
                    <label class="text-sm font-medium text-gray-400">Email</label>
                    <input type="text" readonly value="${creds.email}" class="w-full mt-1 p-2 bg-gray-800 rounded-md border border-gray-600">
                </div>
                <div>
                    <label class="text-sm font-medium text-gray-400">Password</label>
                    <input type="text" readonly value="${creds.generated_password}" class="w-full mt-1 p-2 bg-gray-800 rounded-md border border-gray-600">
                </div>
                <p class="text-xs text-gray-500">Please save this password in a secure location.</p>
            </div>
        `;
        const footer = `<div class="flex justify-end"><button id="modal-close-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Close</button></div>`;
        showModal('Student Credentials', content, footer);
    } catch (error) {
        showStatusMessage('error', error.message);
    } finally {
        hideStatusOverlay();
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

    const navLink = closest('.nav-link');
    if (navLink) {
        e.preventDefault();
        navigateTo(navLink.id.replace('nav-', ''));
    }

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

    if (closest('#add-new-student-btn')) showStudentRegistrationWizard(null, handleSaveStudent);

    // --- Teacher Dashboard Listeners ---
    // Tuition Logs
    if (closest('#add-new-log-btn')) {
        showAddTuitionLogModal(); 
    }

    const voidBtn = closest('.void-log-btn');
    if (voidBtn) {
        handleVoidLog(voidBtn.dataset.logId);
    }
    
    const correctBtn = closest('.correct-log-btn');
    if (correctBtn) {
        const logId = correctBtn.dataset.logId;
        // Find the full log object from the cached state
        const logToCorrect = appState.teacherTuitionLogs?.find(log => log.id === logId);
        if (logToCorrect) {
            showAddTuitionLogModal(logToCorrect);
        } else {
            console.error("Could not find log to correct in state cache.");
            showStatusMessage('error', 'Could not find log data. Please refresh.');
        }
    }
    // NEW: Listener for the charge details button
    const chargesBtn = closest('.view-charges-btn');
    if (chargesBtn) {
        showChargesDetail(chargesBtn.dataset.logId);
    }
    // ---------------------------------------------------

    // NEW: Payment Logs
    if (closest('#add-new-payment-log-btn')) {
        showAddPaymentLogModal();
    }
    const voidPaymentBtn = closest('.void-payment-log-btn');
    if (voidPaymentBtn) {
        handleVoidPaymentLog(voidPaymentBtn.dataset.logId);
    }
    const correctPaymentBtn = closest('.correct-payment-log-btn');
    if (correctPaymentBtn) {
        const logId = correctPaymentBtn.dataset.logId;
        const logToCorrect = appState.teacherPaymentLogs?.find(log => log.id === logId);
        if (logToCorrect) { showAddPaymentLogModal(logToCorrect); }
    }
    // ---------------------------------------------------
  
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
    
    const viewCredsBtn = closest('.view-creds-btn');
    if (viewCredsBtn) {
        handleViewCredentials(viewCredsBtn.dataset.id);
    }
    
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
