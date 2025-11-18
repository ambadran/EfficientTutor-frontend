// --- IMPORTS ---
import { appState } from './config.js';
import { checkBackendStatus, postStudent, deleteStudentRequest, fetchStudent } from './api.js';
// UPDATED: Removed 'loadInitialData' from this import
import { checkAuthState, handleLogin, handleSignup, handleLogout } from './auth.js';
import { navigateTo, renderPage } from './ui/navigation.js';
import { toggleSidebar, displayGlobalError, initializeLayout } from './ui/layout.js';
import { showStudentRegistrationWizard } from './ui/studentWizard.js';
import { confirmDeleteStudent } from './ui/templates.js';
import { closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay, showAuthFeedback, clearAuthFeedback, showModal } from './ui/modals.js';
import { renderTeacherTuitionLogsPage, handleVoidLog, showChargesDetail, showAddTuitionLogModal, renderTeacherPaymentLogsPage, showAddPaymentLogModal, handleVoidPaymentLog, showMeetingLinkModal, showMeetingLinkDetailsModal } from './ui/teacher.js';

// --- DATA HANDLERS ---
async function handleSaveStudent(studentData) {
    if (!appState.currentUser) return;
    showLoadingOverlay('Saving student data...');
    try {
        await postStudent(appState.currentUser.id, studentData);
        // Note: isFirstSignIn logic might need adjustment depending on backend JWT flow
        // Removed the direct manipulation of isFirstSignIn here as checkAuthState handles user data fetch
        await checkAuthState(); // Refresh state after saving
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
        await deleteStudentRequest(studentId);
        await checkAuthState(); // Refresh state after deleting
        showStatusMessage('success', 'Student deleted.');
        renderPage(); // Re-render the current page (student info)
    } catch (error) {
        console.error("Error deleting student:", error);
        showStatusMessage('error', error.message);
    }
}

