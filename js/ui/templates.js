import { appState, config } from '../config.js';
import { fetchNotes, fetchFinancialSummary, fetchTuitionLogs, fetchTuitions, fetchTimetable, fetchTeacher } from '../api.js';
import { showModal, closeModal , showLoadingOverlay, hideStatusOverlay} from './modals.js';
import { renderPage } from './navigation.js';
import { showPingModal } from './pings.js';
import logoUrl from '../../assets/EfficientTutor_logo.png';

// --- Helper: Render Parent Log - Mobile Card ---
function renderMobileLogCard(log) {
    const attendees = log.attendee_names || [];
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        return new Date(timeStr).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };
    const currency = appState.currentUser?.currency || 'kwd';

    return `
        <div class="bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col gap-3 border border-gray-700">
            <div>
                <p class="font-semibold text-white text-lg">${log.subject}</p>
                <p class="text-sm text-indigo-300">${attendees.join(', ')}</p>
            </div>
            
            <div class="flex items-center text-sm text-gray-300">
                <i class="fas fa-chalkboard-teacher mr-2 text-gray-500"></i>
                <span>${log.teacher_name || 'N/A'}</span>
            </div>

            <div class="text-sm text-gray-400">
                <p>${new Date(log.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <p class="text-xs text-gray-500">${formatTime(log.start_time)} - ${formatTime(log.end_time)}</p>
            </div>

            <div class="grid grid-cols-3 gap-2 border-t border-gray-700 pt-3 mt-1">
                <div class="text-center">
                    <span class="text-xs text-gray-500 block mb-1">Duration</span>
                    <span class="text-gray-300 text-sm">${log.duration}</span>
                </div>
                <div class="text-center">
                    <span class="text-xs text-gray-500 block mb-1">Cost</span>
                    <span class="font-semibold text-indigo-200">${log.cost} ${currency}</span>
                </div>
                <div class="text-center">
                    <span class="text-xs text-gray-500 block mb-1">Status</span>
                    <span class="px-2 py-1 rounded-full text-xs font-bold uppercase ${log.paid_status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                        ${log.paid_status}
                    </span>
                </div>
            </div>
        </div>`;
}

// --- Helper: Render Parent Log - Desktop Table Row ---
function renderDesktopLogRow(log) {
    const attendees = log.attendee_names || [];
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        return new Date(timeStr).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };
    const currency = appState.currentUser?.currency || 'kwd';

    return `
        <tr class="hover:bg-gray-750 transition-colors">
            <td class="p-4">
                <p class="font-semibold text-white">${log.subject}</p>
                <p class="text-xs text-indigo-300">${attendees.join(', ')}</p>
            </td>
            <td class="p-4 text-sm text-gray-300">
                ${log.teacher_name || 'N/A'}
            </td>
            <td class="p-4 text-sm text-gray-400">
                <p>${new Date(log.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                <p class="text-xs text-gray-500">${formatTime(log.start_time)} - ${formatTime(log.end_time)}</p>
            </td>
            <td class="p-4 text-sm text-gray-300 text-center">
                ${log.duration}
            </td>
            <td class="p-4 text-sm font-semibold text-indigo-200 text-right">
                ${log.cost} ${currency}
            </td>
            <td class="p-4 text-right">
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${log.paid_status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">
                    ${log.paid_status}
                </span>
            </td>
        </tr>`;
}

