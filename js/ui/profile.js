import { appState, config } from '../config.js';
import { 
    fetchTeacher, 
    fetchParent, 
    fetchStudent, 
    fetchTeachersBySpecialty, 
    fetchTimezones, 
    fetchCurrencies, 
    updateStudent, 
    postStudent, 
    fetchTeacherSpecialties, 
    updateTeacher, 
    updateParent, 
    addTeacherSpecialty, 
    deleteTeacherSpecialty,
    addStudentAvailability,
    updateStudentAvailability,
    deleteStudentAvailability,
    addTeacherAvailability,
    updateTeacherAvailability,
    deleteTeacherAvailability,
    addStudentSubject,
    deleteStudentSubject,
    addSubjectSharing,
    removeSubjectSharing,
    fetchStudents
} from '../api.js';
import { showLoadingOverlay, hideStatusOverlay, showModal, showConfirmDialog, showStatusMessage, closeModal } from './modals.js';
import { renderPage } from './navigation.js';
import { renderTimetableComponent, wizardTimetableHandlers } from './timetable.js';

// --- State for Student Editing ---
export let tempStudentProfileData = null;

// --- Helpers: Data Transformation ---
function mapApiIntervalsToUi(apiIntervals) {
    const availability = {};
    config.daysOfWeek.forEach(day => {
        availability[day.toLowerCase()] = [];
    });

    if (!apiIntervals) return availability;

    apiIntervals.forEach(interval => {
        // config.daysOfWeek is ['Saturday', 'Sunday', ...]
        // API: 1=Saturday, 2=Sunday...
        const dayName = config.daysOfWeek[interval.day_of_week - 1]?.toLowerCase();
        if (dayName) {
            availability[dayName].push({
                id: interval.id, // Include ID for updates/deletes
                type: interval.availability_type,
                start: interval.start_time.slice(0, 5), // HH:MM:SS -> HH:MM
                end: interval.end_time.slice(0, 5)
            });
        }
    });
    return availability;
}

function mapUiAvailabilityToApi(uiAvailability) {
    const apiIntervals = [];
    config.daysOfWeek.forEach((day, index) => {
        const dayKey = day.toLowerCase();
        const events = uiAvailability[dayKey] || [];
        events.forEach(event => {
            apiIntervals.push({
                day_of_week: index + 1, // 1-based index
                start_time: event.start.length === 5 ? `${event.start}:00` : event.start,
                end_time: event.end.length === 5 ? `${event.end}:00` : event.end,
                availability_type: event.type
            });
        });
    });
    return apiIntervals;
}

export async function renderProfilePage() {
    const role = appState.currentUser?.role;

    if (!role) {
        return '<div class="text-center p-8 text-red-400">User role not found.</div>';
    }

    try {
        showLoadingOverlay('Loading Profile...');
        
        if (role === 'teacher') {
            const content = await renderTeacherProfile();
            hideStatusOverlay();
            return content;
        } else if (role === 'parent') {
            const content = await renderParentProfile();
            hideStatusOverlay();
            return content;
        } else if (role === 'student') {
            const content = await renderStudentProfile(appState.currentUser.id, 'view');
            hideStatusOverlay();
            return content;
        } else {
            hideStatusOverlay();
            // Placeholder for other roles
            return `<div class="text-center p-8 text-gray-400">Profile editing for <strong>${role}</strong> is coming soon.</div>`;
        }

    } catch (error) {
        hideStatusOverlay();
        console.error("Error rendering profile:", error);
        return `<div class="text-center text-red-400 p-8">Error loading profile: ${error.message}</div>`;
    }
}

