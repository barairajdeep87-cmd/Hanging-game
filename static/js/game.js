// Game Client for Terminal Velocity - Pythonic Hangman

// State Variables
let currentView = "view-login";
let soundEnabled = localStorage.getItem("soundEnabled") !== "false";
let activeGame = null;
let timerInterval = null;
let timerSeconds = 0;
let selectedCategory = "TECH_STACK";

// Web Audio API Context
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

// Retro sound effect synthesizers
function playClickSound() {
    if (!soundEnabled) return;
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function playSuccessSound() {
    if (!soundEnabled) return;
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
    
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}

function playFailSound() {
    if (!soundEnabled) return;
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, audioCtx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.22);
}

function playVictorySound() {
    if (!soundEnabled) return;
    initAudio();
    const now = audioCtx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        
        gain.gain.setValueAtTime(0.03, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
    });
}

function playGameOverSound() {
    if (!soundEnabled) return;
    initAudio();
    const now = audioCtx.currentTime;
    const notes = [220.00, 207.65, 196.00, 174.61, 146.83, 110.00]; // A3, G#3, G3, F3, D3, A2
    notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        
        gain.gain.setValueAtTime(0.07, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
        
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
    });
}

// Dynamic View Switcher
function switchView(viewId) {
    playClickSound();
    
    // Hide all views
    document.querySelectorAll('main > section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show target view
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        currentView = viewId;
    }
    
    // Hide or show shared bottom navigation bar
    const bottomNav = document.getElementById('bottom-nav-bar');
    if (viewId === 'view-login') {
        bottomNav.classList.add('hidden');
    } else {
        bottomNav.classList.remove('hidden');
    }
    
    // Adjust Bottom Navigation active highlights
    const navGame = document.getElementById('nav-game');
    const navStats = document.getElementById('nav-stats');
    const navLeaderboard = document.getElementById('nav-leaderboard');
    
    // Reset highlights
    [navGame, navStats, navLeaderboard].forEach(btn => {
        btn.classList.remove('text-primary-container', 'font-bold');
        btn.classList.add('text-on-surface-variant', 'opacity-70');
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.style.fontVariationSettings = "'FILL' 0";
    });
    
    // Highlight based on current view
    if (viewId === 'view-menu' || viewId === 'view-categories' || viewId === 'view-game' || viewId === 'view-victory' || viewId === 'view-gameover' || viewId === 'view-help') {
        navGame.classList.add('text-primary-container', 'font-bold');
        navGame.classList.remove('text-on-surface-variant', 'opacity-70');
        navGame.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
    } else if (viewId === 'view-stats') {
        navStats.classList.add('text-primary-container', 'font-bold');
        navStats.classList.remove('text-on-surface-variant', 'opacity-70');
        navStats.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
    } else if (viewId === 'view-leaderboard') {
        navLeaderboard.classList.add('text-primary-container', 'font-bold');
        navLeaderboard.classList.remove('text-on-surface-variant', 'opacity-70');
        navLeaderboard.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1";
    }
}

// Show Toast Alert
function showToast(message) {
    const toast = document.getElementById('toast-banner');
    const toastText = document.getElementById('toast-banner-text');
    toastText.innerText = message;
    
    toast.classList.remove('-translate-y-24');
    toast.classList.add('translate-y-0');
    
    setTimeout(() => {
        toast.classList.add('-translate-y-24');
        toast.classList.remove('translate-y-0');
    }, 3000);
}

