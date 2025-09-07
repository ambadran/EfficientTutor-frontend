import { config, appState } from '../config.js';
import { showModal, showInfoModal } from './modals.js';
import { renderTimetableComponent, wizardTimetableHandlers } from './timetable.js';

function wizardStep1(data) {
    // Now reads from top-level properties like data.firstName
    return `
        <div class="space-y-4">
            <input type="text" id="firstName" placeholder="First Name" value="${data.firstName || ''}" required class="w-full p-3 bg-gray-700 rounded-md border border-gray-600">
            <input type="text" id="lastName" placeholder="Last Name" value="${data.lastName || ''}" required class="w-full p-3 bg-gray-700 rounded-md border border-gray-600">
            <input type="text" id="grade" placeholder="Grade (e.g., 10)" value="${data.grade || ''}" required class="w-full p-3 bg-gray-700 rounded-md border border-gray-600">
        </div>`;
}

function wizardStep2(data) {
    const subjectOptions = config.subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    const otherStudents = appState.students.filter(s => s.id !== data.id);
    const registeredSubjectsHTML = data.subjects.map((subject, index) => {
        const sharedWithNames = subject.sharedWith
            .map(studentId => {
                const student = appState.students.find(s => s.id === studentId);
                // Reads from student.firstName
                return student ? student.firstName : '';
            })
            .filter(Boolean).join(', ');

        const dropdownOptions = otherStudents.length > 0 ? otherStudents.map(student => `
            <label class="flex items-center space-x-2 p-1 hover:bg-gray-600 rounded-md">
                <input type="checkbox" class="share-checkbox" data-subject-index="${index}" data-student-id="${student.id}" ${subject.sharedWith.includes(student.id) ? 'checked' : ''}>
                <span>${student.firstName} ${student.lastName}</span>
            </label>`).join('') : '<div class="px-2 py-1 text-sm text-gray-400">No other students to share with.</div>';

        return `
            <div class="bg-gray-700 p-2 rounded-md">
                <div class="flex justify-between items-center">
                    <div>
                        <p>${subject.name} - ${subject.lessonsPerWeek} lessons/week</p>
                        ${sharedWithNames ? `<p class="text-xs text-indigo-300">Shared with: ${sharedWithNames}</p>` : ''}
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="relative share-container">
                            <button class="share-btn p-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-md"><i class="fas fa-users mr-1"></i> Allowed Others</button>
                            <div class="share-dropdown hidden absolute right-0 mt-1 w-48">${dropdownOptions}</div>
                        </div>
                        <button class="remove-subject-btn text-red-400 hover:text-red-300" data-index="${index}"><i class="fas fa-times-circle"></i></button>
                    </div>
                </div>
            </div>`;
    }).join('');

    return `
        <div id="registered-subjects-list" class="space-y-2 mb-4">${registeredSubjectsHTML || '<p class="text-sm text-gray-400">No subjects added yet.</p>'}</div>
        <div class="flex space-x-2">
            <select id="subject-select" class="flex-grow p-2 bg-gray-700 rounded-md border border-gray-600">${subjectOptions}</select>
            <input type="number" id="lessons-per-week" placeholder="Lessons/wk" min="1" value="1" class="w-28 p-2 bg-gray-700 rounded-md border border-gray-600">
            <button id="add-subject-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold p-2 rounded-md"><i class="fas fa-plus"></i> Add</button>
        </div>`;
}

function wizardStep3(data) {
    return `<div id="wizard-timetable-container">${renderTimetableComponent(true, data)}</div>`;
}

function wizardStep4() {
    return `
        <div class="text-center py-8">
            <i class="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
            <h3 class="text-2xl font-semibold">All Set!</h3>
            <p class="text-gray-400 mt-2">All student information has been entered. Click Finish to save.</p>
        </div>`;
}

function validateStep(step, data, modal) {
    if (step === 1) {
        const firstName = modal.querySelector('#firstName').value.trim();
        const lastName = modal.querySelector('#lastName').value.trim();
        const grade = modal.querySelector('#grade').value.trim();
        if (!firstName || !lastName || !grade) {
            showInfoModal('Validation Error', '<p>Please fill in all fields.</p>');
            return false;
        }
        // Save as flat properties, not nested in basicInfo
        data.firstName = firstName;
        data.lastName = lastName;
        data.grade = grade;
    }
    return true;
}

