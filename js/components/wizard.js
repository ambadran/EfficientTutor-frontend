/* This module manages the entire multi-step student registration 
 * and editing process. It handles the state of the wizard, 
 * renders each step, validates the input, and finally sends 
 * the completed student data to the backend via the api.js module.
 */

import { api } from '../api.js';
import { appState, navigateTo } from '../main.js';
// --- FIX #1: The import statement is corrected here ---
import { showModal, hideModal, showStatusMessage, hideStatusOverlay } from './modal.js';
import { renderTimetableComponent } from './timetable.js';

let wizardState = {};

/**
 * Opens the student registration/edit wizard.
 * @param {object | null} student - The student object to edit, or null for a new student.
 */
export function openWizard(student = null) {
    if (student) {
        // Deep copy the student object to avoid modifying the original state until save
        wizardState.data = JSON.parse(JSON.stringify(student));
        wizardState.isEditing = true;
    } else {
        wizardState.data = {
            id: crypto.randomUUID(), // Generate a proper UUID upfront
            firstName: '',
            lastName: '',
            grade: '',
            subjects: [],
            availability: {},
        };
        wizardState.isEditing = false;
    }
    wizardState.currentStep = 1;
    renderWizard();
}

function renderWizard() {
    const title = wizardState.isEditing ? `Edit ${wizardState.data.firstName}` : 'Add New Student';
    let content = '';

    switch (wizardState.currentStep) {
        case 1:
            content = wizardStep1();
            break;
        case 2:
            content = wizardStep2();
            break;
        case 3:
            content = wizardStep3();
            break;
        case 4:
            content = wizardStep4();
            break;
    }

    showModal({
        title: title,
        content: content,
        buttons: getWizardButtons(),
        isWizard: true
    });

    // Re-attach listeners for dynamically created content
    attachWizardListeners();
}

function getWizardButtons() {
    const buttons = [];
    if (wizardState.currentStep > 1) {
        buttons.push({ text: 'Previous', class: 'secondary', action: () => navigateWizard(-1) });
    }
    if (wizardState.currentStep < 4) {
        buttons.push({ text: 'Next', class: 'primary', action: () => navigateWizard(1) });
    }
    if (wizardState.currentStep === 4) {
        buttons.push({ text: 'Finish', class: 'primary', action: handleWizardFinish });
    }
    return buttons;
}

function navigateWizard(direction) {
    if (direction === 1) { // Moving forward
        if (!validateStep(wizardState.currentStep)) {
            return; // Stop if validation fails
        }
    }
    wizardState.currentStep += direction;
    renderWizard();
}

function validateStep(step) {
    if (step === 1) {
        const firstName = document.getElementById('wizard-firstName').value;
        const lastName = document.getElementById('wizard-lastName').value;
        const grade = document.getElementById('wizard-grade').value;
        if (!firstName || !lastName || !grade) {
            alert('Please fill in all fields.');
            return false;
        }
        wizardState.data.firstName = firstName;
        wizardState.data.lastName = lastName;
        wizardState.data.grade = parseInt(grade, 10);
    }
    // Add validation for other steps if needed
    return true;
}

async function handleWizardFinish() {
    // --- FIX #2: The function call is corrected here ---
    showStatusMessage('Saving student data...', 'loading');
    
    const { success, error } = await api.saveStudent(appState.currentUser.id, wizardState.data);

    if (success) {
        hideModal();
        navigateTo('students'); // This will trigger a fresh render of the student list
        showStatusMessage('Student saved successfully!', 'success');
    } else {
        showStatusMessage(`Error: ${error}`, 'error');
    }
     setTimeout(hideStatusOverlay, 2000);
}


