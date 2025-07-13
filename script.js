document.addEventListener('DOMContentLoaded', () => {
    // Game elements
    const gameArea = document.getElementById('game-area');
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const binsContainer = document.getElementById('bins-container');
    const issuesList = document.getElementById('issues-list');
    const startScreen = document.getElementById('start-screen');
    const startBtn = document.getElementById('start-btn');
    const countdownEl = document.getElementById('countdown');

    // Game settings
    const LANE_COUNT = 4;
    const SPAWN_INTERVAL = 3500; // ms
    const FALL_SPEED = 1; // pixels per frame
    const BONUS_CHANCE = 0.2; // 20% chance for a bonus clue

    // Game state
    let score = 0;
    let lives = 3;
    let allIssues = [];
    let upcomingIssuesQueue = [];
    let lanes = [];
    let gameLoopInterval;

    const categories = {
        'bug': { name: 'Bugs' },
        'enhancement': { name: 'Features' },
        'documentation': { name: 'Docs' },
        'good first issue': { name: 'First Issues' },
        'other': { name: 'Other' }
    };

    // --- Drag and Drop Logic ---
    let draggedItem = null;
    let offsetX = 0, offsetY = 0;

    function makeDraggable(element) {
        element.addEventListener('mousedown', e => {
            if (e.button !== 0) return; // Only allow left-click drags
            draggedItem = element;
            draggedItem.classList.add('dragging');
            
            const rect = draggedItem.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            cancelAnimationFrame(draggedItem.animationFrameId);

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    function onMouseMove(e) {
        if (!draggedItem) return;
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        draggedItem.style.transform = `translate(${x}px, ${y}px)`;
    }

    function onMouseUp() {
        if (!draggedItem) return;
        draggedItem.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        const bins = document.querySelectorAll('.bin');
        let droppedInBin = false;
        bins.forEach(bin => {
            const binRect = bin.getBoundingClientRect();
            const itemRect = draggedItem.getBoundingClientRect();
            if (itemRect.left < binRect.right && itemRect.right > binRect.left &&
                itemRect.top < binRect.bottom && itemRect.bottom > binRect.top) {
                handleDrop(bin.dataset.category);
                droppedInBin = true;
            }
        });

        if (!droppedInBin) resumeFalling(draggedItem);
        draggedItem = null;
    }

    function handleDrop(droppedCategory) {
        const correctCategory = draggedItem.dataset.category;
        if (droppedCategory === correctCategory) {
            score += 10;
            draggedItem.remove();
        } else {
            score = Math.max(0, score - 5);
            draggedItem.style.backgroundColor = 'red';
            setTimeout(() => {
                draggedItem.style.backgroundColor = '';
                resumeFalling(draggedItem);
            }, 500);
        }
        updateScore();
    }

    // --- Game Logic ---
    async function startGame() {
        startScreen.style.display = 'none';
        if (allIssues.length === 0) await fetchIssues();
        
        score = 0;
        lives = 3;
        updateScore();
        
        setupLanes();
        upcomingIssuesQueue = [...allIssues].sort(() => 0.5 - Math.random());
        
        createBins();
        updateSidebar();
        
        runCountdown();
    }

    function runCountdown() {
        let count = 3;
        countdownEl.textContent = count;
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                countdownEl.textContent = count;
            } else if (count === 0) {
                countdownEl.textContent = 'GO!';
            } else {
                clearInterval(countdownInterval);
                countdownEl.textContent = '';
                // Spawn the first issue immediately, then start the loop
                spawnIssue();
                gameLoopInterval = setInterval(spawnIssue, SPAWN_INTERVAL);
            }
        }, 1000);
    }

    function setupLanes() {
        lanes = [];
        const laneWidth = gameArea.offsetWidth / LANE_COUNT;
        for (let i = 0; i < LANE_COUNT; i++) {
            lanes.push(i * laneWidth + (laneWidth / 2) - 125); // Center of lane
        }
    }

    function spawnIssue() {
        if (upcomingIssuesQueue.length === 0) {
            if (document.querySelectorAll('.issue-card').length === 0) endGame(true);
            return;
        }
        const issue = upcomingIssuesQueue.shift();
        updateSidebar();

        const issueCategory = getIssueCategory(issue);
        const issueCard = document.createElement('div');
        issueCard.className = 'issue-card';
        issueCard.dataset.id = issue.id;
        issueCard.dataset.category = issueCategory;
        issueCard.innerHTML = `#${issue.number}: ${issue.title.substring(0, 40)}...`;
        
        const laneIndex = Math.floor(Math.random() * LANE_COUNT);
        const x = lanes[laneIndex];
        issueCard.style.transform = `translate(${x}px, -100px)`;
        
        // Bonus Clue Logic
        if (Math.random() < BONUS_CHANCE) {
            issueCard.classList.add('bonus');
            const clue = document.createElement('div');
            clue.className = 'clue';
            clue.textContent = categories[issueCategory].name;
            issueCard.appendChild(clue);
        }
        
        makeDraggable(issueCard);
        gameArea.appendChild(issueCard);
        
        fall(issueCard);
    }

    function fall(element) {
        let y = -100;
        const x = parseFloat(element.style.transform.match(/translate\((.+)px,/)[1]);
        function animate() {
            y += FALL_SPEED;
            element.style.transform = `translate(${x}px, ${y}px)`;

            if (y > gameArea.offsetHeight) {
                element.remove();
                lives--;
                updateScore();
                if (lives <= 0) endGame(false);
            } else {
                element.animationFrameId = requestAnimationFrame(animate);
            }
        }
        element.animationFrameId = requestAnimationFrame(animate);
    }

    function resumeFalling(element) {
        const currentTransform = new WebKitCSSMatrix(window.getComputedStyle(element).transform);
        let y = currentTransform.m42;
        const x = currentTransform.m41;
        
        function animate() {
            y += FALL_SPEED;
            element.style.transform = `translate(${x}px, ${y}px)`;

            if (y > gameArea.offsetHeight) {
                element.remove();
                lives--;
                updateScore();
                if (lives <= 0) endGame(false);
            } else {
                element.animationFrameId = requestAnimationFrame(animate);
            }
        }
        element.animationFrameId = requestAnimationFrame(animate);
    }

    function endGame(isWin) {
        clearInterval(gameLoopInterval);
        document.querySelectorAll('.issue-card').forEach(card => {
            cancelAnimationFrame(card.animationFrameId);
            card.remove();
        });

        const title = startScreen.querySelector('h1');
        const p = startScreen.querySelector('p');
        if (isWin) {
            title.textContent = 'You Win!';
            p.textContent = `Congratulations! You triaged all the issues. Final score: ${score}.`;
        } else {
            title.textContent = 'Game Over!';
            p.textContent = `Your final score is ${score}.`;
        }
        startScreen.querySelector('button').textContent = 'Play Again';
        startScreen.style.display = 'flex';
        startBtn.onclick = () => location.reload();
    }

    function updateScore() {
        scoreEl.textContent = score;
        livesEl.textContent = lives;
    }

    // --- Data Fetching and Setup ---
    async function fetchIssues() {
        try {
            const response = await fetch('https://api.github.com/repos/google-gemini/gemini-cli/issues?state=open');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allIssues = await response.json();
        } catch (error) {
            console.error("Could not fetch issues:", error);
        }
    }

    function getIssueCategory(issue) {
        const labels = issue.labels.map(l => l.name.toLowerCase());
        if (labels.includes('bug')) return 'bug';
        if (labels.includes('enhancement')) return 'enhancement';
        if (labels.includes('documentation')) return 'documentation';
        if (labels.includes('good first issue')) return 'good first issue';
        return 'other';
    }

    function createBins() {
        binsContainer.innerHTML = '';
        for (const category in categories) {
            const bin = document.createElement('div');
            bin.className = 'bin';
            bin.dataset.category = category;
            bin.innerHTML = `<h3>${categories[category].name}</h3>`;
            binsContainer.appendChild(bin);
        }
    }

    function updateSidebar() {
        issuesList.innerHTML = '';
        const nextIssues = upcomingIssuesQueue.slice(0, 10);
        nextIssues.forEach(issue => {
            const item = document.createElement('div');
            item.className = 'issue-item';
            item.dataset.category = getIssueCategory(issue);
            item.textContent = `#${issue.number}: ${issue.title}`;
            issuesList.appendChild(item);
        });
    }

    startBtn.addEventListener('click', startGame);
});