// --- UPDATED: Sidebar Rendering ---
export function renderSidebar(role) {
    const navContainer = document.getElementById('sidebar-nav');
    if (!navContainer) return;

    let navLinks = '';
    if (role === 'parent') {
        navLinks = `
            <a href="#" id="nav-dashboard" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-home w-6 mr-3"></i> Home</a>
            <a href="#" id="nav-timetable" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-calendar-alt w-6 mr-3"></i> Timetable</a>
            <a href="#" id="nav-tuitions" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-chalkboard-teacher w-6 mr-3"></i> Tuitions</a>
            <a href="#" id="nav-notes" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-book-open w-6 mr-3"></i> Notes</a>
            <a href="#" id="nav-logs" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-history w-6 mr-3"></i> Logs</a>
            <a href="#" id="nav-student-info" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-user-graduate w-6 mr-3"></i> Student Info</a>
            <a href="#" id="nav-profile" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-user-circle w-6 mr-3"></i> Profile</a>
            <a href="#" id="nav-settings" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-cog w-6 mr-3"></i> Settings</a>
        `;
    } else if (role === 'student') {
        navLinks = `
            <a href="#" id="nav-dashboard" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-home w-6 mr-3"></i> Home</a>
            <a href="#" id="nav-timetable" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-calendar-alt w-6 mr-3"></i> Timetable</a>
            <a href="#" id="nav-tuitions" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-chalkboard-teacher w-6 mr-3"></i> Tuitions</a>
            <a href="#" id="nav-notes" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-book-open w-6 mr-3"></i> Notes</a>
            <a href="#" id="nav-profile" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-user-circle w-6 mr-3"></i> Profile</a>
            <a href="#" id="nav-settings" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-cog w-6 mr-3"></i> Settings</a>
        `;
    } else if (role === 'teacher') {
        navLinks = `
            <a href="#" id="nav-dashboard" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-home w-6 mr-3"></i> Home</a>
            <a href="#" id="nav-teacher-tuition-logs" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-file-invoice-dollar w-6 mr-3"></i> Tuition Logs</a>
            <a href="#" id="nav-teacher-payment-logs" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-money-check-alt w-6 mr-3"></i> Payment Logs</a>
            <a href="#" id="nav-teacher-timetables" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-calendar-alt w-6 mr-3"></i> Timetable</a>
            <a href="#" id="nav-teacher-notes" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-book-open w-6 mr-3"></i> Notes</a>
            <a href="#" id="nav-tuitions" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-chalkboard-teacher w-6 mr-3"></i> Tuitions</a>
            <a href="#" id="nav-teacher-student-info" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-users w-6 mr-3"></i> Student Info</a>
            <a href="#" id="nav-profile" class="nav-link flex items-center p-2 rounded-lg hover:bg-gray-700"><i class="fas fa-user-circle w-6 mr-3"></i> Profile</a>
        `;
    }

    navContainer.innerHTML = navLinks;
    if (role) {
        navContainer.classList.remove('hidden');
    } else {
        navContainer.classList.add('hidden');
    }
}

// --- NEW: Bottom Navigation Rendering ---
export function renderBottomNav(role) {
    const bottomNav = document.getElementById('bottom-nav');
    const container = document.getElementById('bottom-nav-items');
    
    if (!role) {
        bottomNav.classList.remove('translate-y-0');
        bottomNav.classList.add('translate-y-full', 'hidden');
        return;
    }

    let items = [];

    // Common Item: Home
    items.push({ id: 'nav-dashboard', icon: 'fa-home', label: 'Home' });

    if (role === 'teacher') {
        items.push(
            { id: 'nav-teacher-tuition-logs', icon: 'fa-file-invoice-dollar', label: 'Logs' },
            { id: 'nav-teacher-timetables', icon: 'fa-calendar-alt', label: 'Timetable' }
        );
    } else if (role === 'parent') {
        items.push(
            { id: 'nav-timetable', icon: 'fa-calendar-alt', label: 'Timetable' },
            { id: 'nav-logs', icon: 'fa-history', label: 'Logs' }
        );
    } else if (role === 'student') {
        items.push(
            { id: 'nav-timetable', icon: 'fa-calendar-alt', label: 'Timetable' },
            { id: 'nav-notes', icon: 'fa-book-open', label: 'Notes' }
        );
    }

    // Common Item: More (opens Sidebar)
    items.push({ id: 'nav-more-toggle', icon: 'fa-bars', label: 'More' });

    const html = items.map(item => `
        <button id="${item.id}" class="nav-link flex flex-col items-center justify-center w-full h-full text-gray-400 hover:text-indigo-400 active:text-indigo-500 transition-colors">
            <i class="fas ${item.icon} text-lg mb-1"></i>
            <span class="text-[10px] font-medium">${item.label}</span>
        </button>
    `).join('');

    container.innerHTML = html;
    
    // Show the nav bar
    bottomNav.classList.remove('hidden');
    // Small delay to allow transition
    setTimeout(() => {
        bottomNav.classList.remove('translate-y-full');
        bottomNav.classList.add('translate-y-0');
    }, 50);
}

