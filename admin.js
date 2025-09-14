// --- PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE ---
const firebaseConfig = {
    apiKey: "AIzaSyAsqOjRi548qQeZXZ9SQ7utkv_UoGIp56g",
    authDomain: "quizbuzz-472118.firebaseapp.com",
    projectId: "quizbuzz-472118",
    storageBucket: "quizbuzz-472118.firebasestorage.app",
    messagingSenderId: "86748554551",
    appId: "1:86748554551:web:9f895ff36ae0a41f1566b2",
    measurementId: "G-NY5N6B53N5"
};
// ---------------------------------------------------

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const categoryDashboard = document.getElementById('category-dashboard');
const categoryNameInput = document.getElementById('category-name');
const categoryColorInput = document.getElementById('category-color');
const categoryDescInput = document.getElementById('category-desc');
const addCategoryBtn = document.getElementById('add-category-btn');
const manageModal = document.getElementById('manage-category-modal');
const modalCategoryTitle = document.getElementById('modal-category-title');
const editCategoryName = document.getElementById('edit-category-name');
const editCategoryColor = document.getElementById('edit-category-color');
const editCategoryDesc = document.getElementById('edit-category-desc');
const saveMetaBtn = document.getElementById('save-meta-btn');
const deleteCategoryBtn = document.getElementById('delete-category-btn');
const questionEditor = document.getElementById('question-editor');
const closeModalBtn = document.getElementById('close-modal-btn');

const DIFFICULTY_LEVELS = [100, 200, 300, 400, 500];
let currentCategory = null;

// --- AUTHENTICATION ---
auth.onAuthStateChanged(user => {
    if (user) {
        loginScreen.classList.remove('active');
        dashboardScreen.classList.add('active');
        loadDashboard();
    } else {
        loginScreen.classList.add('active');
        dashboardScreen.classList.remove('active');
    }
});

loginBtn.addEventListener('click', () => {
    loginError.textContent = '';
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(err => loginError.textContent = err.message);
});
logoutBtn.addEventListener('click', () => auth.signOut());

// --- DASHBOARD LOGIC ---
async function loadDashboard() {
    categoryDashboard.innerHTML = '<h2>Loading Categories...</h2>';
    const snapshot = await db.collection('categories').get();
    if (snapshot.empty) {
        categoryDashboard.innerHTML = '<h2>No categories found. Create one below!</h2>';
        return;
    }

    categoryDashboard.innerHTML = '';
    snapshot.forEach(doc => {
        const category = { id: doc.id, ...doc.data() };
        const card = createCategoryCard(category);
        categoryDashboard.appendChild(card);
    });
}

function createCategoryCard(category) {
    const card = document.createElement('div');
    card.className = 'category-card';
    let completedCount = 0;
    const pointsBarHTML = DIFFICULTY_LEVELS.map(level => {
        if (category.questions && category.questions[level] && category.questions[level].length > 0) {
            completedCount++;
            return `<div class="point-indicator complete" title="${level} Points - Complete"></div>`;
        }
        return `<div class="point-indicator" title="${level} Points - Missing"></div>`;
    }).join('');

    card.innerHTML = `
        <div class="card-header">
            <h3>${category.name}</h3>
            <div class="card-color-preview" style="background-color: ${category.color};"></div>
        </div>
        <div class="completeness-tracker">
            <span class="completeness-label">Completeness: ${completedCount} / 5</span>
            <div class="points-bar">${pointsBarHTML}</div>
        </div>
        <div class="card-actions">
            <button class="btn btn-manage">Manage</button>
        </div>
    `;
    card.querySelector('.btn-manage').addEventListener('click', () => openManageModal(category));
    return card;
}

addCategoryBtn.addEventListener('click', async () => {
    const name = categoryNameInput.value.trim();
    const color = categoryColorInput.value.trim();
    const description = categoryDescInput.value.trim();
    if (!name || !color) return alert('Name and color are required.');

    await db.collection('categories').add({ name, color, description, questions: {} });
    categoryNameInput.value = '';
    categoryColorInput.value = '';
    categoryDescInput.value = '';
    loadDashboard();
});