function attachWizardListeners() {
    // Step 2 Listeners
    if (wizardState.currentStep === 2) {
        document.getElementById('add-subject-btn')?.addEventListener('click', handleAddSubject);
        document.querySelector('.subjects-list')?.addEventListener('click', (e) => {
            if (e.target.closest('.delete-subject-btn')) {
                const subjectName = e.target.closest('.delete-subject-btn').dataset.subject;
                wizardState.data.subjects = wizardState.data.subjects.filter(s => s.name !== subjectName);
                renderWizard();
            }
            if (e.target.closest('.share-subject-btn')) {
                const subjectName = e.target.closest('.share-subject-btn').dataset.subject;
                showShareModal(subjectName);
            }
        });
    }

    // Step 3 Listeners
    if (wizardState.currentStep === 3) {
        const timetableContainer = document.querySelector('.wizard-timetable-container');
        if (timetableContainer) {
            // Initial render of the timetable for the current day
            updateWizardTimetable();

            // Day navigation
            timetableContainer.addEventListener('click', e => {
                if (e.target.closest('.day-nav-btn')) {
                    const direction = parseInt(e.target.closest('.day-nav-btn').dataset.direction, 10);
                    const currentDayIndex = wizardState.data.currentDayIndex || 0;
                    wizardState.data.currentDayIndex = (currentDayIndex + direction + 7) % 7;
                    updateWizardTimetable();
                }

                // Add activity
                if (e.target.classList.contains('time-slot-bg')) {
                    const dayIndex = parseInt(e.target.dataset.dayIndex, 10);
                    const hour = parseInt(e.target.dataset.hour, 10);
                    showAddActivityModal(dayIndex, hour);
                }

                // Edit/Delete activity
                if (e.target.closest('.activity-bubble')) {
                    const dayIndex = parseInt(e.target.closest('.activity-bubble').dataset.dayIndex, 10);
                    const activityIndex = parseInt(e.target.closest('.activity-bubble').dataset.activityIndex, 10);
                    showEditActivityModal(dayIndex, activityIndex);
                }
            });

             // "Set All" buttons
            document.getElementById('set-all-school-btn')?.addEventListener('click', () => showSetAllTimesModal('School'));
            document.getElementById('set-all-sleep-btn')?.addEventListener('click', () => showSetAllTimesModal('Sleep'));
        }
    }
}


// --- WIZARD STEP HTML ---

function wizardStep1() {
    return `
        <p class="text-gray-400 mb-6">Enter the student's basic information.</p>
        <div class="space-y-4">
            <input id="wizard-firstName" type="text" placeholder="First Name" class="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" value="${wizardState.data.firstName || ''}">
            <input id="wizard-lastName" type="text" placeholder="Last Name" class="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" value="${wizardState.data.lastName || ''}">
            <input id="wizard-grade" type="number" placeholder="Grade (e.g., 10)" class="w-full p-3 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" value="${wizardState.data.grade || ''}">
        </div>
    `;
}

function wizardStep2() {
    const subjects = ['Math', 'Physics', 'Chemistry', 'Biology', 'IT', 'Geography'];
    const addedSubjects = wizardState.data.subjects.map(s => s.name);
    const availableSubjects = subjects.filter(s => !addedSubjects.includes(s));

    return `
        <p class="text-gray-400 mb-4">Add the subjects the student needs tuition for and how many lessons per week.</p>
        <div class="flex items-center gap-2 mb-4">
            <select id="subject-select" class="flex-grow p-3 bg-gray-700 rounded border border-gray-600 text-white">
                ${availableSubjects.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
            <input id="lessons-per-week" type="number" value="1" min="1" class="w-24 p-3 bg-gray-700 rounded border border-gray-600 text-white">
            <button id="add-subject-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Add</button>
        </div>
        <h4 class="font-semibold text-white mt-6 mb-2">Added Subjects</h4>
        <ul class="subjects-list space-y-2">
            ${wizardState.data.subjects.map(s => `
                <li class="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <p class="font-bold text-white">${s.name}</p>
                        <p class="text-sm text-gray-400">${s.lessonsPerWeek} lesson(s) per week</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <button class="share-subject-btn text-gray-400 hover:text-white" data-subject="${s.name}">
                           <i class="fas fa-users mr-1"></i> Allowed Others
                        </button>
                        <button class="delete-subject-btn text-gray-400 hover:text-red-500" data-subject="${s.name}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </li>
            `).join('') || '<p class="text-gray-500 text-center py-4">No subjects added yet.</p>'}
        </ul>
    `;
}

