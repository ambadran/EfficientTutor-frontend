// --- IMPORTS ---
import { appState, config } from './config.js';
import { checkBackendStatus, postStudent, deleteStudentRequest, fetchStudent, deleteNote, deleteMeetingLink, updateTeacher, updateParent, addTeacherSpecialty, deleteTeacherSpecialty } from './api.js';
import { checkAuthState, handleLogin, handleSignup, handleLogout } from './auth.js';
import { navigateTo, renderPage, handleParentLogFilterTypeChange, handleParentLogFilterEntityChange } from './ui/navigation.js';
import { toggleSidebar, displayGlobalError, initializeLayout } from './ui/layout.js';
import { showStudentRegistrationWizard } from './ui/studentWizard.js';
import { confirmDeleteStudent } from './ui/templates.js';
import { closeModal, showLoadingOverlay, showStatusMessage, hideStatusOverlay, showAuthFeedback, clearAuthFeedback, showModal, showConfirmDialog } from './ui/modals.js';
import { renderTeacherTuitionLogsPage, handleVoidLog, showChargesDetail, showAddTuitionLogModal, renderTeacherPaymentLogsPage, showAddPaymentLogModal, handleVoidPaymentLog, showMeetingLinkModal, showMeetingLinkDetailsModal, handleTuitionFilterTypeChange, handleTuitionFilterEntityChange, handlePaymentFilterTypeChange, handlePaymentFilterEntityChange } from './ui/teacher.js';
import { renderNotesList, showCreateNoteModal, showUpdateNoteModal } from './ui/notes.js';
import { renderStudentProfile, handleSaveStudentDetails, handleCreateStudent, showAddSubjectModal, handleRemoveSubject, handleProfileTimetableAction, updateProfileTimetable } from './ui/profile.js';
import { renderTimetableComponent, wizardTimetableHandlers } from './ui/timetable.js';

import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

// --- STATE FOR WIZARD ---
let pendingSpecialties = [];
let pendingTeacherAvailability = {}; // New state for teacher signup timetable

function initializeTeacherAvailability() {
    pendingTeacherAvailability = { availability: {} };
    config.daysOfWeek.forEach(day => {
        const dayKey = day.toLowerCase();
        pendingTeacherAvailability.availability[dayKey] = [];
        // Default Sleep
        pendingTeacherAvailability.availability[dayKey].push({ type: 'sleep', ...config.defaultSleepTimes });
        // Default Work (Weekdays)
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
        if (weekdays.includes(dayKey)) {
             pendingTeacherAvailability.availability[dayKey].push({ type: 'work', start: '07:00', end: '15:00' });
        }
    });
}

function renderTeacherSignupTimetable() {
    const container = document.getElementById('teacher-signup-timetable-container');
    if (container) {
        container.innerHTML = renderTimetableComponent(true, pendingTeacherAvailability);
        // Replace School button with Work button
        const schoolBtn = container.querySelector('button[data-type="school"]');
        if (schoolBtn) {
            schoolBtn.dataset.type = 'work';
            schoolBtn.innerHTML = '<i class="fas fa-briefcase mr-2"></i> Set All Work Times';
        }
    }
}

function mapTeacherUiAvailabilityToApi() {
    const apiIntervals = [];
    config.daysOfWeek.forEach((day, index) => {
        const dayKey = day.toLowerCase();
        const events = pendingTeacherAvailability.availability[dayKey] || [];
        events.forEach(event => {
            apiIntervals.push({
                day_of_week: index + 1,
                start_time: event.start.length === 5 ? `${event.start}:00` : event.start,
                end_time: event.end.length === 5 ? `${event.end}:00` : event.end,
                availability_type: event.type
            });
        });
    });
    return apiIntervals;
}

