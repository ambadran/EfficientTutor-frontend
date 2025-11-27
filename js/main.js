// --- IMPORTS ---
import { appState, config } from './config.js';
import { checkBackendStatus, postStudent, deleteStudentRequest, fetchStudent, deleteNote, deleteMeetingLink, updateTeacher, addTeacherSpecialty, deleteTeacherSpecialty } from './api.js';
// UPDATED: Removed 'loadInitialData' from this import
import { checkAuthState, handleLogin, handleSignup, handleLogout } from './auth.js';
import { navigateTo, renderPage } from './ui/navigation.js';
import { toggleSidebar, displayGlobalError, initializeLayout } from './ui/layout.js';
import { showStudentRegistrationWizard } from './ui/studentWizard.js';
import { confirmDeleteStudent } from './ui/templates.js';
import { closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay, showAuthFeedback, clearAuthFeedback, showModal, showConfirmDialog } from './ui/modals.js';
import { renderTeacherTuitionLogsPage, handleVoidLog, showChargesDetail, showAddTuitionLogModal, renderTeacherPaymentLogsPage, showAddPaymentLogModal, handleVoidPaymentLog, showMeetingLinkModal, showMeetingLinkDetailsModal } from './ui/teacher.js';
import { renderNotesList, showCreateNoteModal, showUpdateNoteModal } from './ui/notes.js';

// --- STATE FOR WIZARD ---
let pendingSpecialties = [];

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

async function handleUpdateTeacherProfile() {
    const firstName = document.getElementById('profile-first-name').value.trim();
    const lastName = document.getElementById('profile-last-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const timezone = document.getElementById('profile-timezone').value;
    const currency = document.getElementById('profile-currency').value;

    if (!firstName || !lastName || !email) {
        showStatusMessage('error', 'Name and Email are required.');
        return;
    }

    const updateData = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        timezone: timezone || null,
        currency: currency || null
    };

    showLoadingOverlay('Updating Profile...');
    try {
        await updateTeacher(appState.currentUser.id, updateData);
        
        // Update local state slightly (though renderPage will fetch fresh data usually)
        appState.currentUser.first_name = firstName;
        appState.currentUser.last_name = lastName;
        appState.currentUser.email = email;

        showStatusMessage('success', 'Profile updated successfully.');
        renderPage(); // Refresh to confirm values
    } catch (error) {
        console.error("Profile update error:", error);
        showStatusMessage('error', error.message);
    }
}

