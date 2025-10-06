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

document.addEventListener('DOMContentLoaded', () => {

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
    const roundCountInput = document.getElementById('round-count');
    const catPerRoundInput = document.getElementById('cat-per-round-count');
    const subCategoryLabel = document.getElementById('sub-category-label');
    const roundTitle = document.getElementById('round-title');
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
    const submitScoresBtn = document.getElementById('submit-scores-btn');
    const gameOverModal = document.getElementById('game-over-modal');
    const winnerAnnouncement = document.getElementById('winner-announcement');
    const finalScores = document.getElementById('final-scores');
    const playAgainBtn = document.getElementById('play-again-btn');
    const showRulesBtn = document.getElementById('show-rules-btn');
    const rulesModal = document.getElementById('rules-modal');
    const closeRulesBtn = document.getElementById('close-rules-btn');
    const exitGameBtn = document.getElementById('exit-game-btn');
    const exitConfirmModal = document.getElementById('exit-confirm-modal');
    const confirmExitBtn = document.getElementById('confirm-exit-btn');
    const cancelExitBtn = document.getElementById('cancel-exit-btn');
    
    let players = [], allCategories = [], selectedCategories = [], gameRounds = [];
    let currentTurn = 0, currentQuestion = null, currentRound = 1;
    let gameMode = 'classic', numRounds = 1, numCategoriesPerRound = 5, totalCategoriesToSelect = 5;
    const DIFFICULTY_LEVELS = [100, 200, 300, 400, 500];
    let sortable = null;

    function saveGameState() { /* ... */ }
    function loadGameState() { /* ... */ }
    function clearGameState() { /* ... */ }
    function updateCategorySelectionCount() { /* ... */ }
    async function loadMainCategories() { /* ... */ }
    function showSubCategories(mainCatName) { /* ... */ }
    function updateSelectionsSidebar() { /* ... */ }
    function createPlayerInputs() { /* ... */ }
    async function handleStartGame() { /* ... */ }
    function startRound(roundNumber) { /* ... */ }
    function buildGameBoard() { /* ... */ }
    function updateScoreboard() { /* ... */ }
    function showQuestion(question, panel) { /* ... */ }
    function buildScoringControls() { /* ... */ }
    function handleSubmitScores() { /* ... */ }
    function closeModal() { /* ... */ }
    function endGame() { /* ... */ }

    // --- GAME STATE MANAGEMENT ---
    saveGameState = function() {
        const gameState = { players, gameRounds, currentRound, currentTurn, gameMode, numRounds, numCategoriesPerRound };
        sessionStorage.setItem('quizGameState', JSON.stringify(gameState));
    }
    loadGameState = function() {
        const savedState = sessionStorage.getItem('quizGameState');
        if (savedState) {
            const gameState = JSON.parse(savedState);
            players = gameState.players; gameRounds = gameState.gameRounds; currentRound = gameState.currentRound;
            currentTurn = gameState.currentTurn; gameMode = gameState.gameMode; numRounds = gameState.numRounds;
            numCategoriesPerRound = gameState.numCategoriesPerRound;
            setupScreen.classList.remove('active'); gameScreen.classList.add('active');
            startRound(currentRound);
            return true;
        }
        return false;
    }
    clearGameState = function() { sessionStorage.removeItem('quizGameState'); }

    // --- SETUP FUNCTIONS ---
    updateCategorySelectionCount = function() {
        numRounds = parseInt(roundCountInput.value) || 1;
        numCategoriesPerRound = parseInt(catPerRoundInput.value) || 5;
        totalCategoriesToSelect = numRounds * numCategoriesPerRound;
        subCategoryLabel.textContent = `SELECT ${totalCategoriesToSelect} SUB-MODULES (${numRounds} R x ${numCategoriesPerRound} C)`;
    }
    loadMainCategories = async function() {
        try {
            const snapshot = await db.collection('categories').get();
            allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const mainCategories = [...new Set(allCategories.map(cat => cat.mainCategory).filter(Boolean))];
            mainCategorySelection.innerHTML = '';
            if (mainCategories.length === 0) { mainCategorySelection.innerHTML = '<p>No categories found in database.</p>'; return; }
            mainCategories.forEach(mainCat => {
                const button = document.createElement('button');
                button.className = 'btn-start-game main-category-btn'; button.textContent = mainCat;
                button.onclick = () => showSubCategories(mainCat);
                mainCategorySelection.appendChild(button);
            });
        } catch (error) { console.error("Error loading categories:", error); mainCategorySelection.innerHTML = '<p style="color:red;">Could not load categories.</p>'; }
    }
    showSubCategories = function(mainCatName) {
        const subCategories = allCategories.filter(cat => cat.mainCategory === mainCatName);
        categorySelection.innerHTML = '';
        subCategories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `<input type="checkbox" id="${category.id}" value="${category.name}"><h3>${category.name}</h3><p>${category.description || 'No description.'}</p>`;
            if (selectedCategories.find(sc => sc.id === category.id)) { card.classList.add('selected'); card.querySelector('input').checked = true; }
            card.addEventListener('click', () => {
                const isSelected = card.classList.contains('selected');
                if (!isSelected && selectedCategories.length >= totalCategoriesToSelect) { alert(`SYSTEM LIMIT: ${totalCategoriesToSelect} SUB-MODULES MAX.`); return; }
                card.classList.toggle('selected'); card.querySelector('input').checked = !isSelected;
                if (!isSelected) { selectedCategories.push(category); } 
                else { selectedCategories = selectedCategories.filter(sc => sc.id !== category.id); }
                updateSelectionsSidebar();
            });
            categorySelection.appendChild(card);
        });
        mainCategoryView.classList.add('hidden');
        subCategoryView.classList.remove('hidden');
    }
    updateSelectionsSidebar = function() {
        if (selectedCategories.length === 0) {
            selectionsContainer.innerHTML = `<p class="selections-placeholder">Select up to ${totalCategoriesToSelect} sub-modules.</p>`;
            if (sortable) sortable.destroy(); return;
        }
        selectionsContainer.innerHTML = '';
        for (let i = 0; i < numRounds; i++) {
            const roundNum = i + 1;
            const divider = document.createElement('div'); divider.className = 'round-divider'; divider.textContent = `ROUND ${roundNum}`;
            selectionsContainer.appendChild(divider);
            const roundCategories = selectedCategories.slice(i * numCategoriesPerRound, roundNum * numCategoriesPerRound);
            roundCategories.forEach(cat => {
                const item = document.createElement('div');
                item.className = 'selection-item'; item.dataset.id = cat.id; 
                item.innerHTML = `<span>${cat.name}</span><button class="remove-btn" data-id="${cat.id}">&times;</button>`;
                selectionsContainer.appendChild(item);
            });
        }
        selectionsContainer.querySelectorAll('.remove-btn').forEach(btn => {
            btn.onclick = (e) => { e.stopPropagation(); const categoryId = e.target.dataset.id; const cardCheckbox = document.getElementById(categoryId); if (cardCheckbox) cardCheckbox.closest('.category-card').click(); };
        });
        if (selectedCategories.length === totalCategoriesToSelect) {
            if (sortable) sortable.destroy();
            sortable = new Sortable(selectionsContainer, {
                animation: 150, ghostClass: 'sortable-ghost', dragClass: 'sortable-drag',
                onEnd: function () {
                    const newOrderIds = Array.from(selectionsContainer.querySelectorAll('.selection-item')).map(item => item.dataset.id);
                    selectedCategories.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                    updateSelectionsSidebar();
                },
            });
        } else { if (sortable) sortable.destroy(); }
    }
    createPlayerInputs = function() {
        const count = playerCountInput.value;
        playerNamesContainer.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const input = document.createElement('input');
            input.type = 'text'; input.placeholder = `Player ${i} Identifier`;
            playerNamesContainer.appendChild(input);
        }
    }

    // --- GAMEPLAY FUNCTIONS ---
    handleStartGame = async function() {
        players = Array.from(document.querySelectorAll('#player-names-container input')).map((input, i) => ({ name: input.value || `Player ${i + 1}`, score: 0 }));
        if (selectedCategories.length !== totalCategoriesToSelect) { alert(`Please select exactly ${totalCategoriesToSelect} sub-categories.`); return; }
        
        const processedCategories = [];
        for (const category of selectedCategories) {
            const processedCategory = { ...category, questions: {} }; let isComplete = true;
            for (const level of DIFFICULTY_LEVELS) {
                const questionPool = category.questions[level];
                if (!questionPool || questionPool.length === 0) { isComplete = false; break; }
                const randomIndex = Math.floor(Math.random() * questionPool.length);
                processedCategory.questions[level] = questionPool[randomIndex];
            }
            if (!isComplete) { alert(`The category "${category.name}" is missing questions.`); return; }
            processedCategories.push(processedCategory);
        }
        
        gameRounds = [];
        for (let i = 0; i < numRounds; i++) {
            const roundCategories = processedCategories.slice(i * numCategoriesPerRound, (i + 1) * numCategoriesPerRound);
            gameRounds.push(roundCategories);
        }
        
        setupScreen.classList.remove('active'); gameScreen.classList.add('active');
        currentTurn = Math.floor(Math.random() * players.length);
        startRound(1);
        saveGameState();
    }
    startRound = function(roundNumber) { currentRound = roundNumber; roundTitle.textContent = `// ROUND ${currentRound} / ${numRounds}`; buildGameBoard(); updateScoreboard(); }
    buildGameBoard = function() {
        gameBoard.innerHTML = '';
        const currentRoundCategories = gameRounds[currentRound - 1];
        currentRoundCategories.forEach((category, index) => {
            const column = document.createElement('div'); column.className = `category-column category-${index + 1}`;
            const header = document.createElement('div'); header.className = 'category-header'; header.textContent = category.name;
            column.appendChild(header);
            let difficulties = [...DIFFICULTY_LEVELS];
            if (gameMode === 'mystery') difficulties.sort(() => Math.random() - 0.5);
            difficulties.forEach(level => {
                const q = category.questions[level];
                if (q.answered) {
                    const panel = document.createElement('div'); panel.className = 'question-panel disabled'; column.appendChild(panel);
                } else {
                    const panel = document.createElement('button'); panel.className = 'question-panel';
                    if (gameMode === 'mystery') { panel.textContent = '?'; panel.classList.add('mystery'); } 
                    else { panel.textContent = level; }
                    q.points = level;
                    panel.addEventListener('click', () => showQuestion(q, panel), { once: true });
                    column.appendChild(panel);
                }
            });
            gameBoard.appendChild(column);
        });
    }
    updateScoreboard = function() {
        scoreboardPlayers.innerHTML = '';
        players.forEach((player, index) => {
            const scoreDiv = document.createElement('div'); scoreDiv.className = 'player-score';
            if (index === currentTurn) scoreDiv.classList.add('active');
            scoreDiv.innerHTML = `<span class="player-name">${player.name}</span><span class="score-value">${player.score}</span>`;
            scoreboardPlayers.appendChild(scoreDiv);
        });
        turnIndicator.textContent = `ACTIVE PLAYER TO CHOOSE: ${players[currentTurn].name}`;
    }
    showQuestion = function(question, panel) {
        currentQuestion = question; question.answered = true; saveGameState();
        questionText.textContent = question.text; questionPointsEl.textContent = `${question.points} POINTS`;
        answerText.textContent = question.answer; questionCard.classList.remove('is-flipped');
        modalOverlay.classList.add('active'); panel.classList.add('disabled'); panel.textContent = '';
    }
    buildScoringControls = function() {
        playerScoringContainer.innerHTML = '';
        players.forEach((player, index) => {
            const controlDiv = document.createElement('div'); controlDiv.className = 'player-score-control';
            controlDiv.innerHTML = `<span class="player-name">${player.name}</span><div class="control-buttons" data-player-index="${index}"><button class="btn-correct">✅</button><button class="btn-incorrect">❌</button></div>`;
            playerScoringContainer.appendChild(controlDiv);
        });
        playerScoringContainer.querySelectorAll('.control-buttons').forEach(div => {
            const correctBtn = div.querySelector('.btn-correct'); const incorrectBtn = div.querySelector('.btn-incorrect');
            correctBtn.addEventListener('click', () => { correctBtn.classList.toggle('selected'); incorrectBtn.classList.remove('selected'); });
            incorrectBtn.addEventListener('click', () => { incorrectBtn.classList.toggle('selected'); correctBtn.classList.remove('selected'); });
        });
    }
    handleSubmitScores = function() {
        const points = currentQuestion.points;
        playerScoringContainer.querySelectorAll('.control-buttons').forEach(div => {
            const playerIndex = parseInt(div.dataset.playerIndex);
            if (div.querySelector('.btn-correct').classList.contains('selected')) players[playerIndex].score += points;
            else if (div.querySelector('.btn-incorrect').classList.contains('selected')) players[playerIndex].score -= points;
        });
        closeModal(); saveGameState();
    }
    closeModal = function() {
        modalOverlay.classList.remove('active');
        updateScoreboard();
        if (document.querySelectorAll('.question-panel:not(.disabled)').length === 0) {
            if (currentRound < numRounds) {
                alert(`Round ${currentRound} complete! Get ready for Round ${currentRound + 1}.`);
                startRound(currentRound + 1);
            } else { endGame(); }
        }
    }
    endGame = function() {
        clearGameState();
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

    // --- EVENT LISTENERS ---
    playerCountInput.addEventListener('change', createPlayerInputs);
    roundCountInput.addEventListener('change', updateCategorySelectionCount);
    catPerRoundInput.addEventListener('change', updateCategorySelectionCount);
    document.querySelectorAll('input[name="game-mode"]').forEach(radio => { radio.addEventListener('change', (e) => gameMode = e.target.value); });
    backToMainBtn.addEventListener('click', () => { subCategoryView.classList.add('hidden'); mainCategoryView.classList.remove('hidden'); });
    startGameBtn.addEventListener('click', handleStartGame);
    revealAnswerBtn.addEventListener('click', () => { questionCard.classList.add('is-flipped'); buildScoringControls(); });
    submitScoresBtn.addEventListener('click', handleSubmitScores);
    playAgainBtn.addEventListener('click', () => { clearGameState(); window.location.reload(); });
    showRulesBtn.addEventListener('click', () => rulesModal.classList.add('active'));
    closeRulesBtn.addEventListener('click', () => rulesModal.classList.remove('active'));
    rulesModal.addEventListener('click', (e) => { if (e.target === rulesModal) rulesModal.classList.remove('active'); });
    exitGameBtn.addEventListener('click', () => exitConfirmModal.classList.add('active'));
    cancelExitBtn.addEventListener('click', () => exitConfirmModal.classList.remove('active'));
    confirmExitBtn.addEventListener('click', () => { clearGameState(); window.location.reload(); });
    
    // --- INITIAL LOAD ---
    if (!loadGameState()) {
        createPlayerInputs();
        loadMainCategories();
        updateSelectionsSidebar();
        updateCategorySelectionCount();
    }
});