// --- DATA HANDLERS ---
async function handleSaveStudent(studentData) {
    if (!appState.currentUser) return;
    showLoadingOverlay('Saving student data...');
    try {
        await postStudent(appState.currentUser.id, studentData);
        await checkAuthState(); 
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
        await checkAuthState(); 
        showStatusMessage('success', 'Student deleted.');
        renderPage(); 
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

async function handleUpdateTeacherProfile(userId) {
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
        await updateTeacher(userId, updateData);
        
        if (appState.currentUser && appState.currentUser.id === userId) {
            appState.currentUser.first_name = firstName;
            appState.currentUser.last_name = lastName;
            appState.currentUser.email = email;
        }

        showStatusMessage('success', 'Profile updated successfully.');
        renderPage(); 
    } catch (error) {
        console.error("Profile update error:", error);
        showStatusMessage('error', error.message);
    }
}

async function handleUpdateParentProfile(userId) {
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
        await updateParent(userId, updateData);
        
        if (appState.currentUser && appState.currentUser.id === userId) {
            appState.currentUser.first_name = firstName;
            appState.currentUser.last_name = lastName;
            appState.currentUser.email = email;
        }

        showStatusMessage('success', 'Profile updated successfully.');
        renderPage();
    } catch (error) {
        console.error("Parent profile update error:", error);
        showStatusMessage('error', error.message);
    }
}