function handleAddSubject() {
    const subjectSelect = document.getElementById('subject-select');
    const lessonsInput = document.getElementById('lessons-per-week');
    if (!subjectSelect.value) {
        alert('All subjects have been added.');
        return;
    }
    const newSubject = {
        name: subjectSelect.value,
        lessonsPerWeek: parseInt(lessonsInput.value, 10),
        sharedWith: []
    };
    wizardState.data.subjects.push(newSubject);
    renderWizard();
}


function showShareModal(subjectName) {
    const subject = wizardState.data.subjects.find(s => s.name === subjectName);
    const otherStudents = appState.students.filter(s => s.id !== wizardState.data.id);

    const content = `
        <p class="text-gray-400 mb-4">Select which other students are allowed to join this ${subjectName} lesson.</p>
        <div class="space-y-2 max-h-60 overflow-y-auto">
            ${otherStudents.length > 0 ? otherStudents.map(student => `
                <label class="flex items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600 cursor-pointer">
                    <input type="checkbox" class="h-5 w-5 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
                           data-student-id="${student.id}" ${subject.sharedWith.includes(student.id) ? 'checked' : ''}>
                    <span class="ml-3 text-white">${student.firstName} ${student.lastName}</span>
                </label>
            `).join('') : '<p class="text-gray-500">No other students registered to share with.</p>'}
        </div>
    `;

    showModal({
        title: `Share ${subjectName} Lesson`,
        content: content,
        buttons: [
            { text: 'Done', class: 'primary', action: () => {
                const selectedIds = [];
                document.querySelectorAll('#modal-content input[type="checkbox"]:checked').forEach(checkbox => {
                    selectedIds.push(checkbox.dataset.studentId);
                });
                subject.sharedWith = selectedIds;
                hideModal(); // Close the share modal, but keep the wizard open
            }}
        ]
    });
}


function wizardStep3() {
    const dayIndex = wizardState.data.currentDayIndex || 0;
    const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const currentDayName = dayNames[dayIndex];
    return `
        <p class="text-gray-400 mb-4">Mark all times the student is unavailable (e.g., school, sports). Click on an empty slot to add an activity.</p>
        <div class="wizard-timetable-container bg-gray-800 p-2 rounded-lg">
             <div class="flex justify-between items-center mb-4 px-2">
                <button class="day-nav-btn p-2 rounded-full hover:bg-gray-700" data-direction="-1"><i class="fas fa-chevron-left"></i></button>
                <h3 class="text-xl font-bold text-white">${currentDayName}</h3>
                <button class="day-nav-btn p-2 rounded-full hover:bg-gray-700" data-direction="1"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="flex items-center justify-center gap-4 mb-4">
                 <button id="set-all-school-btn" class="bg-yellow-600/50 hover:bg-yellow-500/50 text-white text-sm font-bold py-2 px-3 rounded-lg">Set All School Times</button>
                 <button id="set-all-sleep-btn" class="bg-purple-600/50 hover:bg-purple-500/50 text-white text-sm font-bold py-2 px-3 rounded-lg">Set All Sleep Times</button>
            </div>
            <div class="timetable-grid-container relative overflow-y-auto max-h-[50vh] pr-2">
                <!-- Timetable for the current day will be rendered here -->
            </div>
        </div>
    `;
}

function updateWizardTimetable() {
    const container = document.querySelector('.timetable-grid-container');
    if (!container) return;
    renderTimetableComponent(container, new Date(), [], wizardState.data, wizardState.data.currentDayIndex);
}