// Initial API loading and UI setup
document.addEventListener('DOMContentLoaded', () => {
    // Local state checks
    loadMenuStats();
    loadSoundSetting();
    
    // Login Form binds
    document.getElementById('login-submit-btn').addEventListener('click', () => {
        const username = document.getElementById('login-username').value.trim();
        if (!username) {
            const err = document.getElementById('login-error');
            err.innerText = "[ERROR]: OPERATOR_ID_REQUIRED";
            err.classList.remove('hidden');
            playFailSound();
            return;
        }
        submitLogin(username);
    });

    document.getElementById('login-guest-btn').addEventListener('click', () => {
        const rand = Math.floor(Math.random() * 256).toString(16).toUpperCase().padStart(2, '0');
        const guestName = `GUEST_0x${rand}`;
        submitLogin(guestName);
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        playClickSound();
        // Hide settings modal
        document.getElementById('settings-modal').classList.remove('flex');
        document.getElementById('settings-modal').classList.add('hidden');
        
        fetch('/api/logout', { method: 'POST' })
            .then(res => res.json())
            .then(() => {
                activeGame = null;
                clearInterval(timerInterval);
                document.getElementById('login-username').value = '';
                document.getElementById('login-password').value = '';
                switchView('view-login');
                showToast("[SYSTEM]: SESSION_TERMINATED_ACCESS_REVOKED");
                loadMenuStats();
            })
              .catch(err => console.error("Error logging out:", err));
    });

    // Event listeners
    document.getElementById('start-game-btn').addEventListener('click', () => {
        loadCategories();
        switchView('view-categories');
    });
    
    document.getElementById('how-to-play-btn').addEventListener('click', () => {
        switchView('view-help');
    });
    
    document.getElementById('help-back-btn').addEventListener('click', () => {
        switchView('view-menu');
    });

    document.getElementById('categories-back-btn').addEventListener('click', () => {
        switchView('view-menu');
    });

    document.getElementById('game-abort-btn').addEventListener('click', () => {
        playClickSound();
        document.getElementById('abort-modal').classList.remove('hidden');
        document.getElementById('abort-modal').classList.add('flex');
    });

    document.getElementById('abort-confirm-btn').addEventListener('click', () => {
        playClickSound();
        document.getElementById('abort-modal').classList.remove('flex');
        document.getElementById('abort-modal').classList.add('hidden');
        clearInterval(timerInterval);
        activeGame = null;
        switchView('view-menu');
        showToast("[SYSTEM]: DECRYPTION_ABORTED");
    });

    document.getElementById('abort-cancel-btn').addEventListener('click', () => {
        playClickSound();
        document.getElementById('abort-modal').classList.remove('flex');
        document.getElementById('abort-modal').classList.add('hidden');
    });
    
    document.getElementById('random-category-btn').addEventListener('click', () => {
        selectRandomCategory();
    });
    
    // Settings modal triggers
    document.getElementById('settings-btn').addEventListener('click', () => {
        playClickSound();
        document.getElementById('settings-modal').classList.remove('hidden');
        document.getElementById('settings-modal').classList.add('flex');
    });
    
    document.getElementById('settings-close-btn').addEventListener('click', () => {
        playClickSound();
        document.getElementById('settings-modal').classList.remove('flex');
        document.getElementById('settings-modal').classList.add('hidden');
    });
    
    document.getElementById('sound-toggle-btn').addEventListener('click', () => {
        toggleSound();
    });
    
    document.getElementById('clear-stats-btn').addEventListener('click', () => {
        resetStats();
    });
    
    // Navigation binds
    document.getElementById('nav-game').addEventListener('click', () => {
        if (activeGame && activeGame.status === "playing") {
            switchView('view-game');
        } else {
            // Ensure logged in
            fetch('/api/stats')
                .then(res => res.json())
                .then(stats => {
                    if (stats.username && stats.username !== "GUEST") {
                        switchView('view-menu');
                    } else {
                        switchView('view-login');
                    }
                })
                .catch(() => switchView('view-login'));
        }
    });
    
    document.getElementById('nav-stats').addEventListener('click', () => {
        fetchStatsAndRender();
        switchView('view-stats');
    });
    
    document.getElementById('nav-leaderboard').addEventListener('click', () => {
        fetchLeaderboardAndRender();
        switchView('view-leaderboard');
    });
    
    // Victory & Loss actions
    document.getElementById('victory-play-again-btn').addEventListener('click', () => {
        startGame(selectedCategory);
    });
    document.getElementById('victory-menu-btn').addEventListener('click', () => {
        switchView('view-menu');
    });
    document.getElementById('gameover-retry-btn').addEventListener('click', () => {
        startGame(selectedCategory);
    });
    document.getElementById('gameover-menu-btn').addEventListener('click', () => {
        switchView('view-menu');
    });
    
    // Bind physical keyboard
    document.addEventListener('keydown', (e) => {
        if (currentView === 'view-game' && activeGame && activeGame.status === 'playing') {
            const letter = e.key.toUpperCase();
            if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
                makeGuess(letter);
            }
        }
    });
    
    // Check session login on startup
    fetch('/api/stats')
        .then(res => res.json())
        .then(stats => {
            if (stats.username && stats.username !== "GUEST") {
                switchView('view-menu');
                showToast(`[SYSTEM]: ACCESS_GRANTED_OPERATOR_${stats.username}`);
            } else {
                switchView('view-login');
            }
        })
        .catch(() => {
            switchView('view-login');
        });
});

