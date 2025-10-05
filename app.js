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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const playerCountInput = document.getElementById('player-count');
const playerNamesContainer = document.getElementById('player-names-container');
const mainCategoryView = document.getElementById('main-category-view');
const mainCategorySelection = document.getElementById('main-category-selection');
const subCategoryView = document.getElementById('sub-category-view');
const backToMainBtn = document.getElementById('back-to-main-btn');
const categorySelection = document.getElementById('category-selection');
const selectionsContainer = document.getElementById('selections-container');
const startGameBtn = document.getElementById('start-game-btn');
const gameBoard = document.getElementById('game-board');
const turnIndicator = document.getElementById('turn-indicator');
const scoreboardPlayers = document.getElementById('scoreboard-players');
const modalOverlay = document.getElementById('question-modal-overlay');
const questionCard = document.getElementById('question-card');
const questionText = document.getElementById('question-text');
const questionPointsEl = document.getElementById('question-points');
const answerText = document.getElementById('answer-text');
const revealAnswerBtn = document.getElementById('reveal-answer-btn');
const playerScoringContainer = document.getElementById('player-scoring-container');
const noAnswerBtn = document.getElementById('no-answer-btn');
const gameOverModal = document.getElementById('game-over-modal');
const winnerAnnouncement = document.getElementById('winner-announcement');
const finalScores = document.getElementById('final-scores');
const playAgainBtn = document.getElementById('play-again-btn');

let players = [];
let allCategories = [];
let selectedCategories = [];
let gameCategories = [];
let currentTurn = 0;
let currentQuestion = null;
const DIFFICULTY_LEVELS = [100, 200, 300, 400, 500];

