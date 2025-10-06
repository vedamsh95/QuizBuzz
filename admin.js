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

// Initialize Firebase ONCE
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// This wrapper waits for the HTML to be fully loaded before running any code
document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const loginScreen = document.getElementById('login-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');
    const importBtn = document.getElementById('import-btn');
    const jsonUpload = document.getElementById('json-upload');
    const importStatus = document.getElementById('import-status');
    const categoryDashboard = document.getElementById('category-dashboard');
    const addCategoryBtn = document.getElementById('add-category-btn');
    const manageModal = document.getElementById('manage-category-modal');
    const modalCategoryTitle = document.getElementById('modal-category-title');
    const editCategoryName = document.getElementById('edit-sub-category-name');
    const editCategoryColor = document.getElementById('edit-sub-category-color');
    const editCategoryDesc = document.getElementById('edit-sub-category-desc');
    const editMainCategory = document.getElementById('edit-main-category-name');
    const saveMetaBtn = document.getElementById('save-meta-btn');
    const deleteCategoryBtn = document.getElementById('delete-category-btn');
    const questionEditor = document.getElementById('question-editor');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const showSyntaxBtn = document.getElementById('show-syntax-btn');
    const syntaxModal = document.getElementById('syntax-modal');
    const closeSyntaxBtn = document.getElementById('close-syntax-btn');
    const copySyntaxBtn = document.getElementById('copy-syntax-btn');
    const syntaxExampleCode = document.getElementById('syntax-example');
    
    // --- State Variables ---
    const DIFFICULTY_LEVELS = [100, 200, 300, 400, 500];
    let currentCategory = null;

    // --- Central Authentication Handler ---
    auth.onAuthStateChanged(user => {
        if (user) {
            dashboardScreen.classList.remove('hidden');
            dashboardScreen.classList.add('active');
            loginScreen.classList.remove('active');
            loginScreen.classList.add('hidden');
            runDashboardLogic();
        } else {
            loginScreen.classList.remove('hidden');
            loginScreen.classList.add('active');
            dashboardScreen.classList.remove('active');
            dashboardScreen.classList.add('hidden');
        }
    });

    // --- Login Screen Logic ---
    loginBtn.addEventListener('click', () => {
        loginError.textContent = '';
        auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
            .catch(err => loginError.textContent = err.message);
    });
    
    // --- Dashboard Screen Logic ---
    function runDashboardLogic() {
        // ONE-TIME EVENT LISTENERS
        logoutBtn.addEventListener('click', () => auth.signOut());
        importBtn.addEventListener('click', handleJsonImport);
        addCategoryBtn.addEventListener('click', handleAddCategory);
        closeModalBtn.addEventListener('click', () => { manageModal.classList.remove('active'); loadDashboard(); });
        showSyntaxBtn.addEventListener('click', () => syntaxModal.classList.add('active'));
        closeSyntaxBtn.addEventListener('click', () => syntaxModal.classList.remove('active'));
        syntaxModal.addEventListener('click', (e) => { if (e.target === syntaxModal) syntaxModal.classList.remove('active'); });
        copySyntaxBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(syntaxExampleCode.textContent.trim());
            copySyntaxBtn.textContent = 'Copied!';
            setTimeout(() => { copySyntaxBtn.textContent = 'Copy'; }, 2000);
        });

        // --- FUNCTIONS ---
        async function handleJsonImport() {
            const file = jsonUpload.files[0];
            if (!file) { alert('Please select a JSON file.'); return; }
            const reader = new FileReader();
            reader.onload = async (event) => {
                importStatus.className = '';
                importStatus.textContent = 'Reading file...';
                try {
                    const data = JSON.parse(event.target.result);
                    if (!Array.isArray(data)) throw new Error('JSON data must be an array.');
                    importStatus.textContent = `Found ${data.length} categories. Importing...\n`;
                    for (const catData of data) {
                        if (!catData.mainCategory || !catData.subCategoryName) { importStatus.textContent += `\nSkipping invalid entry.`; continue; }
                        const query = await db.collection('categories').where('name', '==', catData.subCategoryName).limit(1).get();
                        if (!query.empty) { importStatus.textContent += `\nSkipping existing: ${catData.subCategoryName}`; continue; }
                        await db.collection('categories').add({ mainCategory: catData.mainCategory, name: catData.subCategoryName, color: catData.subCategoryColor || '#cccccc', description: catData.subCategoryDescription || '', questions: catData.questions || {} });
                        importStatus.textContent += `\nImported: ${catData.mainCategory} > ${catData.subCategoryName}`;
                    }
                    importStatus.textContent += '\n\nImport complete!';
                    loadDashboard();
                } catch (error) {
                    importStatus.textContent = `Error: ${error.message}`; importStatus.classList.add('error');
                }
            };
            reader.readAsText(file);
        }
        
        async function loadDashboard() {
            const categoryDashboardContainer = document.getElementById('category-dashboard');
            categoryDashboardContainer.innerHTML = '<h2>Loading Categories...</h2>';
            try {
                // THIS IS THE FIX: Removed the complex .orderBy() which required a manual index.
                const snapshot = await db.collection('categories').get();
                
                if (snapshot.empty) { 
                    categoryDashboardContainer.innerHTML = '<h2>No categories found. Use the form below to add one.</h2>'; 
                    return; 
                }

                const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort categories in JavaScript instead of in the query
                categories.sort((a, b) => {
                    if (a.mainCategory < b.mainCategory) return -1;
                    if (a.mainCategory > b.mainCategory) return 1;
                    if (a.name < b.name) return -1;
                    if (a.name > b.name) return 1;
                    return 0;
                });

                const groupedCategories = categories.reduce((acc, category) => {
                    const mainCat = category.mainCategory || 'Uncategorized';
                    if (!acc[mainCat]) acc[mainCat] = [];
                    acc[mainCat].push(category);
                    return acc;
                }, {});

                categoryDashboardContainer.innerHTML = '<h2>Existing Categories</h2>'; // Reset title
                for (const mainCategoryName in groupedCategories) {
                    const groupContainer = document.createElement('div');
                    groupContainer.className = 'main-category-group';
                    const title = document.createElement('h3');
                    title.className = 'main-category-title';
                    title.textContent = mainCategoryName;
                    groupContainer.appendChild(title);
                    const grid = document.createElement('div');
                    grid.className = 'sub-category-grid';
                    groupedCategories[mainCategoryName].forEach(category => {
                        const card = createCategoryCard(category);
                        grid.appendChild(card);
                    });
                    groupContainer.appendChild(grid);
                    categoryDashboardContainer.appendChild(groupContainer);
                }
            } catch (error) {
                console.error("Error loading dashboard:", error);
                categoryDashboardContainer.innerHTML = `<h2 style="color:red;">Error loading categories. Please check the browser console (F12) for details.</h2>`;
            }
        }

        function createCategoryCard(category) {
            const card = document.createElement('div');
            card.className = 'category-card';
            let completedCount = 0;
            const pointsBarHTML = DIFFICULTY_LEVELS.map(level => {
                if (category.questions && category.questions[level] && category.questions[level].length > 0) { completedCount++; return `<div class="point-indicator complete"></div>`; }
                return `<div class="point-indicator"></div>`;
            }).join('');
            card.innerHTML = `<div class="card-header"><h3>${category.name}</h3><div class="card-color-preview" style="background-color: ${category.color};"></div></div><div class="completeness-tracker"><span class="completeness-label">${category.mainCategory || 'N/A'} | ${completedCount} / 5 Levels</span><div class="points-bar">${pointsBarHTML}</div></div><div class="card-actions"><button class="btn btn-manage">Manage</button></div>`;
            card.querySelector('.btn-manage').addEventListener('click', () => openManageModal(category));
            return card;
        }

        async function handleAddCategory() {
            const name = document.getElementById('sub-category-name').value.trim();
            const color = document.getElementById('sub-category-color').value.trim();
            const description = document.getElementById('sub-category-desc').value.trim();
            const mainCategory = document.getElementById('main-category-name').value.trim();
            if (!name || !color || !mainCategory) { alert('All fields are required.'); return; }
            await db.collection('categories').add({ name, color, description, mainCategory, questions: {} });
            loadDashboard();
        }

        function openManageModal(category) {
            currentCategory = category;
            modalCategoryTitle.textContent = `Manage: ${category.name}`;
            editCategoryName.value = category.name;
            editCategoryColor.value = category.color;
            editCategoryDesc.value = category.description || '';
            editMainCategory.value = category.mainCategory || '';
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
                const existingQuestionsHTML = questionsArray.map(q => `<div class="existing-question-item" data-id="${q.id}"><p title="${q.text}">${q.text}</p><div class="actions"><button class="btn btn-secondary btn-edit-question">Edit</button><button class="btn btn-danger btn-delete-question">Delete</button></div></div>`).join('');
                section.innerHTML = `<h4>${level} Points (${questionsArray.length})</h4><div class="existing-questions-list">${existingQuestionsHTML || '<p>No questions yet.</p>'}</div><div class="add-question-form"><textarea placeholder="New Question"></textarea><textarea placeholder="New Answer"></textarea><button class="btn btn-add-question">Add Question</button></div>`;
                const addBtn = section.querySelector('.btn-add-question');
                addBtn.addEventListener('click', () => {
                    const text = addBtn.previousElementSibling.previousElementSibling; const answer = addBtn.previousElementSibling;
                    addQuestion(level, text.value.trim(), answer.value.trim()); text.value = ''; answer.value = '';
                });
                section.querySelectorAll('.btn-delete-question').forEach(btn => btn.addEventListener('click', (e) => deleteQuestion(level, e.target.closest('.existing-question-item').dataset.id)));
                section.querySelectorAll('.btn-edit-question').forEach(btn => btn.addEventListener('click', (e) => editQuestion(level, e.target.closest('.existing-question-item').dataset.id)));
                questionEditor.appendChild(section);
            });
        }
        
        async function saveCategoryMeta(id) {
            const newName = editCategoryName.value.trim(); const newColor = editCategoryColor.value.trim();
            const newDesc = editCategoryDesc.value.trim(); const newMainCategory = editMainCategory.value.trim();
            if (!newName || !newColor || !newMainCategory) return alert('All details are required.');
            await db.collection('categories').doc(id).update({ name: newName, color: newColor, description: newDesc, mainCategory: newMainCategory });
            modalCategoryTitle.textContent = `Manage: ${newName}`; alert('Details updated!');
        }

        async function deleteCategory(id) {
            if (!confirm('PERMANENTLY delete this entire category?')) return;
            await db.collection('categories').doc(id).delete();
            manageModal.classList.remove('active'); loadDashboard();
        }

        async function addQuestion(level, text, answer) {
            if (!text || !answer) return alert('Question and Answer are required.');
            const newQuestion = { id: Date.now().toString(), text, answer };
            await db.collection('categories').doc(currentCategory.id).update({ [`questions.${level}`]: firebase.firestore.FieldValue.arrayUnion(newQuestion) });
            const doc = await db.collection('categories').doc(currentCategory.id).get();
            currentCategory = { id: doc.id, ...doc.data() }; buildQuestionEditor();
        }

        async function deleteQuestion(level, questionId) {
            if (!confirm('Delete this question?')) return;
            const questionToDelete = currentCategory.questions[level].find(q => q.id === questionId);
            if (questionToDelete) {
                await db.collection('categories').doc(currentCategory.id).update({ [`questions.${level}`]: firebase.firestore.FieldValue.arrayRemove(questionToDelete) });
                const doc = await db.collection('categories').doc(currentCategory.id).get();
                currentCategory = { id: doc.id, ...doc.data() }; buildQuestionEditor();
            }
        }

        function editQuestion(level, questionId) {
            const questionToEdit = currentCategory.questions[level].find(q => q.id === questionId);
            const newText = prompt("Edit question:", questionToEdit.text);
            if (newText === null) return;
            const newAnswer = prompt("Edit answer:", questionToEdit.answer);
            if (newAnswer === null) return;
            const updatedQuestion = { ...questionToEdit, text: newText.trim(), answer: newAnswer.trim() };
            const updatedArray = currentCategory.questions[level].map(q => q.id === questionId ? updatedQuestion : q);
            db.collection('categories').doc(currentCategory.id).update({ [`questions.${level}`]: updatedArray }).then(async () => {
                const doc = await db.collection('categories').doc(currentCategory.id).get();
                currentCategory = { id: doc.id, ...doc.data() }; buildQuestionEditor();
            });
        }
        
        // Initial call to load content when dashboard is shown
        loadDashboard();
    }
});