export function showStudentRegistrationWizard(studentToEdit = null, onFinish) {
    let step = 1;
    // The data object starts flat
    let registrationData = studentToEdit ? JSON.parse(JSON.stringify(studentToEdit)) : {
        id: crypto.randomUUID(),
        subjects: [],
        availability: {}
    };

    if (!studentToEdit) {
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
        config.daysOfWeek.forEach(day => {
            const dayKey = day.toLowerCase();
            registrationData.availability[dayKey] = [];
            registrationData.availability[dayKey].push({ type: 'sleep', ...config.defaultSleepTimes });
            if (weekdays.includes(day)) {
                registrationData.availability[dayKey].push({ type: 'school', ...config.defaultSchoolTimes });
            }
        });
    }

    const renderCurrentStep = () => {
        let bodyContent = '', footerContent = '';
        switch (step) {
            case 1:
                bodyContent = wizardStep1(registrationData);
                footerContent = `<div class="flex justify-end"><button id="wizard-next-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Next</button></div>`;
                break;
            case 2:
                bodyContent = wizardStep2(registrationData);
                footerContent = `<div class="flex justify-between"><button id="wizard-prev-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Back</button><button id="wizard-next-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Next</button></div>`;
                break;
            case 3:
                bodyContent = wizardStep3(registrationData);
                footerContent = `<div class="flex justify-between"><button id="wizard-prev-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Back</button><button id="wizard-next-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md">Next</button></div>`;
                break;
            case 4:
                bodyContent = wizardStep4();
                footerContent = `<div class="flex justify-between"><button id="wizard-prev-btn" class="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-md">Back</button><button id="wizard-finish-btn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-md">Finish</button></div>`;
                break;
        }
        showModal(`Student Registration - Step ${step} of 4`, bodyContent, footerContent, (modal) => attachWizardListeners(modal, registrationData));
    };

    const attachWizardListeners = (modal, data) => {
        modal.addEventListener('click', async (e) => {
            const target = e.target;
            const closest = (selector) => target.closest(selector);

            if (closest('#wizard-next-btn')) {
                if (validateStep(step, data, modal)) {
                    step++;
                    renderCurrentStep();
                }
            } else if (closest('#wizard-prev-btn')) {
                step--;
                renderCurrentStep();
            } else if (closest('#wizard-finish-btn')) {
                await onFinish(data);
            }

            if (step === 2) {
                if (closest('#add-subject-btn')) {
                    const name = modal.querySelector('#subject-select').value;
                    const lessons = parseInt(modal.querySelector('#lessons-per-week').value);
                    if (lessons > 0 && !data.subjects.find(s => s.name === name)) {
                        data.subjects.push({ name: name, lessonsPerWeek: lessons, sharedWith: [] });
                        renderCurrentStep();
                    }
                }
                const removeBtn = closest('.remove-subject-btn');
                if (removeBtn) {
                    data.subjects.splice(parseInt(removeBtn.dataset.index), 1);
                    renderCurrentStep();
                }
                const shareBtn = closest('.share-btn');
                if (shareBtn) {
                    const dropdown = shareBtn.nextElementSibling;
                    const isHidden = dropdown.classList.contains('hidden');
                    document.querySelectorAll('.share-dropdown').forEach(el => el.classList.add('hidden'));
                    if (isHidden) dropdown.classList.remove('hidden');
                }
            }
            
            if (step === 3) {
                const dayNavBtn = closest('.day-nav-btn');
                if (dayNavBtn) {
                    appState.currentTimetableDay = (appState.currentTimetableDay + parseInt(dayNavBtn.dataset.direction) + 7) % 7;
                    renderCurrentStep();
                }
                const updateWizardTimetable = () => {
                    const container = modal.querySelector('#wizard-timetable-container');
                    if (container) container.innerHTML = renderTimetableComponent(true, data);
                };
                const grid = closest('#timetable-grid-main');
                if (grid && e.target === grid) {
                    wizardTimetableHandlers.showAddEventModal(data, grid.dataset.dayKey, e.offsetY, updateWizardTimetable);
                }
                const bubble = closest('.event-bubble');
                if (bubble && bubble.dataset.type !== 'tuition') {
                    wizardTimetableHandlers.showEditEventModal(data, grid.dataset.dayKey, bubble.dataset.start, updateWizardTimetable);
                }
                const setAllBtn = closest('.set-all-times-btn');
                if (setAllBtn) {
                    const type = setAllBtn.dataset.type;
                    wizardTimetableHandlers.showSetAllTimesModal(data, type, updateWizardTimetable);
                }
            }
        });

        modal.addEventListener('change', (e) => {
            const target = e.target;
            const closest = (selector) => target.closest(selector);
            const shareCheckbox = closest('.share-checkbox');
            if (shareCheckbox) {
                const subjectIndex = parseInt(shareCheckbox.dataset.subjectIndex);
                const studentId = shareCheckbox.dataset.studentId;
                const sharedWith = data.subjects[subjectIndex].sharedWith;
                if (shareCheckbox.checked) {
                    if (!sharedWith.includes(studentId)) sharedWith.push(studentId);
                } else {
                    const indexToRemove = sharedWith.indexOf(studentId);
                    if (indexToRemove > -1) sharedWith.splice(indexToRemove, 1);
                }
                renderCurrentStep();
            }
        });
    };

    renderCurrentStep();
}
