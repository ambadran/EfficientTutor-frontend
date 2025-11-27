import { appState, config } from '../config.js';
import { fetchTeacher, fetchParent, fetchStudent, fetchTeachersBySpecialty, fetchTimezones, fetchCurrencies, updateStudent, postStudent, fetchTeacherSpecialties, updateTeacher, updateParent, addTeacherSpecialty, deleteTeacherSpecialty } from '../api.js';
import { showLoadingOverlay, hideStatusOverlay, showModal, showConfirmDialog, showStatusMessage, closeModal } from './modals.js';
import { renderPage } from './navigation.js';

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

    // --- Section 2: Specialties ---
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

    return `
        <div class="max-w-4xl mx-auto">
            <h2 class="text-2xl font-bold mb-6">Teacher Profile</h2>
            ${personalInfoHTML}
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

            <div class="mt-6 text-right">
                ${isEditable ? `<button id="save-student-btn" data-student-id="${studentId || ''}" data-mode="${mode}" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-300">${isCreate ? 'Create Student' : 'Save Changes'}</button>` : ''}
            </div>
        </div>
    `;

    // --- Subjects Section ---
    let subjectsHTML = '';
    if (!isCreate) {
        const subjects = student.student_subjects || [];
        // Fetch Teacher Names for each subject
        const teacherPromises = subjects.map(s => fetchTeacher(s.teacher_id).catch(() => ({ first_name: 'Unknown', last_name: 'Teacher' })));
        const teachers = await Promise.all(teacherPromises);

        const subjectsList = subjects.map((sub, index) => {
            const teacher = teachers[index];
            const teacherName = `${teacher.first_name} ${teacher.last_name}`;
            return `
            <div class="bg-gray-700 p-4 rounded-md border border-gray-600 mb-3 flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-indigo-300 text-lg">${sub.subject}</h4>
                    <p class="text-sm text-gray-300">${sub.educational_system} • Grade ${sub.grade}</p>
                    <p class="text-sm text-gray-400 mt-1"><i class="fas fa-chalkboard-teacher mr-1"></i> Teacher: <span class="font-semibold text-gray-200">${teacherName}</span></p>
                    <p class="text-sm text-gray-400">Lessons/Week: ${sub.lessons_per_week}</p>
                </div>
                ${isEditable ? `<button class="remove-subject-btn text-red-400 hover:text-red-300 p-2" data-student-id="${studentId}" data-subject-index="${index}"><i class="fas fa-trash"></i></button>` : ''}
            </div>
        `}).join('');

        subjectsHTML = `
            <div class="bg-gray-800 p-6 rounded-lg shadow-md">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-semibold text-indigo-300">Enrolled Subjects</h3>
                    ${isEditable ? `<button id="add-student-subject-btn" data-student-id="${studentId}" class="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-md"><i class="fas fa-plus mr-2"></i> Add Subject</button>` : ''}
                </div>
                ${subjectsList || '<p class="text-gray-400 text-center py-4">No subjects enrolled.</p>'}
            </div>
        `;
    }

    return `
        <div class="max-w-4xl mx-auto space-y-6">
             ${isCreate ? '<button id="cancel-create-student-btn" class="text-gray-400 hover:text-white mb-2"><i class="fas fa-arrow-left mr-2"></i> Back to List</button>' : ''}
            ${formHTML}
            ${subjectsHTML}
        </div>
    `;
}

export async function handleSaveStudentProfile(studentId, mode) {
    const firstName = document.getElementById('st-first-name').value.trim();
    const lastName = document.getElementById('st-last-name').value.trim();
    const grade = parseInt(document.getElementById('st-grade').value);
    const email = document.getElementById('st-email').value.trim();
    
    // Optional fields (might not exist in DOM for Parents)
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

    showLoadingOverlay('Saving Student...');

    try {
        if (mode === 'create') {
            const payload = {
                first_name: firstName,
                last_name: lastName,
                parent_id: appState.currentUser.id, 
                grade: grade,
                status: status,
                cost: cost,
                min_duration_mins: minDur,
                max_duration_mins: maxDur,
                student_subjects: [], 
                student_availability_intervals: [] 
            };
            
            await postStudent(appState.currentUser.id, payload);
            showStatusMessage('success', 'Student created successfully!');
             if (appState.currentUser.role === 'parent') {
                 renderPage(); 
             }
        } else {
            // Update
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
            showStatusMessage('success', 'Student updated.');
            
            const content = await renderStudentProfile(studentId, 'edit');
            document.getElementById('page-content').innerHTML = content;
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
                    const teachers = await fetchTeachersBySpecialty(subject, system, grade);
                    
                    teacherSelect.innerHTML = '';
                    if (teachers.length === 0) {
                        alert("No teachers found for this combination.");
                        teacherContainer.classList.add('hidden');
                    } else {
                        teachers.forEach(t => {
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
            
            showLoadingOverlay('Adding subject...');
            try {
                const student = await fetchStudent(studentId);
                const newSubject = {
                    subject: modal.querySelector('#sub-subject').value,
                    educational_system: modal.querySelector('#sub-system').value,
                    grade: parseInt(modal.querySelector('#sub-grade').value),
                    teacher_id: teacherId,
                    lessons_per_week: parseInt(modal.querySelector('#sub-lessons').value),
                    shared_with_student_ids: []
                };

                const currentSubjects = student.student_subjects.map(s => ({
                    subject: s.subject,
                    educational_system: s.educational_system,
                    grade: s.grade,
                    teacher_id: s.teacher_id,
                    lessons_per_week: s.lessons_per_week,
                    shared_with_student_ids: s.shared_with_student_ids
                }));

                currentSubjects.push(newSubject);

                await updateStudent(studentId, { student_subjects: currentSubjects });
                
                closeModal();
                showStatusMessage('success', 'Subject added.');
                
                const content = await renderStudentProfile(studentId, 'edit');
                document.getElementById('page-content').innerHTML = content;

            } catch (e) {
                showStatusMessage('error', e.message);
            } finally {
                hideStatusOverlay();
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

export async function handleRemoveSubject(studentId, subjectIndex) {
    showConfirmDialog("Remove Subject", "Are you sure you want to drop this subject?", async () => {
        showLoadingOverlay("Removing subject...");
        try {
            const student = await fetchStudent(studentId);
             const currentSubjects = student.student_subjects.map(s => ({
                subject: s.subject,
                educational_system: s.educational_system,
                grade: s.grade,
                teacher_id: s.teacher_id,
                lessons_per_week: s.lessons_per_week,
                shared_with_student_ids: s.shared_with_student_ids
            }));
            
            currentSubjects.splice(subjectIndex, 1);
            
            await updateStudent(studentId, { student_subjects: currentSubjects });
            showStatusMessage('success', 'Subject removed.');
            
            const content = await renderStudentProfile(studentId, 'edit');
            document.getElementById('page-content').innerHTML = content;
        } catch (e) {
             showStatusMessage('error', e.message);
        } finally {
            hideStatusOverlay();
        }
    });
}