// Sound Settings management
function loadSoundSetting() {
    const btn = document.getElementById('sound-toggle-btn');
    const badge = btn.querySelector('span');
    if (soundEnabled) {
        btn.classList.remove('bg-surface-variant');
        btn.classList.add('bg-primary-container');
        badge.style.transform = 'translateX(24px)';
    } else {
        btn.classList.remove('bg-primary-container');
        btn.classList.add('bg-surface-variant');
        badge.style.transform = 'translateX(0px)';
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem("soundEnabled", soundEnabled);
    loadSoundSetting();
    playClickSound();
}

// Reset stats endpoint call
function resetStats() {
    playClickSound();
    fetch('/api/stats/reset', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            showToast("[SYSTEM]: CACHE_RESET_SUCCESSFUL");
            loadMenuStats();
            // If viewing stats tab, refresh
            if (currentView === 'view-stats') {
                fetchStatsAndRender();
            }
            // Close modal
            document.getElementById('settings-modal').classList.remove('flex');
            document.getElementById('settings-modal').classList.add('hidden');
        })
        .catch(err => console.error("Error resetting stats:", err));
}

// Fetch categories from Flask and render Bento list
function loadCategories() {
    fetch('/api/categories')
        .then(res => res.json())
        .then(categories => {
            const container = document.getElementById('categories-container');
            container.innerHTML = '';
            
            Object.keys(categories).forEach(key => {
                const cat = categories[key];
                const card = document.createElement('button');
                card.className = "neon-border group flex flex-col items-start p-5 bg-surface-container-low rounded-xl text-left transition-all active:scale-[0.98] relative overflow-hidden w-full";
                
                let lvlClass = "text-on-surface-variant";
                if (cat.difficulty === "EASY") lvlClass = "text-primary-fixed bg-primary-fixed/10 px-2 py-0.5 rounded";
                if (cat.difficulty === "CRITICAL") lvlClass = "text-on-secondary-container bg-secondary-container px-2 py-0.5 rounded";
                
                card.innerHTML = `
                    <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span class="material-symbols-outlined text-[56px]">${cat.icon}</span>
                    </div>
                    <div class="mb-4 flex justify-between w-full items-start">
                        <span class="font-label-caps text-label-caps text-primary-fixed bg-primary-fixed/10 px-2 py-1 rounded">${cat.hex}</span>
                        <span class="font-label-caps text-label-caps ${lvlClass}">LVL: ${cat.difficulty}</span>
                    </div>
                    <h2 class="font-code-input text-code-input text-on-surface mb-2 group-hover:text-primary-fixed transition-colors">${key}</h2>
                    <p class="text-on-surface-variant text-xs line-clamp-2 pr-12">${cat.description}</p>
                `;
                
                card.addEventListener('click', () => {
                    startGame(key);
                });
                
                container.appendChild(card);
            });
        })
        .catch(err => console.error("Error loading categories:", err));
}

function selectRandomCategory() {
    fetch('/api/categories')
        .then(res => res.json())
        .then(categories => {
            const keys = Object.keys(categories);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            startGame(randomKey);
        });
}

// Start Game Core
function startGame(category) {
    selectedCategory = category;
    
    fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category })
    })
    .then(res => res.json())
    .then(gameState => {
        activeGame = gameState;
        timerSeconds = 0;
        
        // Setup initial UI
        document.getElementById('game-attempts').innerText = `6/6`;
        document.getElementById('game-attempts').classList.remove('text-error');
        document.getElementById('game-attempts').classList.add('text-secondary');
        document.getElementById('game-timer').innerText = "00:00";
        
        // Reset SVG Gallows
        resetGallowsSVG();
        
        // Set word slots
        renderWordSlots(gameState.word_display);
        
        // Render Keyboard
        renderKeyboard(gameState.guessed_letters);
        
        // Clear alert Toast
        document.getElementById('game-alert').classList.add('hidden');
        
        // Start Local Timer
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timerSeconds++;
            const minutes = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
            const secs = (timerSeconds % 60).toString().padStart(2, '0');
            document.getElementById('game-timer').innerText = `${minutes}:${secs}`;
        }, 1000);
        
        switchView('view-game');
        showToast(`[SYSTEM]: INITIALIZING_${category}_MODULE`);
    })
    .catch(err => console.error("Error starting game:", err));
}

