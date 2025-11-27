import { appState, config } from '../config.js';
import { fetchTeacher, fetchParent, fetchTeacherSpecialties, fetchTimezones, fetchCurrencies } from '../api.js';
import { showLoadingOverlay, hideStatusOverlay } from './modals.js';

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

async function renderParentProfile() {
    const parentId = appState.currentUser.id;
    
    const [parent, timezones, currencies] = await Promise.all([
        fetchParent(parentId),
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
                    <button id="save-parent-profile-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-300">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function renderTeacherProfile() {
    // Fetch latest teacher data to ensure form is up to date
    const teacherId = appState.currentUser.id;
    
    const [teacher, specialties, timezones, currencies] = await Promise.all([
        fetchTeacher(teacherId),
        fetchTeacherSpecialties(teacherId),
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
                    <!-- TODO: Implement Update Password Feature -->
                </div>
            </div>
            <div class="mt-6 text-right">
                <button id="save-teacher-profile-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-md transition duration-300">
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
                <button class="delete-specialty-btn text-red-400 hover:text-red-300 p-2 rounded hover:bg-gray-600" data-id="${spec.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('')
        : '<p class="text-gray-400 text-center py-4">No specialties added yet.</p>';

    const specialtiesHTML = `
        <div class="bg-gray-800 p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-semibold text-indigo-300">Specialties</h3>
                <button id="open-add-specialty-modal-btn" class="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded-md">
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
