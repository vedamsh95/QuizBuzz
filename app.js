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
const db = firebase.firestore();

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const playerCountInput = document.getElementById('player-count');
const playerNamesContainer = document.getElementById('player-names-container');
const categorySelection = document.getElementById('category-selection');
const startGameBtn = document.getElementById('start-game-btn');

const scoreboardContainer = document.getElementById('scoreboard-container');
const scoreboardToggle = document.getElementById('scoreboard-toggle');
const scoreboardPlayers = document.getElementById('scoreboard-players');
const gameBoard = document.getElementById('game-board');
const turnIndicator = document.getElementById('turn-indicator');

const modalOverlay = document.getElementById('question-modal-overlay');
const questionCard = document.getElementById('question-card');
const questionText = document.getElementById('question-text');
const questionPointsEl = document.getElementById('question-points');
const answerText = document.getElementById('answer-text');
const revealAnswerBtn = document.getElementById('reveal-answer-btn');
const playerScoringContainer = document.getElementById('player-scoring-container');
const noAnswerBtn = document.getElementById('no-answer-btn');
const feedbackOverlay = document.getElementById('feedback-overlay');

// Game State
let players = [];
let allCategories = [];
// This is the main change: gameQuestions is now an array of full category objects
let gameCategories = []; 
let currentTurn = 0;
let currentQuestion = null;
const VIBRANT_COLORS = ['#E249A4', '#219EBC', '#FB8500', '#A2FF00', '#9944FF'];
const DIFFICULTY_LEVELS = [100, 200, 300, 400, 500];
// --- SETUP PHASE ---

playerCountInput.addEventListener('change', () => {
    const count = playerCountInput.value;
    playerNamesContainer.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Player ${i} Name`;
        input.id = `player-name-${i}`;
        playerNamesContainer.appendChild(input);
    }
});
playerCountInput.dispatchEvent(new Event('change'));

async function loadCategories() {
    const snapshot = await db.collection('categories').get();
    allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    categorySelection.innerHTML = '';
    allCategories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <input type="checkbox" id="${category.id}" value="${category.name}">
            <h3>${category.name}</h3>
        `;
        card.addEventListener('click', () => {
            const checkbox = card.querySelector('input');
            const selectedCards = document.querySelectorAll('.category-card.selected').length;
            
            if (!card.classList.contains('selected') && selectedCards >= 5) {
                alert("You can only select 5 categories.");
                return;
            }
            card.classList.toggle('selected');
            checkbox.checked = card.classList.contains('selected');
        });
        categorySelection.appendChild(card);
    });
}

// --- GAME START ---

startGameBtn.addEventListener('click', async () => {
    players = Array.from(document.querySelectorAll('#player-names-container input')).map((input, i) => ({
        name: input.value || `Player ${i + 1}`,
        score: 0
    }));

    const selectedCheckboxes = document.querySelectorAll('.category-card.selected input');
    if (selectedCheckboxes.length !== 5) {
        alert('Please select exactly 5 categories.');
        return;
    }
    const selectedCategoryNames = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    const snapshot = await db.collection('categories').where('name', 'in', selectedCategoryNames).get();
    const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // *** NEW: Process categories to select ONE random question per difficulty ***
    gameCategories = [];
    for (const category of fetchedCategories) {
        const processedCategory = { ...category, questions: {} };
        let isComplete = true;

        for (const level of DIFFICULTY_LEVELS) {
            const questionPool = category.questions[level];
            if (!questionPool || questionPool.length === 0) {
                isComplete = false;
                break; // Exit if any difficulty level has no questions
            }
            // Select one random question from the pool
            const randomIndex = Math.floor(Math.random() * questionPool.length);
            processedCategory.questions[level] = questionPool[randomIndex];
        }

        if (!isComplete) {
            alert(`The category "${category.name}" is missing questions for one or more difficulty levels. Please complete it in the admin panel.`);
            return; // Stop the game from starting
        }
        gameCategories.push(processedCategory);
    }
    
    setupScreen.classList.remove('active');
    gameScreen.classList.add('active');
    currentTurn = Math.floor(Math.random() * players.length);
    
    buildGameBoard();
    updateScoreboard();
});


