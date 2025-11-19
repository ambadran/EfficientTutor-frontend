import { appState } from '../config.js';
import { fetchNotes, fetchFinancialSummary, fetchTuitionLogs, fetchTuitions, fetchTimetable } from '../api.js';
import { showModal, closeModal , showLoadingOverlay, hideStatusOverlay} from './modals.js';
import { renderPage } from './navigation.js';

// --- UPDATED: Sidebar Rendering ---
export function renderSidebar(role) {
    const navContainer = document.getElementById('sidebar-nav');
    if (!navContainer) return;

    let navLinks = '';
    if (role === 'parent') {
        navLinks = `
            <a href="#" id="nav-timetable" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-calendar-alt w-6 mr-3"></i> Timetable</a>
            <a href="#" id="nav-tuitions" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-chalkboard-teacher w-6 mr-3"></i> Tuitions</a>
            <a href="#" id="nav-notes" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-book-open w-6 mr-3"></i> Notes</a>
            <a href="#" id="nav-logs" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-history w-6 mr-3"></i> Logs</a>
            <a href="#" id="nav-student-info" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-user-graduate w-6 mr-3"></i> Student Info</a>
            <a href="#" id="nav-settings" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-cog w-6 mr-3"></i> Settings</a>
        `;
    } else if (role === 'student') {
        navLinks = `
            <a href="#" id="nav-timetable" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-calendar-alt w-6 mr-3"></i> Timetable</a>
            <a href="#" id="nav-tuitions" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-chalkboard-teacher w-6 mr-3"></i> Tuitions</a>
            <a href="#" id="nav-notes" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-book-open w-6 mr-3"></i> Notes</a>
            <a href="#" id="nav-settings" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-cog w-6 mr-3"></i> Settings</a>
        `;
    } else if (role === 'teacher') {
        navLinks = `
            <a href="#" id="nav-teacher-tuition-logs" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-file-invoice-dollar w-6 mr-3"></i> Tuition Logs</a>
            <a href="#" id="nav-teacher-payment-logs" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-money-check-alt w-6 mr-3"></i> Payment Logs</a>
            <a href="#" id="nav-teacher-notes" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-book-open w-6 mr-3"></i> Notes</a>
            <a href="#" id="nav-tuitions" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-chalkboard-teacher w-6 mr-3"></i> Tuitions</a>
            <a href="#" id="nav-teacher-student-info" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-users w-6 mr-3"></i> Student Info</a>
        `;
    }

    navContainer.innerHTML = navLinks;
    if (role) {
        navContainer.classList.remove('hidden');
    } else {
        navContainer.classList.add('hidden');
    }
}

export function renderLoginPage() {
    return `
        <div class="max-w-md mx-auto mt-10 bg-gray-800 p-8 rounded-xl shadow-lg">
            <img src="assets/EfficientTutor_logo.png" alt="EfficientTutor Logo" class="mx-auto h-16 w-auto mb-4">
            <h3 id="auth-title" class="text-2xl font-bold text-center mb-6">Welcome - Log In</h3>
            <form id="auth-form" class="space-y-4">
                
                <div id="first-name-group" class="hidden">
                    <label for="firstName" class="block text-sm font-medium text-gray-400">First Name</label>
                    <input type="text" id="firstName" placeholder="First Name" class="w-full mt-1 p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                </div>

                <div id="last-name-group" class="hidden">
                    <label for="lastName" class="block text-sm font-medium text-gray-400">Last Name</label>
                    <input type="text" id="lastName" placeholder="Last Name" class="w-full mt-1 p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                </div>

                <div id="role-group" class="hidden">
                    <label for="role" class="block text-sm font-medium text-gray-400">I am a...</label>
                    <select id="role" class="w-full mt-1 p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="parent" selected>Parent</option>
                        <option value="teacher">Teacher</option>
                    </select>
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-400">Email</label>
                    <input type="email" id="email" placeholder="Email" required class="w-full mt-1 p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                </div>
                <div>
                     <label for="password" class="block text-sm font-medium text-gray-400">Password</label>
                    <input type="password" id="password" placeholder="Password" required class="w-full mt-1 p-3 bg-gray-700 rounded-md border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                </div>
                
                <div id="auth-feedback" class="text-center min-h-[1.5rem]"></div>

                <div class="flex flex-col space-y-3 pt-2">
                    <button type="submit" id="auth-action-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition duration-300">Login</button>
                    <button type="button" id="auth-toggle-btn" class="w-full text-indigo-400 hover:text-indigo-300 text-sm">Need an account? Sign Up</button>
                </div>
            </form>
        </div>`;
}