// Render word slots
function renderWordSlots(displayArray, highlightIndex = -1) {
    const container = document.getElementById('word-slots-container');
    container.innerHTML = '';
    
    displayArray.forEach((char, index) => {
        const slot = document.createElement('div');
        
        if (char === " ") {
            slot.className = "w-6 h-12 flex items-end justify-center";
            slot.innerHTML = `<span class="opacity-0"> </span>`;
        } else {
            const isGuessed = char !== "_";
            const borderClass = isGuessed 
                ? "border-primary-container shadow-[0_0_10px_rgba(0,255,194,0.15)] text-primary-container" 
                : "border-outline-variant text-on-surface-variant opacity-40";
                
            slot.className = `w-10 h-12 bg-surface-container border ${borderClass} flex items-center justify-center rounded-lg shadow-sm`;
            slot.innerHTML = `<span class="font-code-input text-code-input">${char}</span>`;
            
            // Add pulse highlight to current box or hint
            if (index === highlightIndex) {
                slot.classList.add('animate-pulse', 'bg-primary-container/10');
            }
        }
        container.appendChild(slot);
    });
}

// Draw/Update Gallows SVG
function resetGallowsSVG() {
    const parts = ['head', 'torso', 'larm', 'rarm', 'lleg', 'rleg', 'eyes'];
    parts.forEach(part => {
        document.getElementById(`gallow-${part}`).classList.add('hidden');
    });
}

function updateGallowsSVG(attemptsLeft) {
    resetGallowsSVG();
    
    if (attemptsLeft <= 5) document.getElementById('gallow-head').classList.remove('hidden');
    if (attemptsLeft <= 4) document.getElementById('gallow-torso').classList.remove('hidden');
    if (attemptsLeft <= 3) document.getElementById('gallow-larm').classList.remove('hidden');
    if (attemptsLeft <= 2) document.getElementById('gallow-rarm').classList.remove('hidden');
    if (attemptsLeft <= 1) document.getElementById('gallow-lleg').classList.remove('hidden');
    if (attemptsLeft <= 0) {
        document.getElementById('gallow-rleg').classList.remove('hidden');
        document.getElementById('gallow-eyes').classList.remove('hidden');
    }
}

// Render Virtual Keyboard
function renderKeyboard(guessedLetters) {
    const container = document.getElementById('keyboard-container');
    container.innerHTML = '';
    
    const rows = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["Z", "X", "C", "V", "B", "N", "M"]
    ];
    
    rows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = "flex justify-center gap-1.5";
        
        row.forEach(letter => {
            const btn = document.createElement('button');
            btn.className = "key-active w-8 h-11 bg-surface-container border font-label-caps text-sm rounded-lg flex items-center justify-center transition-all";
            btn.innerText = letter;
            
            // Highlight based on guess status
            if (guessedLetters.includes(letter)) {
                // Determine if correct or wrong
                // We'll let makeGuess API handle the visual updates, but if we redraw:
                if (activeGame && activeGame.word_display && activeGame.word_display.includes(letter)) {
                    // Correct key
                    btn.className += " border-primary-container text-primary-container";
                } else {
                    // Incorrect key
                    btn.className += " border-outline-variant opacity-30 line-through decoration-error";
                }
            } else {
                // Default unclicked key
                btn.className += " border-outline-variant text-on-surface-variant hover:bg-surface-variant/20";
                btn.addEventListener('click', () => {
                    makeGuess(letter);
                });
            }
            
            rowDiv.appendChild(btn);
        });
        container.appendChild(rowDiv);
    });
}