// --- GAMEPLAY ---

function buildGameBoard() {
    gameBoard.innerHTML = '';

    gameCategories.forEach((category, index) => {
        const column = document.createElement('div');
        column.className = 'category-column';

        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = category.name;
        header.style.backgroundColor = VIBRANT_COLORS[index % VIBRANT_COLORS.length];
        column.appendChild(header);
        
        // Loop through difficulty levels to ensure order
        DIFFICULTY_LEVELS.forEach((level, qIndex) => {
            // Get the question for the specific level from our new structure
            const q = category.questions[level];
            q.points = level; // Add points to the object for later use

            const button = document.createElement('button');
            button.className = 'question-btn';
            button.textContent = level;
            
            const baseColor = VIBRANT_COLORS[index % VIBRANT_COLORS.length];
            const lightness = 90 - (qIndex * 10);
            button.style.background = `linear-gradient(180deg, ${adjustColor(baseColor, 20)} ${lightness-20}%, ${baseColor} ${lightness}%)`;

            button.addEventListener('click', () => showQuestion(q, button), { once: true });
            column.appendChild(button);
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
    turnIndicator.textContent = `${players[currentTurn].name}'s Turn to Choose`;
}

function showQuestion(question, button) {
    currentQuestion = question;
    questionText.textContent = question.text;
    questionPointsEl.textContent = `${question.points} Points`;
    answerText.textContent = question.answer;

    questionCard.classList.remove('is-flipped');
    modalOverlay.classList.add('active');
    button.classList.add('disabled');
    button.textContent = '';
}

revealAnswerBtn.addEventListener('click', () => {
    questionCard.classList.add('is-flipped');
    buildScoringControls();
});

function buildScoringControls() {
    playerScoringContainer.innerHTML = '';
    players.forEach((player, index) => {
        const controlDiv = document.createElement('div');
        controlDiv.className = 'player-control';
        controlDiv.innerHTML = `
            <span class="player-name">${player.name}</span>
            <button class="control-btn btn-correct" data-player="${index}" data-correct="true">+</button>
            <button class="control-btn btn-incorrect" data-player="${index}" data-correct="false">-</button>
        `;
        playerScoringContainer.appendChild(controlDiv);
    });
}

playerScoringContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('control-btn')) {
        const playerIndex = parseInt(e.target.dataset.player);
        const isCorrect = e.target.dataset.correct === 'true';
        awardPoints(playerIndex, isCorrect);
    }
});

noAnswerBtn.addEventListener('click', () => closeModal());

function awardPoints(playerIndex, isCorrect) {
    const points = currentQuestion.points;
    if (isCorrect) {
        players[playerIndex].score += points;
        currentTurn = playerIndex;
        showFeedback(true);
    } else {
        players[playerIndex].score -= points;
        showFeedback(false);
    }
    closeModal();
}

function showFeedback(isCorrect) {
    feedbackOverlay.className = isCorrect ? 'correct' : 'incorrect';
    setTimeout(() => { feedbackOverlay.className = ''; }, 500);
}

function closeModal() {
    modalOverlay.classList.remove('active');
    updateScoreboard();
    if (document.querySelectorAll('.question-btn:not(.disabled)').length === 0) {
        endGame();
    }
}

function endGame() {
    const winner = players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    turnIndicator.textContent = `Game Over! ${winner.name} wins with ${winner.score} points!`;
}

// --- UTILITY & MISC EVENT LISTENERS ---
scoreboardToggle.addEventListener('click', () => {
    scoreboardContainer.classList.toggle('scoreboard-hidden');
});

// A simple utility to adjust color brightness for the gradients
function adjustColor(hex, percent) {
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    r = parseInt(r * (100 + percent) / 100);
    g = parseInt(g * (100 + percent) / 100);
    b = parseInt(b * (100 + percent) / 100);
    r = (r<255)?r:255;  g = (g<255)?g:255;  b = (b<255)?b:255;
    return `#${("00"+r.toString(16)).slice(-2)}${("00"+g.toString(16)).slice(-2)}${("00"+b.toString(16)).slice(-2)}`;
}

// Initial Load
loadCategories();