// ... rest of the file is unchanged
export function confirmDeleteStudent(student, onDeleteCallback) {
    const footer = `
        <div class="flex justify-end space-x-4">
            <button id="modal-cancel-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button>
            <button id="modal-confirm-delete-btn" class="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-md">Delete</button>
        </div>`;
    // Reads from student.firstName
    showModal('Confirm Deletion', `<p>Are you sure you want to delete ${student.firstName}?</p>`, footer, (modal) => {
        modal.addEventListener('click', (e) => {
            if (e.target.closest('#modal-confirm-delete-btn')) {
                onDeleteCallback(student.id);
                closeModal();
            }
            if (e.target.closest('#modal-cancel-btn')) {
                closeModal();
            }
        });
    });
}

export function renderStudentInfoPage() {
    let studentListHTML = appState.students.map(student => `
        <div class="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
            <div>
                <p class="font-semibold text-lg">${student.firstName} ${student.lastName}</p>
                <p class="text-sm text-gray-400">Grade: ${student.grade}</p>
            </div>
            <div class="space-x-2">
                <button title="View Credentials" class="view-creds-btn p-2 bg-blue-600 hover:bg-blue-500 rounded-md" data-id="${student.id}"><i class="fas fa-key"></i></button>
                <button title="Edit Student" class="edit-student-btn p-2 bg-gray-600 hover:bg-gray-500 rounded-md" data-id="${student.id}"><i class="fas fa-edit"></i></button>
                <button title="Delete Student" class="delete-student-btn p-2 bg-red-600 hover:bg-red-500 rounded-md" data-id="${student.id}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
    
    if (appState.students.length === 0) {
        studentListHTML = `<p class="text-center text-gray-400 py-8">No students registered yet. Add one to get started!</p>`;
    }

    return `
        <div class="space-y-4">${studentListHTML}</div>
        <button id="add-new-student-btn" class="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 flex items-center justify-center">
            <i class="fas fa-plus mr-2"></i> Add New Student
        </button>`;
}

export async function renderLogsPage() {
    if (!appState.currentUser) {
        return `<div class="text-center p-8 text-gray-400">You must be logged in to view logs.</div>`;
    }
    
    try {
        const [summary, detailed_logs] = await Promise.all([
            fetchFinancialSummary(),
            fetchTuitionLogs()
        ]);

        // Helper function to format just the time part, moved outside the loop for efficiency
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            return new Date(timeStr).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        };

        const logsHTML = detailed_logs.map(log => {
            const attendees = log.attendee_names || [];
            return `
                <div class="bg-gray-800 p-4 rounded-lg grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
                    <div>
                        <p class="font-semibold">${log.subject}</p>
                        <p class="text-sm text-indigo-300">${attendees.join(', ')}</p>
                    </div>
                    <div class="text-sm text-gray-400 text-center">
                        <p>${new Date(log.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p class="text-xs">${formatTime(log.start_time)} - ${formatTime(log.end_time)}</p>
                    </div>
                    <div class="text-center">${log.duration}</div>
                    <div class="text-center font-semibold">${log.cost} kwd</div>
                    <div class="text-center">
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${log.paid_status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                            ${log.paid_status}
                        </span>
                    </div>
                </div>`;
        }).join('');

        return `
            <div class="space-y-6">
                <div>
                    <h3 class="text-xl font-semibold mb-4">Summary</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-red-500">${summary.unpaid_count}</p><p class="text-gray-400">Lessons Unpaid</p></div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-green-400">${summary.credit_balance} kwd</p><p class="text-gray-400">Credit Balance</p></div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-yellow-400">${summary.total_due} kwd</p><p class="text-gray-400">Total Amount Due</p></div>
                    </div>
                </div>
                <div>
                    <h3 class="text-xl font-semibold mb-4">Detailed Logs</h3>
                    <div class="space-y-2">${logsHTML}</div>
                </div>
            </div>`;
    } catch (error) {
        console.error("Error fetching logs:", error);
        return `<div class="text-center text-red-400 p-8">Error loading logs: ${error.message}</div>`;
    }
}

export function renderSettingsPage() {
    const isDark = document.documentElement.classList.contains('dark');
    return `
        <div class="max-w-2xl mx-auto space-y-6">
            <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-4">Appearance</h3>
                <div class="flex items-center justify-between">
                    <span>Theme</span>
                    <button id="theme-toggle-btn" class="px-4 py-2 rounded-md font-semibold ${isDark ? 'bg-gray-700' : 'bg-gray-300 text-gray-800'}">
                        ${isDark ? '<i class="fas fa-moon mr-2"></i>Dark' : '<i class="fas fa-sun mr-2"></i>Light'}
                    </button>
                </div>
            </div>
            <div class="bg-gray-800 p-6 rounded-lg">
                <h3 class="text-lg font-semibold mb-4">About</h3>
                <p class="text-gray-400">EfficientTutor v1.0.0</p>
            </div>
        </div>`;
}

// --- NEW: Student Page Templates ---

export async function renderNotesPage() {
    try {
        const notes = await fetchNotes();
        if (notes.length === 0) {
            return `<div class="text-center p-8 text-gray-400">No notes have been added for you yet.</div>`;
        }

        const notesHTML = notes.map(note => `
            <div class="bg-gray-800 p-4 rounded-lg">
                <h3 class="font-semibold text-lg text-indigo-300">${note.name}</h3>
                <p class="text-gray-400 my-2">${note.description}</p>
                <a href="${note.url}" target="_blank" rel="noopener noreferrer" class="inline-block text-sm text-blue-400 hover:text-blue-300">
                    Open PDF <i class="fas fa-external-link-alt ml-1"></i>
                </a>
            </div>
        `).join('');

        return `<div class="space-y-4">${notesHTML}</div>`;
    } catch (error) {
        return `<div class="text-center text-red-400 p-8">Error loading notes: ${error.message}</div>`;
    }
}

// --- NEW: Unified Tuitions Page ---

function renderTuitionCard(item, role) {
    const { tuition, start_time, end_time } = item;
    if (!tuition) return ''; // Safety check

    // --- Schedule ---
    let scheduleHTML = '';
    if (start_time) {
        const scheduleDate = new Date(start_time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        const scheduleTime = `${new Date(start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${new Date(end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        scheduleHTML = `
            <p class="text-lg font-semibold capitalize">${scheduleDate}</p>
            <p class="text-sm text-gray-400">${scheduleTime}</p>
        `;
    } else {
        scheduleHTML = `<p class="text-lg font-semibold text-yellow-400">Unscheduled</p>`;
    }

    // --- Attendees ---
    let attendeesHTML = '';
    if (role === 'teacher') {
        const studentNames = (tuition.charges || []).map(c => `${c.student.first_name} ${c.student.last_name}`);
        attendeesHTML = `<p class="text-sm text-gray-400">${studentNames.join(', ')}</p>`;
    } else {
        attendeesHTML = `<p class="text-sm text-gray-400">${(tuition.attendee_names || []).join(', ')}</p>`;
    }

    // --- Financials & Actions (Role-specific) ---
    let financialsHTML = '';
    let actionsHTML = '';
    const hasLink = tuition.meeting_link && tuition.meeting_link.meeting_link;

    if (role === 'teacher') {
        const chargesHTML = (tuition.charges || []).map(charge => `
            <li class="flex justify-between items-center text-sm">
                <span>${charge.student.first_name} ${charge.student.last_name}</span>
                <span class="font-semibold">${charge.cost} kwd</span>
            </li>
        `).join('');
        financialsHTML = `
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2">Charges</h4>
                <ul class="space-y-1">${chargesHTML || '<li class="text-sm text-gray-500">No charges set.</li>'}</ul>
            </div>
        `;
        actionsHTML = `
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2">Meeting Link</h4>
                ${hasLink
                    ? `<button class="view-meeting-link-btn w-full p-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-md" data-tuition-id="${tuition.id}"><i class="fas fa-external-link-alt mr-2"></i>View Link</button>`
                    : `<p class="text-gray-500 text-sm">No meeting link assigned.</p>`
                }
                <div class="flex items-center space-x-2 mt-3">
                     <button title="Set Link" class="edit-meeting-link-btn w-full p-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md" data-tuition-id="${tuition.id}"><i class="fas fa-edit"></i> ${hasLink ? 'Edit' : 'Set'} Link</button>
                </div>
            </div>
        `;
    } else if (role === 'parent') {
        financialsHTML = `
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2">Your Charge</h4>
                <p class="text-2xl font-bold text-indigo-300">${tuition.charge} kwd</p>
            </div>
        `;
        if (hasLink) {
            actionsHTML = `
                <div class="self-center">
                    <button class="view-meeting-link-btn w-full p-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-md" data-tuition-id="${tuition.id}"><i class="fas fa-external-link-alt mr-2"></i>View Link</button>
                </div>
            `;
        }
    } else { // Student
        financialsHTML = `<div></div>`; // Keep middle column empty
        if (hasLink) {
            actionsHTML = `
                <div class="flex flex-col space-y-2">
                    <button class="view-meeting-link-btn w-full p-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-md" data-tuition-id="${tuition.id}"><i class="fas fa-external-link-alt mr-2"></i>View Details</button>
                    <a href="${tuition.meeting_link.meeting_link}" target="_blank" rel="noopener noreferrer" class="w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Join Meeting</a>
                </div>
            `;
        }
    }

    return `
        <div class="bg-gray-800 p-4 rounded-lg shadow-md">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-semibold text-xl text-indigo-300">${tuition.subject}</h3>
                    ${attendeesHTML}
                </div>
                <div class="text-right flex-shrink-0 ml-4">
                    ${scheduleHTML}
                </div>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <h4 class="text-sm font-semibold text-gray-400 mb-2">Details</h4>
                    <div class="text-sm space-y-1">
                        <p class="flex justify-between"><span>Duration:</span> <span class="font-semibold">${tuition.min_duration_minutes || 'N/A'} mins</span></p>
                        <p class="flex justify-between"><span>Lesson Index:</span> <span class="font-semibold">${tuition.lesson_index || 'N/A'}</span></p>
                    </div>
                </div>
                ${financialsHTML}
                ${actionsHTML}
            </div>
        </div>
    `;
}

export async function renderTuitionsPage() {
    try {
        showLoadingOverlay('Loading tuitions...');
        const [scheduledTuitions, allTuitions] = await Promise.all([fetchTimetable(), fetchTuitions()]);
        
        // --- Merge Logic ---
        const unifiedTuitions = [];
        const scheduledTuitionIds = new Set();

        // Add scheduled tuitions first
        if (Array.isArray(scheduledTuitions)) {
            scheduledTuitions.forEach(item => {
                if (item.tuition) {
                    unifiedTuitions.push(item);
                    scheduledTuitionIds.add(item.tuition.id);
                }
            });
        }


        // Add unscheduled tuitions
        if (Array.isArray(allTuitions)) {
            allTuitions.forEach(tuition => {
                if (!scheduledTuitionIds.has(tuition.id)) {
                    unifiedTuitions.push({
                        start_time: null,
                        end_time: null,
                        tuition: tuition
                    });
                }
            });
        }
        
        // Store for potential later use (e.g., modals)
        appState.teacherScheduledTuitions = unifiedTuitions; 
        hideStatusOverlay();

        if (unifiedTuitions.length === 0) {
            return `<div class="text-center p-8 text-gray-400">No tuitions found.</div>`;
        }

        const userRole = appState.currentUser.role;
        const tuitionCardsHTML = unifiedTuitions.map(item => renderTuitionCard(item, userRole)).join('');

        return `<div class="space-y-6">${tuitionCardsHTML}</div>`;
    } catch (error) {
        console.error("Error rendering tuitions page:", error);
        hideStatusOverlay();
        return `<div class="text-center text-red-400 p-8">Error loading tuitions: ${error.message}</div>`;
    }
}

// --- Teacher Page Placeholders ---

export function renderTeacherPaymentLogsPage() {
    return `<div class="p-8 text-center text-gray-400">The Payment Logs feature will be implemented here.</div>`;
}
export async function renderTeacherNotesPage() {
    try {
        const notes = await fetchNotes();
        if (notes.length === 0) {
            return `<div class="text-center p-8 text-gray-400">No notes found.</div>`;
        }

        const notesHTML = notes.map(note => `
            <div class="bg-gray-800 p-4 rounded-lg">
                <h3 class="font-semibold text-lg text-indigo-300">${note.name}</h3>
                <p class="text-gray-400 my-2">${note.description}</p>
                <a href="${note.url}" target="_blank" rel="noopener noreferrer" class="inline-block text-sm text-blue-400 hover:text-blue-300">
                    Open PDF <i class="fas fa-external-link-alt ml-1"></i>
                </a>
            </div>
        `).join('');

        return `<div class="space-y-4">${notesHTML}</div>`;
    } catch (error) {
        return `<div class="text-center text-red-400 p-8">Error loading notes: ${error.message}</div>`;
    }
}

export function renderTeacherTimetablesPage() {
    return `<div class="p-8 text-center text-gray-400">The Timetables feature for teachers is not yet implemented.</div>`;
}
export async function renderTeacherStudentInfoPage() {
    try {
        const students = await fetchStudents();
        let studentListHTML = students.map(student => `
            <div class="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <p class="font-semibold text-lg">${student.first_name} ${student.last_name}</p>
                    <p class="text-sm text-gray-400">Grade: ${student.grade}</p>
                </div>
            </div>`).join('');

        if (students.length === 0) {
            studentListHTML = `<p class="text-center text-gray-400 py-8">No students found.</p>`;
        }

        return `<div class="space-y-4">${studentListHTML}</div>`;
    } catch (error) {
        console.error("Error rendering teacher student info page:", error);
        return `<div class="text-center text-red-400 p-8">Error loading student information: ${error.message}</div>`;
    }
}