// Process Letter Guess
function makeGuess(letter) {
    if (!activeGame || activeGame.status !== "playing") return;
    if (activeGame.guessed_letters.includes(letter)) return;
    
    fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letter: letter })
    })
    .then(res => res.json())
    .then(res => {
        // Update local game object
        activeGame.guessed_letters = res.guessed_letters;
        activeGame.word_display = res.word_display;
        activeGame.remaining_attempts = res.remaining_attempts;
        activeGame.status = res.status;
        
        // Key sound
        if (res.correct) {
            playSuccessSound();
            // Pulse matching letter slot
            const idx = res.word_display.indexOf(letter);
            renderWordSlots(res.word_display, idx);
        } else {
            playFailSound();
            renderWordSlots(res.word_display);
        }
        
        // Attempts remaining text
        document.getElementById('game-attempts').innerText = `${res.remaining_attempts}/6`;
        if (res.remaining_attempts <= 2) {
            document.getElementById('game-attempts').classList.add('text-error');
            document.getElementById('game-attempts').classList.remove('text-secondary');
        }
        
        // Redraw gallows and keyboard
        updateGallowsSVG(res.remaining_attempts);
        renderKeyboard(res.guessed_letters);
        
        // Check game endings
        if (res.status === "victory") {
            clearInterval(timerInterval);
            playVictorySound();
            setTimeout(() => {
                showVictoryScreen(res);
            }, 1000);
        } else if (res.status === "gameover") {
            clearInterval(timerInterval);
            playGameOverSound();
            setTimeout(() => {
                showGameOverScreen(res);
            }, 1000);
        }
    })
    .catch(err => console.error("Error making guess:", err));
}

// Show Victory Ending Screen
function showVictoryScreen(result) {
    // Reveal letters
    const container = document.getElementById('victory-word-reveal');
    container.innerHTML = '';
    result.word_display.forEach(char => {
        const box = document.createElement('div');
        box.className = "w-10 h-14 flex items-center justify-center border-2 border-primary-container bg-primary-container/10 rounded-lg shadow-[0_0_15px_rgba(0,255,194,0.2)]";
        box.innerHTML = `<span class="font-code-input text-xl text-primary-container">${char}</span>`;
        container.appendChild(box);
    });
    
    // Set time/attempts stats
    document.getElementById('victory-attempts').innerText = (6 - result.remaining_attempts);
    
    const minutes = Math.floor(result.time_spent / 60);
    const secs = (result.time_spent % 60).toString().padStart(2, '0');
    document.getElementById('victory-time').innerText = `${minutes}:${secs}`;
    
    // Show toast banner update
    showToast(`[SYSTEM]: STREAK_UPDATED +1`);
    
    switchView('view-victory');
    loadMenuStats(); // Update dashboard scores
}

// Show Game Over Ending Screen
function showGameOverScreen(result) {
    // Reveal target word in red slots
    const container = document.getElementById('gameover-word-reveal');
    container.innerHTML = '';
    
    // Animate letters falling/drawing sequentially
    const word = result.word;
    for (let i = 0; i < word.length; i++) {
        const box = document.createElement('div');
        box.className = "w-10 h-12 flex items-center justify-center bg-surface-container-high border border-outline-variant rounded font-code-input text-on-surface transform translate-y-[10px] opacity-0";
        box.innerText = word[i];
        
        container.appendChild(box);
        
        setTimeout(() => {
            box.style.transition = 'all 0.4s ease-out';
            box.style.opacity = '1';
            box.style.transform = 'translateY(0)';
        }, 100 * i);
    }
    
    switchView('view-gameover');
    loadMenuStats();
}

// Load Stats from session endpoint
function fetchStatsAndRender() {
    fetch('/api/stats')
        .then(res => res.json())
        .then(stats => {
            document.getElementById('stats-win-rate').innerText = `${stats.win_rate}%`;
            document.getElementById('stats-total-games').innerText = stats.total_games;
            document.getElementById('stats-current-streak').innerText = stats.current_streak;
            document.getElementById('stats-longest-streak').innerText = stats.longest_streak;
            document.getElementById('stats-avg-guesses').innerText = stats.avg_guesses;
            document.getElementById('stats-failed-letter').innerText = stats.most_failed_letter || 'N/A';
            
            document.getElementById('stats-wins-easy').innerText = `${stats.wins_by_difficulty.EASY} WINS`;
            document.getElementById('stats-wins-medium').innerText = `${stats.wins_by_difficulty.MEDIUM} WINS`;
            
            const hardWins = stats.wins_by_difficulty.HARD + stats.wins_by_difficulty.CRITICAL;
            document.getElementById('stats-wins-hard').innerText = `${hardWins} WINS`;
            
            // Calculate relative heights or widths
            const totalWins = stats.wins || 1;
            const easyPct = Math.round((stats.wins_by_difficulty.EASY / totalWins) * 100);
            const medPct = Math.round((stats.wins_by_difficulty.MEDIUM / totalWins) * 100);
            const hardPct = Math.round((hardWins / totalWins) * 100);
            
            // Render widths
            setTimeout(() => {
                document.getElementById('bar-easy').style.width = stats.wins > 0 ? `${easyPct}%` : '0%';
                document.getElementById('bar-medium').style.width = stats.wins > 0 ? `${medPct}%` : '0%';
                document.getElementById('bar-hard').style.width = stats.wins > 0 ? `${hardPct}%` : '0%';
            }, 200);
        })
        .catch(err => console.error("Error loading stats:", err));
}