function showAddSpecialtyModal() {
    const subjectOptions = config.noteSubjects.map(s => `<option value="${s}">${s}</option>`).join('');
    const systemOptions = config.educationalSystems.map(s => `<option value="${s}">${s}</option>`).join('');

    const body = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm text-gray-400">Subject</label>
                    <select id="new-specialty-subject" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                        ${subjectOptions}
                    </select>
                </div>
                <div>
                    <label class="text-sm text-gray-400">System</label>
                    <select id="new-specialty-system" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                        ${systemOptions}
                    </select>
                </div>
            </div>
            <div>
                <label class="text-sm text-gray-400">Grade</label>
                <input type="number" id="new-specialty-grade" min="1" max="12" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" placeholder="1-12">
            </div>
        </div>
    `;

    const footer = `<div class="flex justify-end"><button id="submit-new-specialty-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Add Specialty</button></div>`;

    showModal('Add Specialty', body, footer, (modal) => {
        modal.querySelector('#submit-new-specialty-btn').addEventListener('click', async () => {
            const subject = modal.querySelector('#new-specialty-subject').value;
            const system = modal.querySelector('#new-specialty-system').value;
            const grade = parseInt(modal.querySelector('#new-specialty-grade').value);

            if (!subject || !system || isNaN(grade) || grade < 1 || grade > 12) {
                alert("Please enter valid subject, system, and grade (1-12).");
                return;
            }

            showLoadingOverlay('Adding specialty...');
            try {
                await addTeacherSpecialty(appState.currentUser.id, {
                    subject: subject,
                    educational_system: system,
                    grade: grade
                });
                closeModal();
                showStatusMessage('success', 'Specialty added.');
                renderPage();
            } catch (error) {
                showStatusMessage('error', error.message);
            }
        });
    });
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
    
    // Reset steps visibility
    document.getElementById('step-1-container').classList.remove('hidden');
    document.getElementById('step-2-container').classList.add('hidden');
    document.getElementById('auth-back-btn').classList.add('hidden');
    
    // Reset pending data
    pendingSpecialties = [];
    renderSpecialtiesList();

    if (isSignup) {
        title.textContent = "Create Account - Sign Up";
        firstNameGroup.classList.remove('hidden');
        lastNameGroup.classList.remove('hidden');
        roleGroup.classList.remove('hidden'); // Show role group
        actionBtn.textContent = 'Sign Up'; // Or Next, handled dynamically
        toggleBtn.textContent = 'Already have an account? Log In';
        actionBtn.dataset.mode = 'signup'; // Store mode in data attribute
        updateSignupButtonText(); // Check if we need to show "Next" or "Sign Up"
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

function updateSignupButtonText() {
    const role = document.getElementById('role').value;
    const actionBtn = document.getElementById('auth-action-btn');
    const isSignup = actionBtn.dataset.mode === 'signup';
    const step2Visible = !document.getElementById('step-2-container').classList.contains('hidden');

    if (isSignup && role === 'teacher' && !step2Visible) {
        actionBtn.textContent = 'Next';
    } else if (isSignup) {
        actionBtn.textContent = 'Sign Up';
    }
}

function populateSpecialtyDropdowns() {
    const subjectSelect = document.getElementById('specialty-subject');
    const systemSelect = document.getElementById('specialty-system');
    
    if (subjectSelect.options.length === 0) {
        subjectSelect.innerHTML = config.noteSubjects.map(s => `<option value="${s}">${s}</option>`).join('');
    }
    if (systemSelect.options.length === 0) {
        systemSelect.innerHTML = config.educationalSystems.map(s => `<option value="${s}">${s}</option>`).join('');
    }
}

function renderSpecialtiesList() {
    const container = document.getElementById('specialties-list');
    if (pendingSpecialties.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 text-sm py-2">No specialties added yet.</p>';
        return;
    }
    
    // Group by Subject for better display? Or just list them. Let's list them simply for now.
    // Actually, grouping by Subject + System makes sense to show the range.
    // But simpler: Just show chips.
    
    const itemsHTML = pendingSpecialties.map((spec, index) => `
        <div class="flex justify-between items-center bg-gray-800 p-2 rounded text-sm border border-gray-600">
            <span><span class="font-bold text-indigo-400">${spec.subject}</span> <span class="text-xs text-gray-400">(${spec.educational_system})</span> Grade ${spec.grade}</span>
            <button type="button" class="remove-specialty-btn text-red-400 hover:text-red-300" data-index="${index}"><i class="fas fa-times"></i></button>
        </div>
    `).join('');
    
    container.innerHTML = itemsHTML;
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
        const role = document.getElementById('role').value;
        const step1Container = document.getElementById('step-1-container');
        const step2Container = document.getElementById('step-2-container');
        const backBtn = document.getElementById('auth-back-btn');
        const actionBtn = document.getElementById('auth-action-btn');

        if (mode === 'signup' && role === 'teacher' && step2Container.classList.contains('hidden')) {
            // Validate Step 1 first
            const step1Valid = validateAuthForm(true);
            if (step1Valid) {
                // Go to Step 2
                step1Container.classList.add('hidden');
                step2Container.classList.remove('hidden');
                backBtn.classList.remove('hidden');
                populateSpecialtyDropdowns();
                updateSignupButtonText();
            }
        } else {
            // Normal Login or Final Signup
            const credentials = validateAuthForm(mode === 'signup');
            if (credentials) {
                if (mode === 'signup') {
                    // Attach specialties if teacher
                    if (role === 'teacher') {
                        credentials.teacher_specialties = pendingSpecialties;
                        if (pendingSpecialties.length === 0) {
                            showAuthFeedback("Please add at least one specialty.", "error");
                            return;
                        }
                    }
                    handleSignup(credentials.email, credentials.password, credentials.firstName, credentials.lastName, credentials.role, credentials.teacher_specialties);
                } else {
                    handleLogin(credentials.email, credentials.password);
                }
            }
        }
    }

    if (closest('#auth-back-btn')) {
        document.getElementById('step-1-container').classList.remove('hidden');
        document.getElementById('step-2-container').classList.add('hidden');
        document.getElementById('auth-back-btn').classList.add('hidden');
        updateSignupButtonText();
    }

    if (closest('#add-specialty-btn')) {
        const subject = document.getElementById('specialty-subject').value;
        const system = document.getElementById('specialty-system').value;
        const from = parseInt(document.getElementById('specialty-grade-from').value);
        const to = parseInt(document.getElementById('specialty-grade-to').value);

        if (!subject || !system || isNaN(from) || isNaN(to)) {
            // Basic validation
            return; 
        }
        
        if (from < 1 || to > 12 || from > to) {
             // Logic validation
             alert("Invalid grade range (1-12).");
             return;
        }

        // Generate Range
        for (let g = from; g <= to; g++) {
            // Avoid duplicates
            const exists = pendingSpecialties.some(s => s.subject === subject && s.educational_system === system && s.grade === g);
            if (!exists) {
                pendingSpecialties.push({ subject: subject, educational_system: system, grade: g });
            }
        }
        renderSpecialtiesList();
        // Reset inputs
        document.getElementById('specialty-grade-from').value = '';
        document.getElementById('specialty-grade-to').value = '';
    }

    const removeSpecBtn = closest('.remove-specialty-btn');
    if (removeSpecBtn) {
        const index = parseInt(removeSpecBtn.dataset.index);
        pendingSpecialties.splice(index, 1);
        renderSpecialtiesList();
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
        showConfirmDialog('Delete Meeting Link', 'Are you sure you want to delete the meeting link for this tuition?', () => {
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
        });
    }

    // --- Notes Page ---
    if (closest('#add-new-note-btn')) { showCreateNoteModal(); }
    
    const editNoteBtn = closest('.edit-note-btn');
    if (editNoteBtn) {
        const note = appState.notes.find(n => n.id === editNoteBtn.dataset.noteId);
        if (note) showUpdateNoteModal(note);
    }

    const deleteNoteBtn = closest('.delete-note-btn');
    if (deleteNoteBtn) {
        const noteId = deleteNoteBtn.dataset.noteId;
        const note = appState.notes.find(n => n.id === noteId);
        const noteName = note ? `"${note.name}"` : "this note";
        showConfirmDialog('Delete Note', `Are you sure you want to delete ${noteName}?`, () => {
            showLoadingOverlay('Deleting note...');
            deleteNote(noteId)
                .then(() => {
                    showStatusMessage('success', 'Note deleted.');
                    renderPage();
                })
                .catch(err => showStatusMessage('error', `Failed to delete note: ${err.message}`));
        });
    }

    const subjectCard = closest('.subject-card-button');
    if (subjectCard) {
        const subject = subjectCard.dataset.subject;
        document.getElementById('notes-content-container').innerHTML = renderNotesList(subject);
    }

    if (closest('#back-to-subjects-btn')) {
        renderPage();
    }

    // --- Profile Page (Teacher) ---
    if (closest('#save-teacher-profile-btn')) {
        handleUpdateTeacherProfile();
    }

    if (closest('#open-add-specialty-modal-btn')) {
        showAddSpecialtyModal();
    }

    const deleteSpecialtyBtn = closest('.delete-specialty-btn');
    if (deleteSpecialtyBtn) {
        const specialtyId = deleteSpecialtyBtn.dataset.id;
        showConfirmDialog('Delete Specialty', 'Are you sure you want to remove this specialty?', async () => {
            showLoadingOverlay('Deleting specialty...');
            try {
                await deleteTeacherSpecialty(appState.currentUser.id, specialtyId);
                showStatusMessage('success', 'Specialty removed.');
                renderPage(); // Reload profile to reflect changes
            } catch (error) {
                showStatusMessage('error', error.message);
            }
        });
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
// Listener for Teacher's Role dropdown to toggle "Next" button logic
document.getElementById('page-content').addEventListener('change', (e) => {
    if (e.target.id === 'student-selector') {
        appState.currentStudent = appState.students.find(s => s.id === e.target.value) || null;
        renderPage(); // Re-render the timetable/logs page for the selected student
    }
    // NEW: Listener for the Notes student selector
    if (e.target.id === 'notes-student-selector') {
        appState.notesStudentFilter = e.target.value;
        renderPage();
    }
    // NEW: Listener for Role change on Signup
    if (e.target.id === 'role') {
        updateSignupButtonText();
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