export async function renderTeacherProfile(userId = appState.currentUser?.id) {
    // Fetch latest teacher data
    const [teacher, specialties, timezones, currencies] = await Promise.all([
        fetchTeacher(userId),
        fetchTeacherSpecialties(userId),
        fetchTimezones(),
        fetchCurrencies()
    ]);

    // Use temp state for availability if available (though profile is usually view-only unless we are in a 'mode', but here we are in the main profile page)
    // Actually, we should initialize tempStudentProfileData structure for teacher editing too if we want to use the same logic.
    // However, teacher profile editing is currently different (modal vs inline).
    // Let's adapt tempStudentProfileData to be generic or use a separate state.
    // For now, let's reuse tempStudentProfileData but populate it with teacher data.
    
    tempStudentProfileData = {
        id: teacher.id,
        availability: mapApiIntervalsToUi(teacher.availability_intervals || [])
    };
    // Ensure all days exist
    config.daysOfWeek.forEach(day => {
        const key = day.toLowerCase();
        if (!tempStudentProfileData.availability[key]) {
            tempStudentProfileData.availability[key] = [];
        }
    });


    // --- Section 1: Personal Information ---
    const timezoneOptions = timezones.map(tz => 
        `<option value="${tz}" ${teacher.timezone === tz ? 'selected' : ''}>${tz}</option>`
    ).join('');

    const currencyOptions = currencies.map(curr => 
        `<option value="${curr}" ${teacher.currency === curr ? 'selected' : ''}>${curr}</option>`
    ).join('');

    const personalInfoHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <h3 class="text-xl font-semibold mb-4 text-indigo-300">Personal Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium text-gray-400">First Name</label>
                    <input type="text" id="profile-first-name" value="${teacher.first_name || ''}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400">Last Name</label>
                    <input type="text" id="profile-last-name" value="${teacher.last_name || ''}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400">Email</label>
                    <input type="email" id="profile-email" value="${teacher.email || ''}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400">Timezone</label>
                    <select id="profile-timezone" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                        <option value="">Select Timezone</option>
                        ${timezoneOptions}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400">Currency</label>
                    <select id="profile-currency" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                        <option value="">Select Currency</option>
                        ${currencyOptions}
                    </select>
                </div>
                 <div>
                    <label class="block text-sm font-medium text-gray-400">Password</label>
                    <input type="password" disabled placeholder="Change Password coming soon..." class="w-full mt-1 p-2 bg-gray-900 text-gray-500 rounded-md border border-gray-800 cursor-not-allowed">
                </div>
            </div>
            <div class="mt-6 text-right">
                <button id="save-teacher-profile-btn" data-user-id="${userId}" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-300">
                    Save Changes
                </button>
            </div>
        </div>
    `;

    // --- Section 2: Availability ---
    const availabilityHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-indigo-300">Availability</h3>
            </div>
            <div id="profile-timetable-wrapper">
                ${renderTimetableComponent(true, tempStudentProfileData)}
            </div>
        </div>
    `;

    // --- Section 3: Specialties ---
    const specialtyListHTML = specialties.length > 0 
        ? specialties.map(spec => `
            <div class="flex justify-between items-center bg-gray-700 p-3 rounded-md mb-2 border border-gray-600">
                <div>
                    <span class="font-bold text-indigo-300">${spec.subject}</span> 
                    <span class="text-sm text-gray-300 mx-2">•</span>
                    <span class="text-sm text-gray-300">${spec.educational_system}</span>
                    <span class="text-sm text-gray-300 mx-2">•</span>
                    <span class="text-sm text-gray-300">Grade ${spec.grade}</span>
                </div>
                <button class="delete-specialty-btn text-red-400 hover:text-red-300 p-2 rounded hover:bg-gray-600" data-id="${spec.id}" data-teacher-id="${userId}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('')
        : '<p class="text-gray-400 text-center py-4">No specialties added yet.</p>';

    const specialtiesHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-indigo-300">Specialties</h3>
                <button id="open-add-specialty-modal-btn" data-user-id="${userId}" class="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-md">
                    <i class="fas fa-plus mr-2"></i> Add Specialty
                </button>
            </div>
            <div class="specialties-list-container">
                ${specialtyListHTML}
            </div>
        </div>
    `;

    // Update the 'Set All School' button to 'Set All Work' for teachers
    setTimeout(() => {
        const schoolBtn = document.querySelector('#profile-timetable-wrapper button[data-type="school"]');
        if (schoolBtn) {
            schoolBtn.dataset.type = 'work';
            schoolBtn.innerHTML = '<i class="fas fa-briefcase mr-2"></i> Set All Work Times';
        }
    }, 0);

    return `
        <div class="max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold mb-6">Teacher Profile</h2>
            ${personalInfoHTML}
            ${availabilityHTML}
            ${specialtiesHTML}
        </div>
    `;
}

export async function renderParentProfile(userId = appState.currentUser?.id) {
    const [parent, timezones, currencies] = await Promise.all([
        fetchParent(userId),
        fetchTimezones(),
        fetchCurrencies()
    ]);

    const timezoneOptions = timezones.map(tz => 
        `<option value="${tz}" ${parent.timezone === tz ? 'selected' : ''}>${tz}</option>`
    ).join('');

    const currencyOptions = currencies.map(curr => 
        `<option value="${curr}" ${parent.currency === curr ? 'selected' : ''}>${curr}</option>`
    ).join('');

    return `
        <div class="max-w-3xl mx-auto">
            <h2 class="text-2xl font-bold mb-6">Parent Profile</h2>
            <div class="bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-4 text-indigo-300">Personal Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-400">First Name</label>
                        <input type="text" id="profile-first-name" value="${parent.first_name || ''}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400">Last Name</label>
                        <input type="text" id="profile-last-name" value="${parent.last_name || ''}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-400">Email</label>
                        <input type="email" id="profile-email" value="${parent.email || ''}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400">Timezone</label>
                        <select id="profile-timezone" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                            <option value="">Select Timezone</option>
                            ${timezoneOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400">Currency</label>
                        <select id="profile-currency" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                            <option value="">Select Currency</option>
                            ${currencyOptions}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-400">Password</label>
                        <input type="password" disabled placeholder="Change Password coming soon..." class="w-full mt-1 p-2 bg-gray-900 text-gray-500 rounded-md border border-gray-800 cursor-not-allowed">
                    </div>
                </div>
                <div class="mt-6 text-right">
                    <button id="save-parent-profile-btn" data-user-id="${userId}" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-300">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
}

export async function renderStudentProfile(studentId, mode = 'view') {
    let student = {};
    const role = appState.currentUser?.role;
    
    if (mode !== 'create') {
        try {
            student = await fetchStudent(studentId);
        } catch (e) {
            return `<div class="text-center text-red-400">Error loading student: ${e.message}</div>`;
        }
    }

    // --- Initialize Temp State for Editing ---
    if (mode === 'create' || mode === 'edit') {
        tempStudentProfileData = {
            ...student,
            availability: mode === 'create' ? {} : mapApiIntervalsToUi(student.availability_intervals || []),
            student_subjects: mode === 'create' ? [] : (student.student_subjects || [])
        };
        // Ensure all days exist in availability
        config.daysOfWeek.forEach(day => {
            const key = day.toLowerCase();
            if (!tempStudentProfileData.availability[key]) {
                tempStudentProfileData.availability[key] = [];
            }
        });

        // For new students, set defaults if empty
        if (mode === 'create') {
            const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];
            config.daysOfWeek.forEach(day => {
                const dayKey = day.toLowerCase();
                // Default Sleep
                if (tempStudentProfileData.availability[dayKey].length === 0) {
                    tempStudentProfileData.availability[dayKey].push({ type: 'sleep', ...config.defaultSleepTimes });
                    // Default School
                    if (weekdays.includes(dayKey)) {
                        tempStudentProfileData.availability[dayKey].push({ type: 'school', ...config.defaultSchoolTimes });
                    }
                }
            });
        }
    } else {
        tempStudentProfileData = null;
    }

    const isEditable = mode === 'edit' || mode === 'create';
    const isCreate = mode === 'create';
    const isTeacher = role === 'teacher';
    const isParent = role === 'parent';
    const isStudent = role === 'student';

    const renderOptions = (items, selected) => items.map(i => `<option value="${i}" ${i === selected ? 'selected' : ''}>${i}</option>`).join('');
    const statusOptions = ["NONE", "Alpha", "Omega", "Sigma", "HIM"]; 

    // --- Visibility Logic ---
    // Only Teachers can see/edit Admin Fields (Status, Cost, Durations)
    const showAdminFields = isTeacher; 
    
    const statusFieldHTML = showAdminFields ? `
        <div>
            <label class="block text-sm font-medium text-gray-400">Status</label>
            <select id="st-status" ${!isEditable ? 'disabled' : ''} class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                ${renderOptions(statusOptions, student.status || 'NONE')}
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-400">Hourly Cost (kwd)</label>
            <input type="number" id="st-cost" value="${student.cost || 6}" step="0.5" ${!isEditable ? 'disabled' : ''} class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
        </div>
    ` : '';

    const durationFieldsHTML = showAdminFields ? `
        <div>
            <label class="block text-sm font-medium text-gray-400">Min Duration (mins)</label>
            <input type="number" id="st-min-duration" value="${student.min_duration_mins || 60}" step="15" ${!isEditable ? 'disabled' : ''} class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-400">Max Duration (mins)</label>
            <input type="number" id="st-max-duration" value="${student.max_duration_mins || 90}" step="15" ${!isEditable ? 'disabled' : ''} class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
        </div>
    ` : '';

    const formHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
            <h3 class="text-xl font-semibold mb-4 text-indigo-300">${isCreate ? 'New Student Details' : 'Student Details'}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium text-gray-400">First Name</label>
                    <input type="text" id="st-first-name" value="${student.first_name || ''}" ${!isEditable ? 'disabled' : ''} class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400">Last Name</label>
                    <input type="text" id="st-last-name" value="${student.last_name || ''}" ${!isEditable ? 'disabled' : ''} class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-400">Grade (1-12)</label>
                    <input type="number" id="st-grade" value="${student.grade || ''}" min="1" max="12" ${!isEditable ? 'disabled' : ''} class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
                </div>
                
                ${statusFieldHTML}

                 <div>
                    <label class="block text-sm font-medium text-gray-400">Email</label>
                    <input type="email" id="st-email" value="${student.email || ''}" ${isCreate ? '' : 'disabled'} placeholder="${isCreate ? 'Optional (auto-generated if empty)' : ''}" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600 ${!isCreate ? 'opacity-50 cursor-not-allowed' : ''}">
                </div>
                
                ${durationFieldsHTML}
            </div>
            
            ${(!isCreate && !isStudent && student.generated_password) ? `
            <div class="mt-4 p-4 bg-gray-900 rounded-md border border-indigo-900/50">
                <p class="text-sm text-indigo-300 font-semibold"><i class="fas fa-key mr-2"></i>Generated Credentials</p>
                <div class="flex items-center justify-between mt-2">
                    <p class="text-sm text-gray-400">Password: <span class="font-mono text-white select-all">${student.generated_password}</span></p>
                    <p class="text-xs text-gray-500">Share this with the student.</p>
                </div>
            </div>` : ''}

            ${(!isCreate && isEditable) ? `
            <div class="mt-6 text-right">
                <button id="save-student-details-btn" data-student-id="${studentId}" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-300">Save Details</button>
            </div>` : ''}
        </div>
    `;

    // --- Subjects Section (Moved Above Availability) ---
    // Use temp state for subjects if editable
    const subjectsToRender = isEditable ? (tempStudentProfileData.student_subjects || []) : (student.student_subjects || []);
    
    // Note: Backend now returns 'teacher' object and 'shared_with_students' list in StudentSubjectRead.
    // No need to fetch teacher names manually.

    const subjectsList = subjectsToRender.map((sub, index) => {
        // Teacher Name Resolution
        let teacherName = 'Pending Save';
        if (sub.teacher) {
            teacherName = `${sub.teacher.first_name} ${sub.teacher.last_name}`;
        } else if (sub.teacherObject) {
            // Fallback for local 'create' mode where we stored the object manually
            teacherName = `${sub.teacherObject.first_name} ${sub.teacherObject.last_name}`;
        }

        // Shared Students Resolution
        const sharedNames = (sub.shared_with_students || [])
            .map(u => u.first_name)
            .join(', ');

        return `
        <div class="bg-gray-700 p-4 rounded-md border border-gray-600 mb-3 flex justify-between items-start">
            <div>
                <h4 class="font-bold text-indigo-300 text-lg">${sub.subject}</h4>
                <p class="text-sm text-gray-300">${sub.educational_system} • Grade ${sub.grade}</p>
                <p class="text-sm text-gray-400 mt-1"><i class="fas fa-chalkboard-teacher mr-1"></i> Teacher: <span class="font-semibold text-gray-200">${teacherName}</span></p>
                <p class="text-sm text-gray-400">Lessons/Week: ${sub.lessons_per_week}</p>
                ${sharedNames ? `<p class="text-xs text-indigo-300 mt-1"><i class="fas fa-users mr-1"></i> Shared with: ${sharedNames}</p>` : ''}
            </div>
            ${isEditable ? `
            <div class="flex flex-col space-y-2 ml-2">
                <button title="Share Subject" class="share-subject-btn text-blue-400 hover:text-blue-300 p-2" data-student-id="${studentId || 'new'}" data-subject-index="${index}"><i class="fas fa-share-alt"></i></button>
                <button title="Remove Subject" class="remove-subject-btn text-red-400 hover:text-red-300 p-2" data-student-id="${studentId || 'new'}" data-subject-index="${index}" data-subject-id="${sub.id || ''}"><i class="fas fa-trash"></i></button>
            </div>` : ''}
        </div>
    `}).join('');

    const subjectsHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-indigo-300">Enrolled Subjects</h3>
                ${isEditable ? `<button id="add-student-subject-btn" data-student-id="${studentId || 'new'}" class="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-md"><i class="fas fa-plus mr-2"></i> Add Subject</button>` : ''}
            </div>
            ${subjectsList || '<p class="text-gray-400 text-center py-4">No subjects enrolled.</p>'}
        </div>
    `;

    // --- Availability Section (Only for Edit/Create) ---
    let availabilityHTML = '';
    if (isEditable) {
        availabilityHTML = `
            <div class="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold text-indigo-300">Availability</h3>
                </div>
                <div id="profile-timetable-wrapper">
                    ${renderTimetableComponent(true, tempStudentProfileData)}
                </div>
            </div>
        `;
    }

    return `
        <div class="max-w-4xl mx-auto space-y-6">
             ${isCreate ? '<button id="cancel-create-student-btn" class="text-gray-400 hover:text-white mb-2"><i class="fas fa-arrow-left mr-2"></i> Back to List</button>' : ''}
            ${formHTML}
            ${subjectsHTML}
            ${availabilityHTML}
            ${isCreate ? `
                <div class="bg-gray-800 p-4 rounded-lg shadow-md flex justify-end sticky bottom-4 border-t border-gray-700">
                    <button id="create-student-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-md transition duration-300 shadow-lg">
                        Create Student
                    </button>
                </div>` : ''}
        </div>
    `;
}

export function updateProfileTimetable() {
    const wrapper = document.getElementById('profile-timetable-wrapper');
    if (wrapper && tempStudentProfileData) {
        wrapper.innerHTML = renderTimetableComponent(true, tempStudentProfileData);
    }
}

export async function handleProfileTimetableAction(action, ...args) {
    if (!tempStudentProfileData) return;

    const updateCallback = () => updateProfileTimetable();
    
    // Check if we are in "Create Mode" (no student ID yet)
    // Also Check if we are editing a Teacher (userId === studentId in temp data, or role check)
    // NOTE: tempStudentProfileData.id will be the Teacher's ID when editing teacher profile.
    const isCreateMode = !tempStudentProfileData.id;
    const entityId = tempStudentProfileData.id;
    const isTeacher = appState.currentUser.role === 'teacher' && appState.currentUser.id === entityId;

    // --- API Callbacks for Immediate Mode ---
    const onSaveCallback = async (data) => {
        if (isCreateMode) return; // Wizard handles its own saving via local array
        
        const dayIndex = config.daysOfWeek.findIndex(d => d.toLowerCase() === args[0].toLowerCase()) + 1;
        
        const payload = {
            day_of_week: dayIndex,
            start_time: data.start + ":00",
            end_time: data.end + ":00",
            availability_type: data.type
        };

        if (action === 'add') {
            if (isTeacher) {
                await addTeacherAvailability(entityId, payload);
            } else {
                await addStudentAvailability(entityId, payload);
            }
        } else if (action === 'edit') {
            const updatePayload = {
                start_time: data.start + ":00",
                end_time: data.end + ":00"
            };
            if (isTeacher) {
                await updateTeacherAvailability(entityId, data.id, updatePayload);
            } else {
                await updateStudentAvailability(entityId, data.id, updatePayload);
            }
        }
        // After API success, refresh data
        let updatedEntity;
        if (isTeacher) {
            updatedEntity = await fetchTeacher(entityId);
        } else {
            updatedEntity = await fetchStudent(entityId);
        }
        tempStudentProfileData.availability = mapApiIntervalsToUi(updatedEntity.availability_intervals);
    };

    const onDeleteCallback = async (data) => {
        if (isCreateMode) return;
        if (!data.id) {
            throw new Error("Cannot delete interval without ID.");
        }
        
        if (isTeacher) {
            await deleteTeacherAvailability(entityId, data.id);
        } else {
            await deleteStudentAvailability(entityId, data.id);
        }
        
        // Refresh
        let updatedEntity;
        if (isTeacher) {
            updatedEntity = await fetchTeacher(entityId);
        } else {
            updatedEntity = await fetchStudent(entityId);
        }
        tempStudentProfileData.availability = mapApiIntervalsToUi(updatedEntity.availability_intervals);
    };

    const onSetAllCallback = async (type, start, end) => {
        if (isCreateMode) return; 
        
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
        const daysToUpdate = (type === 'school' || type === 'work') ? weekdays : config.daysOfWeek;
        
        const promises = daysToUpdate.map(async (dayName) => {
            const dayKey = dayName.toLowerCase();
            const dayIndex = config.daysOfWeek.indexOf(dayName) + 1; // 1-based index for API
            
            // Find existing interval for this day and type
            const existingInterval = tempStudentProfileData.availability[dayKey]?.find(i => i.type === type);
            
            if (existingInterval && existingInterval.id) {
                const payload = {
                    start_time: start + ":00",
                    end_time: end + ":00"
                };
                return isTeacher 
                    ? updateTeacherAvailability(entityId, existingInterval.id, payload)
                    : updateStudentAvailability(entityId, existingInterval.id, payload);
            } else {
                const payload = {
                    day_of_week: dayIndex,
                    start_time: start + ":00",
                    end_time: end + ":00",
                    availability_type: type
                };
                return isTeacher
                    ? addTeacherAvailability(entityId, payload)
                    : addStudentAvailability(entityId, payload);
            }
        });

        await Promise.all(promises);
        
        // Refresh data after bulk operation
        let updatedEntity;
        if (isTeacher) {
            updatedEntity = await fetchTeacher(entityId);
        } else {
            updatedEntity = await fetchStudent(entityId);
        }
        tempStudentProfileData.availability = mapApiIntervalsToUi(updatedEntity.availability_intervals);
    };


    if (action === 'add') {
        // args: [dayKey, pixelY]
        // Pass onSaveCallback only if NOT in create mode
        wizardTimetableHandlers.showAddEventModal(
            tempStudentProfileData, 
            args[0], 
            args[1], 
            updateCallback, 
            isCreateMode ? null : onSaveCallback
        );
    } else if (action === 'edit') {
        // args: [dayKey, startTime]
        wizardTimetableHandlers.showEditEventModal(
            tempStudentProfileData, 
            args[0], 
            args[1], 
            updateCallback, 
            isCreateMode ? null : onSaveCallback,
            isCreateMode ? null : onDeleteCallback
        );
    } else if (action === 'setAll') {
        // args: [type]
        wizardTimetableHandlers.showSetAllTimesModal(
            tempStudentProfileData, 
            args[0], 
            updateCallback,
            isCreateMode ? null : onSetAllCallback // Pass the bulk update callback
        );
    }
}

// --- Handlers for Saving ---

// 1. Save Details (Basic Info)
export async function handleSaveStudentDetails(studentId) {
    const firstName = document.getElementById('st-first-name').value.trim();
    const lastName = document.getElementById('st-last-name').value.trim();
    const grade = parseInt(document.getElementById('st-grade').value);
    const email = document.getElementById('st-email').value.trim();
    
    // Optional fields
    const statusEl = document.getElementById('st-status');
    const costEl = document.getElementById('st-cost');
    const minDurEl = document.getElementById('st-min-duration');
    const maxDurEl = document.getElementById('st-max-duration');

    const status = statusEl ? statusEl.value : 'NONE';
    const cost = costEl ? parseFloat(costEl.value) : 6;
    const minDur = minDurEl ? parseInt(minDurEl.value) : 60;
    const maxDur = maxDurEl ? parseInt(maxDurEl.value) : 90;

    if (!firstName || !lastName || isNaN(grade)) {
        showStatusMessage('error', 'Name and Grade are required.');
        return;
    }

    showLoadingOverlay('Saving Details...');
    try {
        const payload = {
            first_name: firstName,
            last_name: lastName,
            grade: grade
        };
        
        if (statusEl) payload.status = status;
        if (costEl) payload.cost = cost;
        if (minDurEl) payload.min_duration_mins = minDur;
        if (maxDurEl) payload.max_duration_mins = maxDur;
        if (email) payload.email = email;

        await updateStudent(studentId, payload);
        showStatusMessage('success', 'Details saved successfully.');
    } catch (error) {
        showStatusMessage('error', error.message);
    } finally {
        hideStatusOverlay();
    }
}

// 2. Save Availability (Deprecated/Removed)
// Availability is now saved immediately via handleProfileTimetableAction using the new endpoints.

// 3. Create Student (Combines everything)
export async function handleCreateStudent() {
    const firstName = document.getElementById('st-first-name').value.trim();
    const lastName = document.getElementById('st-last-name').value.trim();
    const grade = parseInt(document.getElementById('st-grade').value);
    
    const statusEl = document.getElementById('st-status');
    const costEl = document.getElementById('st-cost');
    const minDurEl = document.getElementById('st-min-duration');
    const maxDurEl = document.getElementById('st-max-duration');

    const status = statusEl ? statusEl.value : 'NONE';
    const cost = costEl ? parseFloat(costEl.value) : 6;
    const minDur = minDurEl ? parseInt(minDurEl.value) : 60;
    const maxDur = maxDurEl ? parseInt(maxDurEl.value) : 90;

    if (!firstName || !lastName || isNaN(grade)) {
        showStatusMessage('error', 'Name and Grade are required.');
        return;
    }

    showLoadingOverlay('Creating Student...');
    try {
        const apiAvailability = tempStudentProfileData ? mapUiAvailabilityToApi(tempStudentProfileData.availability) : [];
        // Ensure subjects are formatted correctly for API (exclude teacherObject)
        const apiSubjects = (tempStudentProfileData?.student_subjects || []).map(s => ({
            subject: s.subject,
            teacher_id: s.teacher_id,
            educational_system: s.educational_system,
            grade: s.grade,
            lessons_per_week: s.lessons_per_week,
            shared_with_student_ids: s.shared_with_student_ids || []
        }));

        const payload = {
            first_name: firstName,
            last_name: lastName,
            parent_id: appState.currentUser.id, 
            grade: grade,
            status: status,
            cost: cost,
            min_duration_mins: minDur,
            max_duration_mins: maxDur,
            student_subjects: apiSubjects, 
            student_availability_intervals: apiAvailability 
        };
        
        await postStudent(appState.currentUser.id, payload);
        showStatusMessage('success', 'Student created successfully!');
        if (appState.currentUser.role === 'parent') {
            renderPage(); 
        }
    } catch (error) {
        showStatusMessage('error', error.message);
    } finally {
        hideStatusOverlay();
    }
}

export function showAddSubjectModal(studentId) {
    const isTeacher = appState.currentUser.role === 'teacher';
    
    const subjectOptions = config.noteSubjects.map(s => `<option value="${s}">${s}</option>`).join('');
    const systemOptions = config.educationalSystems.map(s => `<option value="${s}">${s}</option>`).join('');

    const body = `
        <div class="space-y-4" id="add-subject-form">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-sm text-gray-400">Subject</label>
                    <select id="sub-subject" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${subjectOptions}</select>
                </div>
                <div>
                    <label class="text-sm text-gray-400">System</label>
                    <select id="sub-system" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">${systemOptions}</select>
                </div>
            </div>
            <div>
                <label class="text-sm text-gray-400">Grade</label>
                <input type="number" id="sub-grade" min="1" max="12" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600" placeholder="Grade">
            </div>
            
            ${!isTeacher ? `
            <div id="teacher-selection-container" class="hidden">
                <label class="text-sm text-gray-400">Select Teacher</label>
                <select id="sub-teacher" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600"></select>
                <p id="teacher-loading-msg" class="text-xs text-yellow-400 hidden mt-1">Finding teachers...</p>
            </div>` : ''}

            <div>
                <label class="text-sm text-gray-400">Lessons Per Week</label>
                <input type="number" id="sub-lessons" min="1" value="1" class="w-full mt-1 p-2 bg-gray-700 rounded-md border border-gray-600">
            </div>
        </div>
    `;

    const footer = `
        <div class="flex justify-end space-x-3">
            ${!isTeacher ? `<button id="find-teachers-btn" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md">Find Teachers</button>` : ''}
            <button id="save-subject-btn" class="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-md ${!isTeacher ? 'hidden' : ''}">Add Subject</button>
        </div>
    `;

    showModal('Enroll in Subject', body, footer, (modal) => {
        const findBtn = modal.querySelector('#find-teachers-btn');
        const saveBtn = modal.querySelector('#save-subject-btn');
        const teacherContainer = modal.querySelector('#teacher-selection-container');
        const teacherSelect = modal.querySelector('#sub-teacher');

        // Store found teachers to retrieve names later for local display
        let foundTeachers = [];

        // UX Helper: Reset teacher selection if criteria changes
        const resetTeacherSelection = () => {
            if (!teacherContainer) return; // Safety check for Teachers (container doesn't exist)
            
            if (!teacherContainer.classList.contains('hidden')) {
                teacherContainer.classList.add('hidden');
                saveBtn.classList.add('hidden');
                if (findBtn) findBtn.classList.remove('hidden');
                teacherSelect.innerHTML = '';
                foundTeachers = [];
            }
        };

        modal.querySelector('#sub-subject').addEventListener('change', resetTeacherSelection);
        modal.querySelector('#sub-system').addEventListener('change', resetTeacherSelection);
        modal.querySelector('#sub-grade').addEventListener('input', resetTeacherSelection); // 'input' for immediate feedback on number fields

        if (findBtn) {
            findBtn.addEventListener('click', async () => {
                const subject = modal.querySelector('#sub-subject').value;
                const system = modal.querySelector('#sub-system').value;
                const grade = parseInt(modal.querySelector('#sub-grade').value);

                if (!subject || !system || isNaN(grade)) {
                    alert("Please select Subject, System and Grade.");
                    return;
                }

                findBtn.disabled = true;
                findBtn.textContent = "Searching...";
                
                try {
                    foundTeachers = await fetchTeachersBySpecialty(subject, system, grade);
                    
                    teacherSelect.innerHTML = '';
                    if (foundTeachers.length === 0) {
                        alert("No teachers found for this combination.");
                        teacherContainer.classList.add('hidden');
                    } else {
                        foundTeachers.forEach(t => {
                            const opt = document.createElement('option');
                            opt.value = t.id;
                            opt.textContent = `${t.first_name} ${t.last_name} (${t.email})`;
                            teacherSelect.appendChild(opt);
                        });
                        teacherContainer.classList.remove('hidden');
                        saveBtn.classList.remove('hidden');
                        findBtn.classList.add('hidden'); 
                    }
                } catch (e) {
                    alert("Error fetching teachers: " + e.message);
                } finally {
                    findBtn.disabled = false;
                    findBtn.textContent = "Find Teachers";
                }
            });
        }

        saveBtn.addEventListener('click', async () => {
            const teacherId = isTeacher ? appState.currentUser.id : teacherSelect.value;
            
            if (!teacherId) {
                alert("Please select a teacher.");
                return;
            }
            
            // Check if we are in "Create Mode" (studentId is 'new') or "Edit Mode"
            const isCreateMode = studentId === 'new';

            if (isCreateMode) {
                // Local Save
                const newSubject = {
                    subject: modal.querySelector('#sub-subject').value,
                    educational_system: modal.querySelector('#sub-system').value,
                    grade: parseInt(modal.querySelector('#sub-grade').value),
                    teacher_id: teacherId,
                    lessons_per_week: parseInt(modal.querySelector('#sub-lessons').value),
                    shared_with_student_ids: [],
                    // Store teacher object for immediate display without fetching
                    teacherObject: isTeacher ? appState.currentUser : foundTeachers.find(t => t.id === teacherId)
                };

                if (tempStudentProfileData && tempStudentProfileData.student_subjects) {
                    tempStudentProfileData.student_subjects.push(newSubject);
                }
                
                closeModal();
                // Re-render the create view
                const content = await renderStudentProfile(null, 'create');
                document.getElementById('page-content').innerHTML = content;

            } else {
                // API Save (New POST Endpoint)
                showLoadingOverlay('Adding subject...');
                try {
                    const payload = {
                        subject: modal.querySelector('#sub-subject').value,
                        educational_system: modal.querySelector('#sub-system').value,
                        grade: parseInt(modal.querySelector('#sub-grade').value),
                        teacher_id: teacherId,
                        lessons_per_week: parseInt(modal.querySelector('#sub-lessons').value),
                        shared_with_student_ids: []
                    };

                    const addedSubject = await addStudentSubject(studentId, payload);
                    
                    // Manually update the temp state if it exists, or we just reload.
                    // But since we are in 'edit' mode, we usually have tempStudentProfileData.
                    // We should update the source of truth if we want to avoid a full refetch, 
                    // or just refetching logic inside renderStudentProfile handles it.
                    // Let's force a refresh which fetches fresh data, ensuring consistency.
                    // Or better, push to temp data to avoid fetch latency if we trust the return.
                    
                    // Note: renderStudentProfile re-fetches student data if we don't pass 'create'.
                    // So simply calling renderStudentProfile(studentId, 'edit') is enough.
                    
                    closeModal();
                    showStatusMessage('success', 'Subject added.');
                    
                    const content = await renderStudentProfile(studentId, 'edit');
                    document.getElementById('page-content').innerHTML = content;

                } catch (e) {
                    // CRITICAL: Do NOT close modal on error
                    hideStatusOverlay(); // Hide loader so they can try again
                    showStatusMessage('error', e.message);
                }
            }
        });
    });
}

export async function handleUpdateTeacherProfile(userId) {
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

export async function handleUpdateParentProfile(userId) {
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

export function showAddSpecialtyModal(teacherId) {
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

export async function handleRemoveSubject(studentId, subjectIndex, subjectId) {
    const isCreateMode = studentId === 'new';

    showConfirmDialog("Remove Subject", "Are you sure you want to drop this subject?", async () => {
        if (isCreateMode) {
            // Local Remove
            if (tempStudentProfileData && tempStudentProfileData.student_subjects) {
                tempStudentProfileData.student_subjects.splice(subjectIndex, 1);
            }
            closeModal();
            const content = await renderStudentProfile(null, 'create');
            document.getElementById('page-content').innerHTML = content;
        } else {
            // API Remove
            if (!subjectId) {
                showStatusMessage('error', "Cannot remove subject: Missing ID.");
                return;
            }
            showLoadingOverlay("Removing subject...");
            try {
                await deleteStudentSubject(studentId, subjectId);
                showStatusMessage('success', 'Subject removed.');
                
                // Refresh view
                const content = await renderStudentProfile(studentId, 'edit');
                document.getElementById('page-content').innerHTML = content;
            } catch (e) {
                 showStatusMessage('error', e.message);
            } finally {
                hideStatusOverlay();
            }
        }
    });
}

export async function showShareSubjectModal(studentId, subject) {
    if (studentId === 'new' || !subject.id) {
        showStatusMessage('error', 'Please save the student and subject first before sharing.');
        return;
    }

    showLoadingOverlay('Loading students...');
    try {
        // Fetch all available students (siblings or teacher's students)
        const allStudents = await fetchStudents();
        hideStatusOverlay();

        // Filter out the current student
        const candidates = allStudents.filter(s => s.id !== studentId);

        if (candidates.length === 0) {
            showStatusMessage('info', 'No other students available to share with.');
            return;
        }

        const renderList = () => {
            return candidates.map(candidate => {
                // Check if this candidate is already in the shared list
                // subject.shared_with_students contains UserRead objects (with .id)
                const isShared = (subject.shared_with_students || []).some(s => s.id === candidate.id);
                
                const btnColor = isShared ? 'text-red-400 hover:text-red-300 border-red-500/50' : 'text-green-400 hover:text-green-300 border-green-500/50';
                const btnIcon = isShared ? 'fa-minus' : 'fa-plus';
                const action = isShared ? 'remove' : 'add';

                return `
                    <div class="flex justify-between items-center bg-gray-700 p-3 rounded-md border border-gray-600">
                        <span class="font-medium text-gray-200">${candidate.first_name} ${candidate.last_name}</span>
                        <button class="toggle-share-btn p-2 border rounded-md ${btnColor} transition-colors" 
                                data-candidate-id="${candidate.id}" 
                                data-action="${action}"
                                data-candidate-name="${candidate.first_name} ${candidate.last_name}">
                            <i class="fas ${btnIcon}"></i>
                        </button>
                    </div>`;
            }).join('');
        };

        const body = `<div id="share-candidates-list" class="space-y-2 max-h-60 overflow-y-auto pr-1">${renderList()}</div>`;
        const footer = `<div class="flex justify-end"><button id="modal-close-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Close</button></div>`;

        showModal(`Share ${subject.subject}`, body, footer, (modal) => {
            const listContainer = modal.querySelector('#share-candidates-list');

            listContainer.addEventListener('click', async (e) => {
                const btn = e.target.closest('.toggle-share-btn');
                if (!btn) return;

                const candidateId = btn.dataset.candidateId;
                const action = btn.dataset.action;
                const candidateName = btn.dataset.candidateName;

                // Optimistic UI update or Loader? 
                // Let's use a small loader on the button to show activity
                const originalIcon = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;

                try {
                    if (action === 'add') {
                        const updatedSubject = await addSubjectSharing(studentId, subject.id, candidateId);
                        // Update local object
                        subject.shared_with_students = updatedSubject.shared_with_students;
                    } else {
                        await removeSubjectSharing(studentId, subject.id, candidateId);
                        // Manually remove from local object
                        subject.shared_with_students = (subject.shared_with_students || []).filter(s => s.id !== candidateId);
                    }
                    
                    // Success: Re-render the list inside the modal to update button states
                    listContainer.innerHTML = renderList();
                    
                    // Also update the main profile view in the background
                    const content = await renderStudentProfile(studentId, 'edit');
                    const pageContent = document.getElementById('page-content');
                    if (pageContent) pageContent.innerHTML = content;

                } catch (error) {
                    showStatusMessage('error', error.message);
                    btn.innerHTML = originalIcon;
                    btn.disabled = false;
                }
            });
        });

    } catch (error) {
        hideStatusOverlay();
        showStatusMessage('error', error.message);
    }
}