function showAddActivityModal(dayIndex, hour) {
    const dayNames = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[dayIndex];

    const content = `
        <div class="space-y-4">
            <select id="activity-type" class="w-full p-3 bg-gray-700 rounded border border-gray-600 text-white">
                <option value="Sport">Sport</option>
                <option value="Other">Other</option>
            </select>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                <input id="start-time" type="time" class="w-full p-2 bg-gray-700 rounded" value="${String(hour).padStart(2, '0')}:00">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                <input id="end-time" type="time" class="w-full p-2 bg-gray-700 rounded" value="${String(hour + 1).padStart(2, '0')}:00">
            </div>
        </div>
    `;

    showModal({
        title: 'Add Unavailable Time',
        content,
        buttons: [{ text: 'Add', class: 'primary', action: () => {
            const type = document.getElementById('activity-type').value;
            const start = document.getElementById('start-time').value;
            const end = document.getElementById('end-time').value;

            if (!wizardState.data.availability[dayName]) {
                wizardState.data.availability[dayName] = [];
            }
            wizardState.data.availability[dayName].push({ type, start, end });
            hideModal();
            updateWizardTimetable();
        }}]
    });
}

function showEditActivityModal(dayIndex, activityIndex) {
    const dayNames = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayName = dayNames[dayIndex];
    const activity = wizardState.data.availability[dayName][activityIndex];
    
    // School and Sleep activities are not editable this way
    if (activity.type === 'School' || activity.type === 'Sleep') {
        alert(`${activity.type} times can be edited using the "Set All" buttons.`);
        return;
    }

    const content = `
         <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                <input id="edit-start-time" type="time" class="w-full p-2 bg-gray-700 rounded" value="${activity.start}">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                <input id="edit-end-time" type="time" class="w-full p-2 bg-gray-700 rounded" value="${activity.end}">
            </div>
        </div>
    `;

     showModal({
        title: `Edit ${activity.type} Activity`,
        content,
        buttons: [
            { text: 'Delete', class: 'danger', action: () => {
                 wizardState.data.availability[dayName].splice(activityIndex, 1);
                 hideModal();
                 updateWizardTimetable();
            }},
            { text: 'Save', class: 'primary', action: () => {
                activity.start = document.getElementById('edit-start-time').value;
                activity.end = document.getElementById('edit-end-time').value;
                hideModal();
                updateWizardTimetable();
            }}
        ]
    });
}

function showSetAllTimesModal(activityType) {
    const dayNames = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let defaultStart = '08:00';
    let defaultEnd = '15:00';
    if (activityType === 'Sleep') {
        defaultStart = '22:00';
        defaultEnd = '06:00';
    }

    const content = `
        <p class="text-gray-400 mb-4">Set the start and end time for all "${activityType}" activities for the week.</p>
         <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">Start Time</label>
                <input id="set-all-start-time" type="time" class="w-full p-2 bg-gray-700 rounded" value="${defaultStart}">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-400 mb-1">End Time</label>
                <input id="set-all-end-time" type="time" class="w-full p-2 bg-gray-700 rounded" value="${defaultEnd}">
            </div>
        </div>
    `;

    showModal({
        title: `Set All ${activityType} Times`,
        content,
        buttons: [{ text: 'Apply to All', class: 'primary', action: () => {
            const start = document.getElementById('set-all-start-time').value;
            const end = document.getElementById('set-all-end-time').value;

            dayNames.forEach(dayName => {
                if (!wizardState.data.availability[dayName]) wizardState.data.availability[dayName] = [];
                // Remove existing activities of this type
                wizardState.data.availability[dayName] = wizardState.data.availability[dayName].filter(act => act.type !== activityType);
                // Add the new one, but skip weekends for School
                 if (activityType === 'School' && (dayName === 'friday' || dayName === 'saturday')) {
                    return; 
                }
                wizardState.data.availability[dayName].push({ type: activityType, start, end });
            });

            hideModal();
            updateWizardTimetable();
        }}]
    });
}


function wizardStep4() {
    return `
        <div class="text-center">
            <i class="fas fa-check-circle text-green-500 text-5xl mb-4"></i>
            <h3 class="text-2xl font-bold text-white">All Done!</h3>
            <p class="text-gray-400 mt-2">All the necessary information has been entered. Click "Finish" to save this student's profile.</p>
        </div>
    `;
}