function showAddSpecialtyModal(teacherId) {
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
                await addTeacherSpecialty(teacherId, {
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
    let role = null; 

    if (isSignup) {
        firstName = document.getElementById('firstName').value.trim();
        lastName = document.getElementById('lastName').value.trim();
        role = document.getElementById('role').value; 
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
    if (password.length < 6) { 
         showAuthFeedback("Password must be at least 6 characters long.");
         return null;
    }

    return { email, password, firstName, lastName, role }; 
}

// --- Auth Mode Toggle ---
function toggleAuthMode(isSignup) {
    clearAuthFeedback();
    const title = document.getElementById('auth-title');
    const firstNameGroup = document.getElementById('first-name-group');
    const lastNameGroup = document.getElementById('last-name-group');
    const roleGroup = document.getElementById('role-group'); 
    const actionBtn = document.getElementById('auth-action-btn');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    
    document.getElementById('step-1-container').classList.remove('hidden');
    document.getElementById('step-2-container').classList.add('hidden');
    document.getElementById('step-3-container').classList.add('hidden');
    document.getElementById('auth-back-btn').classList.add('hidden');
    
    pendingSpecialties = [];
    renderSpecialtiesList();
    initializeTeacherAvailability();

    if (isSignup) {
        title.textContent = "Create Account - Sign Up";
        firstNameGroup.classList.remove('hidden');
        lastNameGroup.classList.remove('hidden');
        roleGroup.classList.remove('hidden'); 
        actionBtn.textContent = 'Sign Up'; 
        toggleBtn.textContent = 'Already have an account? Log In';
        actionBtn.dataset.mode = 'signup'; 
        updateSignupButtonText(); 
    } else {
        title.textContent = "Welcome - Log In";
        firstNameGroup.classList.add('hidden');
        lastNameGroup.classList.add('hidden');
        roleGroup.classList.add('hidden'); 
        actionBtn.textContent = 'Login';
        toggleBtn.textContent = 'Need an account? Sign Up';
        actionBtn.dataset.mode = 'login'; 
    }
}

function updateSignupButtonText() {
    const role = document.getElementById('role').value;
    const actionBtn = document.getElementById('auth-action-btn');
    const isSignup = actionBtn.dataset.mode === 'signup';
    const step2Visible = !document.getElementById('step-2-container').classList.contains('hidden');
    const step3Visible = !document.getElementById('step-3-container').classList.contains('hidden');

    if (isSignup && role === 'teacher') {
        if (!step2Visible && !step3Visible) {
             actionBtn.textContent = 'Next';
        } else if (step2Visible) {
             actionBtn.textContent = 'Next';
        } else {
             actionBtn.textContent = 'Sign Up';
        }
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
        const step3Container = document.getElementById('step-3-container');
        const backBtn = document.getElementById('auth-back-btn');

        if (mode === 'signup' && role === 'teacher') {
            const step2Hidden = step2Container.classList.contains('hidden');
            const step3Hidden = step3Container.classList.contains('hidden');

            if (step2Hidden && step3Hidden) {
                // Step 1 -> Step 2
                const step1Valid = validateAuthForm(true);
                if (step1Valid) {
                    step1Container.classList.add('hidden');
                    step2Container.classList.remove('hidden');
                    backBtn.classList.remove('hidden');
                    populateSpecialtyDropdowns();
                    updateSignupButtonText();
                }
            } else if (!step2Hidden) {
                // Step 2 -> Step 3
                if (pendingSpecialties.length === 0) {
                    showAuthFeedback("Please add at least one specialty.", "error");
                    return;
                }
                step2Container.classList.add('hidden');
                step3Container.classList.remove('hidden');
                renderTeacherSignupTimetable();
                updateSignupButtonText();
            } else {
                 // Step 3 -> Submit
                 const credentials = validateAuthForm(true); 
                 const availability = mapTeacherUiAvailabilityToApi();
                 handleSignup(credentials.email, credentials.password, credentials.firstName, credentials.lastName, credentials.role, pendingSpecialties, availability);
            }
        } else {
            // Normal Login or Final Signup (Parent)
            const credentials = validateAuthForm(mode === 'signup');
            if (credentials) {
                if (mode === 'signup') {
                    // Parent Signup
                    handleSignup(credentials.email, credentials.password, credentials.firstName, credentials.lastName, credentials.role);
                } else {
                    handleLogin(credentials.email, credentials.password);
                }
            }
        }
    }

    if (closest('#auth-back-btn')) {
        const step2Container = document.getElementById('step-2-container');
        const step3Container = document.getElementById('step-3-container');
        
        if (!step3Container.classList.contains('hidden')) {
             step3Container.classList.add('hidden');
             step2Container.classList.remove('hidden');
        } else if (!step2Container.classList.contains('hidden')) {
             step2Container.classList.add('hidden');
             document.getElementById('step-1-container').classList.remove('hidden');
             document.getElementById('auth-back-btn').classList.add('hidden');
        }
        updateSignupButtonText();
    }

    if (closest('#add-specialty-btn')) {
        const subject = document.getElementById('specialty-subject').value;
        const system = document.getElementById('specialty-system').value;
        const from = parseInt(document.getElementById('specialty-grade-from').value);
        const to = parseInt(document.getElementById('specialty-grade-to').value);

        if (!subject || !system || isNaN(from) || isNaN(to)) {
            return; 
        }
        
        if (from < 1 || to > 12 || from > to) {
             alert("Invalid grade range (1-12).");
             return;
        }

        for (let g = from; g <= to; g++) {
            const exists = pendingSpecialties.some(s => s.subject === subject && s.educational_system === system && s.grade === g);
            if (!exists) {
                pendingSpecialties.push({ subject: subject, educational_system: system, grade: g });
            }
        }
        renderSpecialtiesList();
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

    // Teacher Signup Timetable Interactions
    if (closest('#teacher-signup-timetable-container')) {
        const grid = closest('#timetable-grid-main');
        if (grid && target === grid) {
             wizardTimetableHandlers.showAddEventModal(pendingTeacherAvailability, grid.dataset.dayKey, e.offsetY, renderTeacherSignupTimetable);
        }
        const bubble = closest('.event-bubble');
        if (bubble && grid) {
             wizardTimetableHandlers.showEditEventModal(pendingTeacherAvailability, grid.dataset.dayKey, bubble.dataset.start, renderTeacherSignupTimetable);
        }
        const setAllBtn = closest('.set-all-times-btn');
        if (setAllBtn) {
             wizardTimetableHandlers.showSetAllTimesModal(pendingTeacherAvailability, setAllBtn.dataset.type, renderTeacherSignupTimetable);
        }
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

    // Teacher - Toggle Parent Breakdown
    if (closest('#toggle-parent-breakdown-btn')) {
        const content = document.getElementById('parent-breakdown-content');
        const icon = closest('#toggle-parent-breakdown-btn').querySelector('i');
        if (content) {
            content.classList.toggle('hidden');
            if (content.classList.contains('hidden')) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            } else {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            }
        }
    }

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
                    renderPage(); 
                })
                .catch(err => {
                    showStatusMessage('error', `Failed to delete link: ${err.message}`);
                })
                .finally(() => {
                    closeModal(); 
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

    // --- Profile Page (Teacher/Parent) ---
    if (closest('#save-teacher-profile-btn')) {
        handleUpdateTeacherProfile(closest('#save-teacher-profile-btn').dataset.userId);
    }

    if (closest('#save-parent-profile-btn')) {
        handleUpdateParentProfile(closest('#save-parent-profile-btn').dataset.userId);
    }

    if (closest('#open-add-specialty-modal-btn')) {
        showAddSpecialtyModal(closest('#open-add-specialty-modal-btn').dataset.userId);
    }

    const deleteSpecialtyBtn = closest('.delete-specialty-btn');
    if (deleteSpecialtyBtn) {
        const specialtyId = deleteSpecialtyBtn.dataset.id;
        const teacherId = deleteSpecialtyBtn.dataset.teacherId;
        showConfirmDialog('Delete Specialty', 'Are you sure you want to remove this specialty?', async () => {
            showLoadingOverlay('Deleting specialty...');
            try {
                await deleteTeacherSpecialty(teacherId, specialtyId);
                showStatusMessage('success', 'Specialty removed.');
                renderPage(); 
            } catch (error) {
                showStatusMessage('error', error.message);
            }
        });
    }

    // --- Student Management (New) ---
    if (closest('#btn-create-student')) {
        // Open Create Mode
        renderStudentProfile(null, 'create').then(html => {
             document.getElementById('page-content').innerHTML = html;
        });
    }

    const viewStudentBtn = closest('.btn-view-student');
    if (viewStudentBtn) {
        const studentId = viewStudentBtn.dataset.id;
        renderStudentProfile(studentId, 'edit').then(html => {
             document.getElementById('page-content').innerHTML = html;
        });
    }

    if (closest('#save-student-details-btn')) {
        const btn = closest('#save-student-details-btn');
        handleSaveStudentDetails(btn.dataset.studentId);
    }

    if (closest('#create-student-btn')) {
        handleCreateStudent();
    }

    if (closest('#add-student-subject-btn')) {
        showAddSubjectModal(closest('#add-student-subject-btn').dataset.studentId);
    }

    const removeSubjectBtn = closest('.remove-subject-btn');
    if (removeSubjectBtn) {
        handleRemoveSubject(removeSubjectBtn.dataset.studentId, parseInt(removeSubjectBtn.dataset.subjectIndex));
    }

    if (closest('#cancel-create-student-btn')) {
        renderPage(); 
    }

    // --- Profile Availability Management ---
    if (closest('#profile-timetable-wrapper')) {
        const grid = closest('#timetable-grid-main');
        
        // Add Event (Click on grid background)
        if (grid && target === grid) {
             handleProfileTimetableAction('add', grid.dataset.dayKey, e.offsetY);
        }

        // Edit Event
        const bubble = closest('.event-bubble');
        if (bubble && grid) { // Ensure we have the grid for dayKey
             handleProfileTimetableAction('edit', grid.dataset.dayKey, bubble.dataset.start);
        }
        
        // Set All Buttons
        const setAllBtn = closest('.set-all-times-btn');
        if (setAllBtn) {
             handleProfileTimetableAction('setAll', setAllBtn.dataset.type);
        }
    }

    // Timetable Page Specific
    const mainTimetable = closest('.timetable-component');
    if (mainTimetable) {
        const dayNavBtn = closest('.day-nav-btn');
        if (dayNavBtn) {
            const dir = parseInt(dayNavBtn.dataset.direction);
            appState.currentTimetableDay = (appState.currentTimetableDay + dir + 7) % 7;
            
            if (closest('#profile-timetable-wrapper')) {
                updateProfileTimetable();
            } else if (closest('#teacher-signup-timetable-container')) {
                renderTeacherSignupTimetable();
            } else if (!closest('#wizard-timetable-container')) {
                // If NOT in student wizard modal (which handles its own nav), then render main page
                renderPage();
            }
        }
    }
});

// Listener for Parent's Student Selector Dropdown
// Listener for Teacher's Role dropdown to toggle "Next" button logic
document.getElementById('page-content').addEventListener('change', (e) => {
    if (e.target.id === 'student-selector') {
        appState.currentStudent = appState.students.find(s => s.id === e.target.value) || null;
        renderPage(); 
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
    // Teacher Student Selector
    if (e.target.id === 'teacher-student-selector') {
        const studentId = e.target.value;
        const container = document.getElementById('teacher-student-profile-container');
        if (studentId) {
            renderStudentProfile(studentId, 'edit').then(html => {
                container.innerHTML = html;
            });
        } else {
            container.innerHTML = '<div class="text-center text-gray-500 py-8">Select a student above to view and edit their details.</div>';
        }
    }

    // Teacher Filters
    if (e.target.id === 'tuition-filter-type') handleTuitionFilterTypeChange(e.target.value);
    if (e.target.id === 'tuition-filter-entity') handleTuitionFilterEntityChange(e.target.value);
    if (e.target.id === 'payment-filter-type') handlePaymentFilterTypeChange(e.target.value);
    if (e.target.id === 'payment-filter-entity') handlePaymentFilterEntityChange(e.target.value);

    // Parent Logs Filters
    if (e.target.id === 'parent-logs-filter-type') handleParentLogFilterTypeChange(e.target.value);
    if (e.target.id === 'parent-logs-filter-entity') handleParentLogFilterEntityChange(e.target.value);

    // NEW: Timetable Student Selector (Renamed ID)
    if (e.target.id === 'timetable-student-selector') {
        appState.currentStudent = appState.students.find(s => s.id === e.target.value) || null;
        renderPage(); 
    }

    // Teacher Timetable Selector
    if (e.target.id === 'teacher-timetable-selector') {
        appState.teacherTimetableTarget = e.target.value || null; // Store ID or null for 'My Schedule'
        // Re-render specifically the teacher timetables page to refresh data
        renderPage();
    }
});

// --- MOBILE BACK BUTTON ---
App.addListener('backButton', ({ canGoBack }) => {
    if (document.getElementById('modal-backdrop')) {
        closeModal();
    } else if (appState.isSidebarOpen && window.innerWidth < 768) {
        toggleSidebar();
    } else {
        App.exitApp();
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

        if (Capacitor.isNativePlatform()) {
            try {
                const result = await PushNotifications.requestPermissions();
                if (result.receive === 'granted') {
                    await PushNotifications.register();
                }
                
                PushNotifications.addListener('registration', (token) => {
                    console.log('Push Registration Token:', token.value);
                    // TODO: Send token to backend
                });

                PushNotifications.addListener('pushNotificationReceived', (notification) => {
                     showStatusMessage('info', notification.title || 'New Notification');
                });
            } catch (e) {
                console.warn('Push notification setup failed:', e);
            }
        }
    } catch (error) {
        console.error("Initialization Error:", error);
        hideStatusOverlay();
        displayGlobalError(error.message);
        document.getElementById('retry-connection-btn')?.addEventListener('click', initialize);
    }
}

// Start the application
initialize();