// Load Leaderboard list
function fetchLeaderboardAndRender() {
    fetch('/api/leaderboard')
        .then(res => res.json())
        .then(list => {
            const rows = document.getElementById('leaderboard-rows');
            rows.innerHTML = '';
            
            list.forEach(entry => {
                const row = document.createElement('div');
                
                let rankClass = "text-on-surface-variant/60";
                let nameClass = "text-primary hover:text-primary-fixed";
                let scoreClass = "text-on-surface-variant";
                
                if (entry.rank === 1) {
                    rankClass = "text-secondary-fixed-dim";
                    nameClass = "text-primary group-hover:text-primary-fixed font-semibold";
                    scoreClass = "text-secondary";
                } else if (entry.rank === 2 || entry.rank === 3) {
                    rankClass = "text-on-surface-variant";
                    nameClass = "text-primary group-hover:text-primary-fixed";
                    scoreClass = "text-on-surface";
                }
                
                row.className = "flex items-center px-4 py-3.5 border-b border-outline-variant hover:bg-surface-variant/10 transition-colors group";
                row.innerHTML = `
                    <div class="w-10 font-display-game text-lg ${rankClass} leading-none">${entry.rank.toString().padStart(2, '0')}</div>
                    <div class="flex-grow flex flex-col">
                        <span class="font-code-input text-xs ${nameClass} transition-colors">${entry.username}</span>
                        <span class="text-[9px] font-label-caps text-on-surface-variant">${entry.status}</span>
                    </div>
                    <div class="text-right font-display-game text-md ${scoreClass} leading-none">${entry.score.toLocaleString()}</div>
                `;
                rows.appendChild(row);
            });
            
            // Set User Rank overlays
            fetch('/api/stats')
                .then(res => res.json())
                .then(stats => {
                    const myScore = stats.last_score || 0;
                    document.getElementById('user-score-badge').innerText = myScore.toLocaleString();
                    
                    // Display username in widget
                    const userWidgets = document.querySelectorAll('.font-code-input.font-bold');
                    userWidgets.forEach(widget => {
                        if (widget.innerText !== "user_0x9A" && widget.innerText !== "user_0xBF" && widget.innerText !== "user_0x4F") {
                            widget.innerText = stats.username || "GUEST";
                        }
                    });
                    
                    // Search if username exists in leaderboard list
                    const found = list.find(e => e.username === stats.username);
                    if (found) {
                        document.getElementById('user-rank-badge').innerText = found.rank.toString().padStart(2, '0');
                    } else {
                        document.getElementById('user-rank-badge').innerText = "--";
                    }
                });
        })
        .catch(err => console.error("Error loading leaderboard:", err));
}

// Load Mini stats for the menu display
function loadMenuStats() {
    fetch('/api/stats')
        .then(res => res.json())
        .then(stats => {
            document.getElementById('menu-last-score').innerText = stats.last_score.toLocaleString();
            document.getElementById('menu-streak').innerText = `#${stats.current_streak}`;
        })
        .catch(err => console.error("Error loading menu stats:", err));
}

// Send login request to Flask backend
function submitLogin(username) {
    playClickSound();
    fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(data => { throw new Error(data.error); });
        }
        return res.json();
    })
    .then(data => {
        document.getElementById('login-error').classList.add('hidden');
        switchView('view-menu');
        showToast(`[SYSTEM]: ACCESS_GRANTED_OPERATOR_${data.username}`);
        loadMenuStats();
    })
    .catch(err => {
        playFailSound();
        const errDiv = document.getElementById('login-error');
        errDiv.innerText = `[ERROR]: ${err.message.toUpperCase()}`;
        errDiv.classList.remove('hidden');
    });
}