export function renderLoginPage() {
    return `
        <div class="max-w-md mx-auto mt-10 bg-gray-800 p-8 rounded-xl shadow-lg">
            <img src="${logoUrl}" alt="EfficientTutor Logo" class="mx-auto h-16 w-auto mb-4">
            <h3 id="auth-title" class="text-2xl font-bold text-center mb-6">Welcome - Log In</h3>
            
            <form id="auth-form" class="space-y-4">
                
                <!-- STEP 1: Credentials -->
                <div id="step-1-container">
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
                </div>

                <!-- STEP 2: Teacher Specialties (Hidden by default) -->
                <div id="step-2-container" class="hidden space-y-4">
                    <h4 class="text-lg font-semibold text-indigo-400 border-b border-gray-700 pb-2">Add Your Specialties</h4>
                    <p class="text-sm text-gray-400">Select subjects and the grade range you teach.</p>
                    
                    <div class="bg-gray-700 p-3 rounded-md space-y-3">
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="text-xs text-gray-400">Subject</label>
                                <select id="specialty-subject" class="w-full p-2 bg-gray-800 rounded border border-gray-600 text-sm"></select>
                            </div>
                            <div>
                                <label class="text-xs text-gray-400">System</label>
                                <select id="specialty-system" class="w-full p-2 bg-gray-800 rounded border border-gray-600 text-sm"></select>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <div class="flex-grow">
                                <label class="text-xs text-gray-400">Grades (1-12)</label>
                                <div class="flex items-center space-x-2">
                                    <input type="number" id="specialty-grade-from" min="1" max="12" placeholder="From" class="w-full p-2 bg-gray-800 rounded border border-gray-600 text-sm">
                                    <span class="text-gray-400">-</span>
                                    <input type="number" id="specialty-grade-to" min="1" max="12" placeholder="To" class="w-full p-2 bg-gray-800 rounded border border-gray-600 text-sm">
                                </div>
                            </div>
                            <button type="button" id="add-specialty-btn" class="mt-4 bg-green-600 hover:bg-green-500 text-white p-2 rounded-md"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>

                    <!-- List of Added Specialties -->
                    <div id="specialties-list" class="space-y-2 max-h-48 overflow-y-auto">
                        <!-- Dynamic items will go here -->
                        <p class="text-center text-gray-500 text-sm py-2">No specialties added yet.</p>
                    </div>
                </div>

                <!-- STEP 3: Teacher Availability (Hidden by default) -->
                <div id="step-3-container" class="hidden space-y-4">
                    <h4 class="text-lg font-semibold text-indigo-400 border-b border-gray-700 pb-2">Set Availability</h4>
                    <p class="text-sm text-gray-400">Click on the timeline to add your work hours or other activities.</p>
                    <div id="teacher-signup-timetable-container">
                        <!-- Timetable will be rendered here via main.js -->
                    </div>
                </div>
                
                <div id="auth-feedback" class="text-center min-h-[1.5rem]"></div>

                <div class="flex flex-col space-y-3 pt-2">
                    <button type="submit" id="auth-action-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-md transition duration-300">Login</button>
                    
                    <button type="button" id="auth-back-btn" class="hidden w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-md transition duration-300">Back</button>
                    
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

import { renderStudentProfile } from './profile.js';

// ... existing imports ...

export function renderStudentInfoPage() {
    if (appState.students.length === 0) {
        return `
            <div class="text-center py-12">
                <i class="fas fa-user-graduate text-6xl text-gray-600 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-300">No Students Yet</h3>
                <p class="text-gray-500 mb-6">Add your children to start managing their schedule.</p>
                <button id="btn-create-student" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-md transition duration-300">
                    <i class="fas fa-plus mr-2"></i> Add New Student
                </button>
            </div>`;
    }

    const studentCards = appState.students.map(s => `
        <div class="bg-gray-800 p-6 rounded-lg shadow-lg hover:bg-gray-750 transition duration-300 border border-gray-700 flex flex-col">
            <div class="flex justify-between items-start mb-4">
                <div class="bg-indigo-900/50 p-3 rounded-full">
                    <i class="fas fa-user-graduate text-2xl text-indigo-400"></i>
                </div>
                <span class="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300 border border-gray-600">${s.status || 'Active'}</span>
            </div>
            <h3 class="text-xl font-bold text-white mb-1">${s.first_name} ${s.last_name}</h3>
            <p class="text-gray-400 text-sm mb-4">Grade ${s.grade}</p>
            
            <div class="mt-auto pt-4 border-t border-gray-700 flex justify-between items-center">
                <span class="text-xs text-gray-500">${(s.student_subjects || []).length} Subjects</span>
                <button class="btn-view-student text-indigo-400 hover:text-indigo-300 text-sm font-semibold" data-id="${s.id}">
                    Manage <i class="fas fa-arrow-right ml-1"></i>
                </button>
            </div>
        </div>
    `).join('');

    return `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold">My Students</h2>
                <button id="btn-create-student" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-2 px-4 rounded-md">
                    <i class="fas fa-plus mr-2"></i> Add New
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${studentCards}
            </div>
        </div>`;
}


// --- Parent Logs Filtering State ---
let currentParentLogFilter = { type: 'all', entityId: null };
let cachedParentTeachers = [];
let cachedParentStudents = [];

// Helper to extract unique teachers from the parent's students
async function fetchParentTeachers() {
    const teacherIds = new Set();
    (appState.students || []).forEach(s => {
        (s.student_subjects || []).forEach(sub => {
            if(sub.teacher_id) teacherIds.add(sub.teacher_id);
        });
    });
    
    if (teacherIds.size === 0) return [];

    // Fetch details for each unique teacher
    // Optimization: We could cache this or assume names are available elsewhere, 
    // but for now we fetch to ensure we have names.
    const promises = Array.from(teacherIds).map(id => fetchTeacher(id).catch(() => null));
    const teachers = await Promise.all(promises);
    return teachers.filter(t => t !== null);
}

export async function renderLogsPage() {
    if (!appState.currentUser) {
        return `<div class="text-center p-8 text-gray-400">You must be logged in to view logs.</div>`;
    }
    
    try {
        // Prepare filters based on state
        const filters = {};
        if (currentParentLogFilter.type === 'student' && currentParentLogFilter.entityId) {
            filters.student_id = currentParentLogFilter.entityId;
        } else if (currentParentLogFilter.type === 'teacher' && currentParentLogFilter.entityId) {
            filters.teacher_id = currentParentLogFilter.entityId;
        }

        // Fetch data with filters
        // Also fetch filter options if not already cached (or refresh them)
        const [summary, detailed_logs, teachers] = await Promise.all([
            fetchFinancialSummary(filters),
            fetchTuitionLogs(filters),
            fetchParentTeachers()
        ]);

        cachedParentTeachers = teachers;
        cachedParentStudents = appState.students || []; // Already loaded on login

        // --- Helper Formatter ---
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            return new Date(timeStr).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        };
        const currency = appState.currentUser?.currency || 'kwd';

        // --- Render Filter Dropdowns ---
        const studentOptions = cachedParentStudents.map(s => `<option value="${s.id}" ${currentParentLogFilter.type === 'student' && currentParentLogFilter.entityId === s.id ? 'selected' : ''}>${s.first_name} ${s.last_name}</option>`).join('');
        const teacherOptions = cachedParentTeachers.map(t => `<option value="${t.id}" ${currentParentLogFilter.type === 'teacher' && currentParentLogFilter.entityId === t.id ? 'selected' : ''}>${t.first_name} ${t.last_name}</option>`).join('');

        let entityOptionsHTML = '<option value="">-- Select --</option>';
        if (currentParentLogFilter.type === 'student') entityOptionsHTML += studentOptions;
        else if (currentParentLogFilter.type === 'teacher') entityOptionsHTML += teacherOptions;

        const filterBarHTML = `
            <div class="bg-gray-800 p-4 rounded-lg flex flex-col md:flex-row gap-4 items-end md:items-center border border-gray-700 mb-6">
                <div class="w-full md:w-auto">
                    <label class="text-xs text-gray-400 block mb-1 uppercase font-semibold">Filter By</label>
                    <select id="parent-logs-filter-type" class="p-2 bg-gray-700 rounded border border-gray-600 w-full md:w-40 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        <option value="all" ${currentParentLogFilter.type === 'all' ? 'selected' : ''}>View All</option>
                        <option value="student" ${currentParentLogFilter.type === 'student' ? 'selected' : ''}>Student</option>
                        <option value="teacher" ${currentParentLogFilter.type === 'teacher' ? 'selected' : ''}>Teacher</option>
                    </select>
                </div>
                
                <div id="parent-logs-filter-entity-container" class="w-full md:w-auto flex-grow ${currentParentLogFilter.type === 'all' ? 'hidden' : ''}">
                    <label class="text-xs text-gray-400 block mb-1 uppercase font-semibold">Select Entity</label>
                    <select id="parent-logs-filter-entity" class="p-2 bg-gray-700 rounded border border-gray-600 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                        ${entityOptionsHTML}
                    </select>
                </div>
            </div>
        `;

        // --- Render Logs: Responsive Views ---
        
        // 1. Mobile View (Cards)
        const mobileRowsHTML = detailed_logs.map(log => renderMobileLogCard(log)).join('');
        const mobileViewHTML = `
            <div class="md:hidden space-y-4">
                ${mobileRowsHTML || '<p class="text-center text-gray-500 py-4">No logs found.</p>'}
            </div>
        `;

        // 2. Desktop View (Table)
        const desktopRowsHTML = detailed_logs.map(log => renderDesktopLogRow(log)).join('');
        const desktopViewHTML = `
            <div class="hidden md:block overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
                <table class="w-full text-left min-w-[800px]">
                    <thead class="bg-gray-900/50 text-gray-400 uppercase text-xs">
                        <tr>
                            <th class="p-4">Subject</th>
                            <th class="p-4">Teacher</th>
                            <th class="p-4">Date</th>
                            <th class="p-4 text-center">Duration</th>
                            <th class="p-4 text-right">Cost</th>
                            <th class="p-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${desktopRowsHTML || '<tr><td colspan="6" class="p-4 text-center text-gray-500">No logs found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold">Logs</h2>
                </div>

                ${filterBarHTML}

                <div id="parent-logs-content">
                    <h3 class="text-xl font-semibold mb-4">Summary</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-red-500">${summary.unpaid_count}</p><p class="text-gray-400">Lessons Unpaid</p></div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-green-400">${summary.credit_balance} ${currency}</p><p class="text-gray-400">Credit Balance</p></div>
                        <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-yellow-400">${summary.total_due} ${currency}</p><p class="text-gray-400">Total Amount Due</p></div>
                    </div>

                    <h3 class="text-xl font-semibold mb-4">Detailed Logs</h3>
                    
                    ${mobileViewHTML}
                    ${desktopViewHTML}
                </div>
            </div>`;
    } catch (error) {
        console.error("Error fetching logs:", error);
        return `<div class="text-center text-red-400 p-8">Error loading logs: ${error.message}</div>`;
    }
}

// --- Parent Filter Handlers ---
export function handleParentLogFilterTypeChange(type) {
    const entityContainer = document.getElementById('parent-logs-filter-entity-container');
    const entitySelect = document.getElementById('parent-logs-filter-entity');
    
    currentParentLogFilter.type = type;
    currentParentLogFilter.entityId = null;

    if (type === 'all') {
        entityContainer.classList.add('hidden');
        updateParentLogsContent({});
    } else {
        entityContainer.classList.remove('hidden');
        entitySelect.innerHTML = '<option value="">-- Select --</option>';
        
        if (type === 'student') {
            cachedParentStudents.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = `${s.first_name} ${s.last_name}`;
                entitySelect.appendChild(opt);
            });
        } else if (type === 'teacher') {
            cachedParentTeachers.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = `${t.first_name} ${t.last_name}`;
                entitySelect.appendChild(opt);
            });
        }
    }
}

export function handleParentLogFilterEntityChange(entityId) {
    if (!entityId) return;
    
    currentParentLogFilter.entityId = entityId;
    const filters = {};
    if (currentParentLogFilter.type === 'student') filters.student_id = entityId;
    else if (currentParentLogFilter.type === 'teacher') filters.teacher_id = entityId;
    
    updateParentLogsContent(filters);
}

async function updateParentLogsContent(filters) {
    const container = document.getElementById('parent-logs-content');
    if(!container) return;
    
    container.innerHTML = '<div class="flex justify-center p-8"><div class="loader"></div></div>';

    try {
        const [summary, detailed_logs] = await Promise.all([
            fetchFinancialSummary(filters),
            fetchTuitionLogs(filters)
        ]);

        // 1. Mobile View (Cards)
        const mobileRowsHTML = detailed_logs.map(log => renderMobileLogCard(log)).join('');
        const mobileViewHTML = `
            <div class="md:hidden space-y-4">
                ${mobileRowsHTML || '<p class="text-center text-gray-500 py-4">No logs found.</p>'}
            </div>
        `;

        // 2. Desktop View (Table)
        const desktopRowsHTML = detailed_logs.map(log => renderDesktopLogRow(log)).join('');
        const desktopViewHTML = `
            <div class="hidden md:block overflow-x-auto bg-gray-800 rounded-lg border border-gray-700">
                <table class="w-full text-left min-w-[800px]">
                    <thead class="bg-gray-900/50 text-gray-400 uppercase text-xs">
                        <tr>
                            <th class="p-4">Subject</th>
                            <th class="p-4">Teacher</th>
                            <th class="p-4">Date</th>
                            <th class="p-4 text-center">Duration</th>
                            <th class="p-4 text-right">Cost</th>
                            <th class="p-4 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        ${desktopRowsHTML || '<tr><td colspan="6" class="p-4 text-center text-gray-500">No logs found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = `
            <h3 class="text-xl font-semibold mb-4">Summary</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-red-500">${summary.unpaid_count}</p><p class="text-gray-400">Lessons Unpaid</p></div>
                <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-green-400">${summary.credit_balance} ${appState.currentUser?.currency || 'kwd'}</p><p class="text-gray-400">Credit Balance</p></div>
                <div class="bg-gray-800 p-4 rounded-lg text-center"><p class="text-3xl font-bold text-yellow-400">${summary.total_due} ${appState.currentUser?.currency || 'kwd'}</p><p class="text-gray-400">Total Amount Due</p></div>
            </div>

            <h3 class="text-xl font-semibold mb-4">Detailed Logs</h3>
            ${mobileViewHTML}
            ${desktopViewHTML}
        `;

    } catch (error) {
        console.error("Error updating parent logs:", error);
        container.innerHTML = `<div class="text-center text-red-400 p-8">Error loading data: ${error.message}</div>`;
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
                <p class="text-gray-400">EfficientTutor ${config.version}</p>
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
    const currency = appState.currentUser?.currency || 'kwd';

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
                <span class="font-semibold">${charge.cost} ${currency}</span>
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
                     <button title="Set Link" class="edit-meeting-link-btn flex-grow p-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md" data-tuition-id="${tuition.id}"><i class="fas fa-edit"></i> Link</button>
                     <button title="Ping" class="ping-btn flex-grow p-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-md" data-tuition-id="${tuition.id}" data-start="${start_time || ''}" data-end="${end_time || ''}"><i class="fas fa-bell"></i> Ping</button>
                </div>
            </div>
        `;
    } else if (role === 'parent') {
        financialsHTML = `
            <div>
                <h4 class="text-sm font-semibold text-gray-400 mb-2">Your Charge</h4>
                <p class="text-2xl font-bold text-indigo-300">${tuition.charge} ${currency}</p>
            </div>
        `;
        actionsHTML = `
            <div class="self-center space-y-2">
                 ${hasLink ? `<button class="view-meeting-link-btn w-full p-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-md" data-tuition-id="${tuition.id}"><i class="fas fa-external-link-alt mr-2"></i>View Link</button>` : ''}
                 <button title="Ping" class="ping-btn w-full p-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-md" data-tuition-id="${tuition.id}" data-start="${start_time || ''}" data-end="${end_time || ''}"><i class="fas fa-bell mr-2"></i>Ping</button>
            </div>
        `;
    } else { // Student
        financialsHTML = `<div></div>`; // Keep middle column empty
        actionsHTML = `
            <div class="flex flex-col space-y-2">
                ${hasLink ? `<a href="${tuition.meeting_link.meeting_link}" target="_blank" rel="noopener noreferrer" class="w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-300">Join Meeting</a>` : ''}
                <div class="flex space-x-2">
                    <button class="view-meeting-link-btn flex-1 p-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-md" data-tuition-id="${tuition.id}"><i class="fas fa-info-circle"></i> Info</button>
                    <button class="ping-btn flex-1 p-2 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-md" data-tuition-id="${tuition.id}" data-start="${start_time || ''}" data-end="${end_time || ''}"><i class="fas fa-bell"></i> Ping</button>
                </div>
            </div>
        `;
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
        const [timetableSlots, allTuitions] = await Promise.all([fetchTimetable(), fetchTuitions()]);
        
        // --- Merge Logic ---
        const unifiedTuitions = [];
        const scheduledTuitionIds = new Set();
        const tuitionMap = new Map();

        // Index all tuitions for fast lookup
        if (Array.isArray(allTuitions)) {
            allTuitions.forEach(t => tuitionMap.set(t.id, t));
        }

        // Process Timetable Slots (Only Type 'Tuition')
        if (Array.isArray(timetableSlots)) {
            timetableSlots.forEach(slot => {
                if (slot.slot_type === 'Tuition' && slot.object_uuid) {
                    const tuition = tuitionMap.get(slot.object_uuid);
                    if (tuition) {
                        unifiedTuitions.push({
                            start_time: slot.next_occurrence_start,
                            end_time: slot.next_occurrence_end,
                            tuition: tuition
                        });
                        scheduledTuitionIds.add(slot.object_uuid);
                    }
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

        // Sort: Scheduled (by time) first, then Unscheduled (alphabetical)
        unifiedTuitions.sort((a, b) => {
            if (a.start_time && !b.start_time) return -1;
            if (!a.start_time && b.start_time) return 1;
            if (a.start_time && b.start_time) return new Date(a.start_time) - new Date(b.start_time);
            return a.tuition.subject.localeCompare(b.tuition.subject);
        });

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