// --- MODAL LOGIC ---
function openManageModal(category) {
    currentCategory = category;
    modalCategoryTitle.textContent = `Manage: ${category.name}`;
    editCategoryName.value = category.name;
    editCategoryColor.value = category.color;
    editCategoryDesc.value = category.description || '';

    saveMetaBtn.onclick = () => saveCategoryMeta(category.id);
    deleteCategoryBtn.onclick = () => deleteCategory(category.id);

    buildQuestionEditor();
    manageModal.classList.add('active');
}

function buildQuestionEditor() {
    questionEditor.innerHTML = '';
    DIFFICULTY_LEVELS.forEach(level => {
        const questionsArray = currentCategory.questions && currentCategory.questions[level] ? currentCategory.questions[level] : [];
        const section = document.createElement('div');
        section.className = 'difficulty-section';

        const existingQuestionsHTML = questionsArray.map(q => `
            <div class="existing-question-item" data-id="${q.id}">
                <p title="${q.text}">${q.text}</p>
                <div class="actions">
                    <button class="btn btn-secondary btn-delete-question">Delete</button>
                </div>
            </div>
        `).join('');

        section.innerHTML = `
            <h4>${level} Points (${questionsArray.length} question${questionsArray.length !== 1 ? 's' : ''})</h4>
            <div class="existing-questions-list">${existingQuestionsHTML || '<p>No questions yet for this level.</p>'}</div>
            <div class="add-question-form">
                <textarea placeholder="New Question Text"></textarea>
                <textarea placeholder="New Answer"></textarea>
                <button class="btn btn-add-question">Add Question</button>
            </div>
        `;

        const addBtn = section.querySelector('.btn-add-question');
        addBtn.addEventListener('click', () => {
            const text = addBtn.previousElementSibling.previousElementSibling;
            const answer = addBtn.previousElementSibling;
            addQuestion(level, text.value.trim(), answer.value.trim());
            text.value = '';
            answer.value = '';
        });

        section.querySelectorAll('.btn-delete-question').forEach(btn => {
            btn.addEventListener('click', () => {
                const questionId = btn.closest('.existing-question-item').dataset.id;
                deleteQuestion(level, questionId);
            });
        });

        questionEditor.appendChild(section);
    });
}

closeModalBtn.addEventListener('click', () => {
    manageModal.classList.remove('active');
    loadDashboard();
});

async function saveCategoryMeta(id) {
    const newName = editCategoryName.value.trim();
    const newColor = editCategoryColor.value.trim();
    const newDesc = editCategoryDesc.value.trim();
    if (!newName || !newColor) return alert('Name and color are required.');

    await db.collection('categories').doc(id).update({ name: newName, color: newColor, description: newDesc });
    modalCategoryTitle.textContent = `Manage: ${newName}`;
    alert('Category details updated!');
}

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this entire category?')) return;
    await db.collection('categories').doc(id).delete();
    manageModal.classList.remove('active');
    loadDashboard();
}

async function addQuestion(level, text, answer) {
    if (!text || !answer) return alert('Question and Answer cannot be empty.');
    const newQuestion = { id: Date.now().toString(), text, answer };
    await db.collection('categories').doc(currentCategory.id).update({
        [`questions.${level}`]: firebase.firestore.FieldValue.arrayUnion(newQuestion)
    });
    const doc = await db.collection('categories').doc(currentCategory.id).get();
    currentCategory = { id: doc.id, ...doc.data() };
    buildQuestionEditor();
}

async function deleteQuestion(level, questionId) {
    if (!confirm('Are you sure you want to delete this question?')) return;
    const questionToDelete = currentCategory.questions[level].find(q => q.id === questionId);
    if (questionToDelete) {
        await db.collection('categories').doc(currentCategory.id).update({
            [`questions.${level}`]: firebase.firestore.FieldValue.arrayRemove(questionToDelete)
        });
        const doc = await db.collection('categories').doc(currentCategory.id).get();
        currentCategory = { id: doc.id, ...doc.data() };
        buildQuestionEditor();
    }
}