playerCountInput.addEventListener('change', () => {
    const count = playerCountInput.value;
    playerNamesContainer.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Player ${i} Identifier`;
        playerNamesContainer.appendChild(input);
    }
});
playerCountInput.dispatchEvent(new Event('change'));

async function loadMainCategories() {
    const snapshot = await db.collection('categories').get();
    allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const mainCategories = [...new Set(allCategories.map(cat => cat.mainCategory).filter(Boolean))];
    mainCategorySelection.innerHTML = '';
    mainCategories.forEach(mainCat => {
        const button = document.createElement('button');
        button.className = 'btn-start-game main-category-btn';
        button.textContent = mainCat;
        button.onclick = () => showSubCategories(mainCat);
        mainCategorySelection.appendChild(button);
    });
}

function showSubCategories(mainCatName) {
    const subCategories = allCategories.filter(cat => cat.mainCategory === mainCatName);
    categorySelection.innerHTML = '';
    subCategories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `<input type="checkbox" id="${category.id}" value="${category.name}"><h3>${category.name}</h3><p>${category.description || 'No description.'}</p>`;
        if (selectedCategories.find(sc => sc.id === category.id)) {
            card.classList.add('selected');
            card.querySelector('input').checked = true;
        }
        card.addEventListener('click', () => {
            const isSelected = card.classList.contains('selected');
            if (!isSelected && selectedCategories.length >= 5) {
                alert("SYSTEM LIMIT: 5 DATA MODULES MAX."); return;
            }
            card.classList.toggle('selected');
            card.querySelector('input').checked = !isSelected;
            if (!isSelected) { selectedCategories.push(category); } 
            else { selectedCategories = selectedCategories.filter(sc => sc.id !== category.id); }
            updateSelectionsSidebar();
        });
        categorySelection.appendChild(card);
    });
    mainCategoryView.classList.add('hidden');
    subCategoryView.classList.remove('hidden');
}

function updateSelectionsSidebar() {
    if (selectedCategories.length === 0) {
        selectionsContainer.innerHTML = '<p class="selections-placeholder">Select up to 5 sub-modules.</p>'; return;
    }
    selectionsContainer.innerHTML = '';
    selectedCategories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'selection-item';
        item.innerHTML = `<span>${cat.name}</span><button class="remove-btn" data-id="${cat.id}">&times;</button>`;
        selectionsContainer.appendChild(item);
    });
    selectionsContainer.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = (e) => {
            const categoryId = e.target.dataset.id;
            const cardCheckbox = document.getElementById(categoryId);
            if (cardCheckbox) cardCheckbox.closest('.category-card').click();
        };
    });
}

backToMainBtn.addEventListener('click', () => {
    subCategoryView.classList.add('hidden');
    mainCategoryView.classList.remove('hidden');
});

startGameBtn.addEventListener('click', async () => {
    players = Array.from(document.querySelectorAll('#player-names-container input')).map((input, i) => ({ name: input.value || `Player ${i + 1}`, score: 0 }));
    if (selectedCategories.length !== 5) { alert('Please select exactly 5 sub-categories.'); return; }
    
    gameCategories = [];
    for (const category of selectedCategories) {
        const processedCategory = { ...category, questions: {} };
        let isComplete = true;
        for (const level of DIFFICULTY_LEVELS) {
            const questionPool = category.questions[level];
            if (!questionPool || questionPool.length === 0) { isComplete = false; break; }
            const randomIndex = Math.floor(Math.random() * questionPool.length);
            processedCategory.questions[level] = questionPool[randomIndex];
        }
        if (!isComplete) { alert(`The category "${category.name}" is missing questions. Please complete it in the admin panel.`); return; }
        gameCategories.push(processedCategory);
    }
    
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
    currentTurn = Math.floor(Math.random() * players.length);
    buildGameBoard();
    updateScoreboard();
});

function buildGameBoard() {
    gameBoard.innerHTML = '';
    gameCategories.forEach((category, index) => {
        const column = document.createElement('div');
        column.className = `category-column category-${index + 1}`;
        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = category.name;
        column.appendChild(header);
        DIFFICULTY_LEVELS.forEach(level => {
            const q = category.questions[level]; q.points = level;
            const panel = document.createElement('button');
            panel.className = 'question-panel'; panel.textContent = level;
            panel.addEventListener('click', () => showQuestion(q, panel), { once: true });
            column.appendChild(panel);
        });
        gameBoard.appendChild(column);
    });
}

function updateScoreboard() {
    scoreboardPlayers.innerHTML = '';
    players.forEach((player, index) => {
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'player-score';
        if (index === currentTurn) scoreDiv.classList.add('active');
        scoreDiv.innerHTML = `<span class="player-name">${player.name}</span><span class="score-value">${player.score}</span>`;
        scoreboardPlayers.appendChild(scoreDiv);
    });
    turnIndicator.textContent = `ACTIVE PLAYER: ${players[currentTurn].name}`;
}

function showQuestion(question, panel) {
    currentQuestion = question;
    questionText.textContent = question.text;
    questionPointsEl.textContent = `${question.points} POINTS`;
    answerText.textContent = question.answer;
    questionCard.classList.remove('is-flipped');
    modalOverlay.classList.add('active');
    panel.classList.add('disabled');
    panel.textContent = '';
}

revealAnswerBtn.addEventListener('click', () => {
    questionCard.classList.add('is-flipped');
    buildScoringControls();
});

function buildScoringControls() {
    playerScoringContainer.innerHTML = '';
    players.forEach((player, index) => {
        const controlBtn = document.createElement('button');
        controlBtn.className = 'btn'; controlBtn.textContent = player.name;
        controlBtn.onclick = () => {
            const isCorrect = confirm(`Did ${player.name} answer correctly?`);
            awardPoints(index, isCorrect);
        };
        playerScoringContainer.appendChild(controlBtn);
    });
}

noAnswerBtn.addEventListener('click', () => closeModal());

function awardPoints(playerIndex, isCorrect) {
    const points = currentQuestion.points;
    if (isCorrect) { players[playerIndex].score += points; currentTurn = playerIndex; } 
    else { players[playerIndex].score -= points; }
    closeModal();
}

function closeModal() {
    modalOverlay.classList.remove('active');
    updateScoreboard();
    if (document.querySelectorAll('.question-panel:not(.disabled)').length === 0) endGame();
}

function endGame() {
    const highestScore = Math.max(...players.map(p => p.score));
    const winners = players.filter(p => p.score === highestScore);
    if (winners.length === 1) { winnerAnnouncement.textContent = `SYSTEM VICTOR: ${winners[0].name}`; } 
    else { winnerAnnouncement.textContent = `VICTORY SHARED: ${winners.map(w => w.name).join(' & ')}`; }
    finalScores.innerHTML = '';
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    sortedPlayers.forEach(player => {
        const scoreItem = document.createElement('div');
        scoreItem.className = 'final-score-item';
        scoreItem.innerHTML = `${player.name}: <span>${player.score}</span>`;
        finalScores.appendChild(scoreItem);
    });
    gameOverModal.classList.add('active');
}

playAgainBtn.addEventListener('click', () => window.location.reload());

loadMainCategories();
updateSelectionsSidebar();