async function handleViewCredentials(studentId) {
    showLoadingOverlay('Fetching credentials...');
    try {
        const creds = await fetchStudent(studentId);
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
function validateAuthForm(isSignup = false) {
    clearAuthFeedback();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let firstName = null;
    let lastName = null;
    let role = null; // Add role variable

    if (isSignup) {
        firstName = document.getElementById('firstName').value.trim();
        lastName = document.getElementById('lastName').value.trim();
        role = document.getElementById('role').value; // Get role value
        if (!firstName || !lastName) {
            showAuthFeedback("First name and last name cannot be empty for signup.");
            return null;
        }
    }

    if (!email || !password) {
        showAuthFeedback("Email and password cannot be empty.");
        return null;
    }
    if (!emailRegex.test(email)) {
        showAuthFeedback("Please enter a valid email address.");
        return null;
    }
    if (password.length < 6) { // Basic password length check
         showAuthFeedback("Password must be at least 6 characters long.");
         return null;
    }

    return { email, password, firstName, lastName, role }; // Return role
}

// --- Auth Mode Toggle ---
function toggleAuthMode(isSignup) {
    clearAuthFeedback();
    const title = document.getElementById('auth-title');
    const firstNameGroup = document.getElementById('first-name-group');
    const lastNameGroup = document.getElementById('last-name-group');
    const roleGroup = document.getElementById('role-group'); // Get the new role group
    const actionBtn = document.getElementById('auth-action-btn');
    const toggleBtn = document.getElementById('auth-toggle-btn');

    if (isSignup) {
        title.textContent = "Create Account - Sign Up";
        firstNameGroup.classList.remove('hidden');
        lastNameGroup.classList.remove('hidden');
        roleGroup.classList.remove('hidden'); // Show role group
        actionBtn.textContent = 'Sign Up';
        toggleBtn.textContent = 'Already have an account? Log In';
        actionBtn.dataset.mode = 'signup'; // Store mode in data attribute
    } else {
        title.textContent = "Welcome - Log In";
        firstNameGroup.classList.add('hidden');
        lastNameGroup.classList.add('hidden');
        roleGroup.classList.add('hidden'); // Hide role group
        actionBtn.textContent = 'Login';
        toggleBtn.textContent = 'Need an account? Sign Up';
        actionBtn.dataset.mode = 'login'; // Store mode in data attribute
    }
}


// --- GLOBAL EVENT LISTENERS ---
document.body.addEventListener('click', (e) => {
    const target = e.target;
    const closest = (selector) => target.closest(selector);

    // General UI
    if (!closest('.share-container')) { document.querySelectorAll('.share-dropdown').forEach(el => el.classList.add('hidden')); }
    if (closest('#menu-button')) { toggleSidebar(); }
    if (closest('#modal-close-btn') || (closest('#modal-backdrop') && !closest('.modal-content'))) { closeModal(); }
    if (closest('#theme-toggle-btn')) { document.documentElement.classList.toggle('dark'); document.documentElement.classList.toggle('light'); renderPage(); }

    // Navigation
    const navLink = closest('.nav-link');
    if (navLink) { e.preventDefault(); navigateTo(navLink.id.replace('nav-', '')); }

    // Authentication
    if (closest('#auth-action-btn')) {
        e.preventDefault();
        const mode = target.dataset.mode || 'login';
        const credentials = validateAuthForm(mode === 'signup');
        if (credentials) {
            if (mode === 'signup') {
                handleSignup(credentials.email, credentials.password, credentials.firstName, credentials.lastName, credentials.role);
            } else {
                handleLogin(credentials.email, credentials.password);
            }
        }
    }
    if (closest('#auth-toggle-btn')) {
        e.preventDefault();
        const currentMode = document.getElementById('auth-action-btn').dataset.mode || 'login';
        toggleAuthMode(currentMode === 'login');
    }
    if (closest('#logout-button')) { handleLogout(); }

    // Parent Specific
    if (closest('#add-new-student-btn')) { showStudentRegistrationWizard(null, handleSaveStudent); }
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
    if (viewCredsBtn) { handleViewCredentials(viewCredsBtn.dataset.id); }

    // Teacher - Tuition Logs
    if (closest('#add-new-log-btn')) { showAddTuitionLogModal(); }
    const voidTuitionBtn = closest('.void-log-btn');
    if (voidTuitionBtn) { handleVoidLog(voidTuitionBtn.dataset.logId); }
    const correctTuitionBtn = closest('.correct-log-btn');
    if (correctTuitionBtn) {
        const logId = correctTuitionBtn.dataset.logId;
        const logToCorrect = appState.teacherTuitionLogs?.find(log => log.id === logId);
        if (logToCorrect) { showAddTuitionLogModal(logToCorrect); }
    }
    const chargesBtn = closest('.view-charges-btn');
    if (chargesBtn) { showChargesDetail(chargesBtn.dataset.logId); }

    // Teacher - Payment Logs
    if (closest('#add-new-payment-log-btn')) { showAddPaymentLogModal(); }
    const voidPaymentBtn = closest('.void-payment-log-btn');
    if (voidPaymentBtn) { handleVoidPaymentLog(voidPaymentBtn.dataset.logId); }
    const correctPaymentBtn = closest('.correct-payment-log-btn');
    if (correctPaymentBtn) {
        const logId = correctPaymentBtn.dataset.logId;
        const logToCorrect = appState.teacherPaymentLogs?.find(log => log.id === logId);
        if (logToCorrect) { showAddPaymentLogModal(logToCorrect); }
    }

    const viewMeetingLinkBtn = closest('.view-meeting-link-btn');
    if (viewMeetingLinkBtn) {
        const tuitionId = viewMeetingLinkBtn.dataset.tuitionId;
        const scheduledItem = (appState.teacherScheduledTuitions || []).find(item => item.tuition.id === tuitionId);
        if (scheduledItem && scheduledItem.tuition) {
            showMeetingLinkDetailsModal(scheduledItem.tuition);
        }
    }

    const editMeetingLinkBtn = closest('.edit-meeting-link-btn');
    if (editMeetingLinkBtn) {
        const tuitionId = editMeetingLinkBtn.dataset.tuitionId;
        const scheduledItem = (appState.teacherScheduledTuitions || []).find(item => item.tuition.id === tuitionId);
        if (scheduledItem) {
            showMeetingLinkModal(scheduledItem.tuition);
        }
    }

    const deleteMeetingLinkBtn = closest('.delete-meeting-link-btn');
    if (deleteMeetingLinkBtn) {
        const tuitionId = deleteMeetingLinkBtn.dataset.tuitionId;
        if (confirm('Are you sure you want to delete the meeting link for this tuition?')) {
            showLoadingOverlay('Deleting link...');
            deleteMeetingLink(tuitionId)
                .then(() => {
                    showStatusMessage('success', 'Meeting link deleted.');
                    renderPage(); // Re-render the page to show the change
                })
                .catch(err => {
                    showStatusMessage('error', `Failed to delete link: ${err.message}`);
                })
                .finally(() => {
                    closeModal(); // Close the details modal if it's open
                });
        }
    }

    // Timetable Page Specific
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

// Listener for Parent's Student Selector Dropdown
document.getElementById('page-content').addEventListener('change', (e) => {
    if (e.target.id === 'student-selector') {
        appState.currentStudent = appState.students.find(s => s.id === e.target.value) || null;
        renderPage(); // Re-render the timetable/logs page for the selected student
    }
});

// --- INITIALIZATION ---
async function initialize() {
    navigateTo('login'); // Start at login page
    initializeLayout(); // Set initial sidebar state
    showLoadingOverlay('Connecting to server...');
    try {
        await checkBackendStatus();
        console.log("Backend connection successful.");
        hideStatusOverlay();
        await checkAuthState(); // Check if already logged in via token
    } catch (error) {
        console.error("Initialization Error:", error);
        hideStatusOverlay();
        displayGlobalError(error.message);
        document.getElementById('retry-connection-btn')?.addEventListener('click', initialize);
    }
}

// Start the application
initialize();
