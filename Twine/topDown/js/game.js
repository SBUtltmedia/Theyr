/*
 * Top-Down Explorer - Game Logic
 * WASD movement with multiplayer sync, player collision, and sprite animation
 */
console.log('[GAME] game.js file is executing...');

(function() {
    'use strict';
    console.log('[GAME] IIFE started');

    const SPEED = 3;
    const PLAYER_WIDTH = 48;
    const PLAYER_HEIGHT = 64;
    const COLLISION_DISTANCE = 50;
    const SYNC_THROTTLE = 50; // ms between position syncs

    // Sprite animation constants
    const FRAME_COUNT = 24;
    const FRAME_WIDTH = 100 / (FRAME_COUNT - 1);  // % per frame
    const FRAME_HEIGHT = 100 / 3;  // 3 rows for directions
    const STANDING_FRAME = 7;

    // Direction to sprite row mapping
    const DIRECTION_ROW = {
        d: 0,  // right
        a: 1,  // left
        w: 2,  // up
        s: 3   // down (standing row)
    };

    const keys = { w: false, a: false, s: false, d: false };

    let playerX = 400;
    let playerY = 300;
    let currentRoom = 'Start';
    let playerEl = null;
    let otherPlayersContainer = null;
    let gameLoop = null;
    let lastSync = 0;
    let chattingWith = null;

    // Animation state
    let currentFrame = STANDING_FRAME;
    let currentDirection = 's'; // facing down by default
    let isMoving = false;
    let controlsBound = false; // Prevent multiple bindings

    // Expose for external access
    window.topDownGame = {
        getPosition: () => ({ x: playerX, y: playerY, room: currentRoom }),
        setRoom: (room) => { currentRoom = room; syncPosition(true); },
        closeChat: closeChat
    };

    function init() {
        playerEl = document.getElementById('player');
        otherPlayersContainer = document.getElementById('other-players');

        if (!playerEl) {
            setTimeout(init, 100);
            return;
        }

        // Get current room from passage name
        if (State && State.passage) {
            currentRoom = State.passage;
        }

        // Load position from state if available
        const userId = State?.variables?.userId;
        if (userId && State.variables.users?.[userId]) {
            const user = State.variables.users[userId];
            playerX = user.x ?? 400;
            playerY = user.y ?? 300;
        }

        updatePlayerPosition();
        startGameLoop();
        bindControls();

        // Initial sync with room
        syncPosition(true);

        console.log('[GAME] Top-Down Explorer initialized in room:', currentRoom);
    }

    function bindControls() {
        if (controlsBound) return;
        controlsBound = true;

        console.log('[GAME] Binding controls...');

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (keys.hasOwnProperty(key)) {
                keys[key] = true;
                e.preventDefault();
            }
            // ESC to close chat
            if (e.key === 'Escape' && chattingWith) {
                closeChat();
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (keys.hasOwnProperty(key)) {
                keys[key] = false;
            }
        });
    }

    function startGameLoop() {
        if (gameLoop) {
            console.log('[GAME] Game loop already running');
            return;
        }

        console.log('[GAME] Starting game loop...');
        let frameCount = 0;

        gameLoop = setInterval(() => {
            // Don't move while chatting
            if (chattingWith) {
                isMoving = false;
                updateSprite();
                return;
            }

            let moved = false;

            // Track direction based on last key pressed
            if (keys.w && playerY > PLAYER_HEIGHT/2) {
                playerY -= SPEED;
                currentDirection = 'w';
                moved = true;
            }
            if (keys.s && playerY < 600 - PLAYER_HEIGHT/2) {
                playerY += SPEED;
                currentDirection = 's';
                moved = true;
            }
            if (keys.a && playerX > PLAYER_WIDTH/2) {
                playerX -= SPEED;
                currentDirection = 'a';
                moved = true;
            }
            if (keys.d && playerX < 800 - PLAYER_WIDTH/2) {
                playerX += SPEED;
                currentDirection = 'd';
                moved = true;
            }

            isMoving = moved;

            if (moved) {
                updatePlayerPosition();
                syncPosition(false);
                checkPlayerCollisions();
            }

            // Update sprite animation (throttled to ~12fps for smoother animation)
            frameCount++;
            if (frameCount % 3 === 0) {
                updateSprite();
            }

            // Always render other players (they might move)
            renderOtherPlayers();
        }, 16); // ~60fps
    }

    function updatePlayerPosition() {
        if (playerEl) {
            playerEl.style.left = playerX + 'px';
            playerEl.style.top = playerY + 'px';
        }
    }

    function updateSprite() {
        if (!playerEl) return;

        if (isMoving) {
            // Cycle through animation frames
            currentFrame = (currentFrame + 1) % FRAME_COUNT;
        } else {
            // Standing pose
            currentFrame = STANDING_FRAME;
        }

        const row = DIRECTION_ROW[currentDirection] ?? 3;
        const xPos = FRAME_WIDTH * currentFrame;
        const yPos = FRAME_HEIGHT * row;

        playerEl.style.backgroundPositionX = `${xPos}%`;
        playerEl.style.backgroundPositionY = `${yPos}%`;
    }

    function updateOtherPlayerSprite(spriteEl, data) {
        // Other players show their direction based on their last movement
        const row = DIRECTION_ROW[data.direction] ?? 3;
        const xPos = FRAME_WIDTH * STANDING_FRAME;
        const yPos = FRAME_HEIGHT * row;

        spriteEl.style.backgroundPositionX = `${xPos}%`;
        spriteEl.style.backgroundPositionY = `${yPos}%`;
    }

    function syncPosition(force = false) {
        const now = Date.now();
        if (!force && now - lastSync < SYNC_THROTTLE) return;
        lastSync = now;

        if (window.sendStateUpdate && State?.variables?.userId) {
            const userId = State.variables.userId;
            // Sync as a single object to reduce server calls
            const playerData = {
                x: Math.round(playerX),
                y: Math.round(playerY),
                room: currentRoom,
                direction: currentDirection,
                name: State.variables.users?.[userId]?.name || userId,
                lastSeen: now
            };
            window.sendStateUpdate(`$users["${userId}"]`, playerData);
        }
    }

    function renderOtherPlayers() {
        if (!otherPlayersContainer || !State?.variables?.users) return;

        const myId = State.variables.userId;
        const users = State.variables.users;

        // Clear old sprites
        otherPlayersContainer.innerHTML = '';

        // Render each other player in the same room
        for (const [id, data] of Object.entries(users)) {
            if (id === myId) continue;
            if (data.room !== currentRoom) continue;

            // Skip stale players (no update in 30 seconds)
            if (data.lastSeen && Date.now() - data.lastSeen > 30000) continue;

            const sprite = document.createElement('div');
            sprite.className = 'other-player sprite';
            sprite.style.left = (data.x || 400) + 'px';
            sprite.style.top = (data.y || 300) + 'px';
            sprite.dataset.playerId = id;
            sprite.title = data.name || id;

            // Set sprite direction
            updateOtherPlayerSprite(sprite, data);

            // Add name label
            const label = document.createElement('span');
            label.className = 'player-label';
            label.textContent = data.name || id;
            sprite.appendChild(label);

            otherPlayersContainer.appendChild(sprite);
        }
    }

    function checkPlayerCollisions() {
        if (!State?.variables?.users || chattingWith) return;

        const myId = State.variables.userId;
        const users = State.variables.users;

        for (const [id, data] of Object.entries(users)) {
            if (id === myId) continue;
            if (data.room !== currentRoom) continue;

            const dx = playerX - (data.x || 0);
            const dy = playerY - (data.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < COLLISION_DISTANCE) {
                openChat(id, data);
                break;
            }
        }
    }

    function openChat(otherId, otherData) {
        chattingWith = otherId;

        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;

        const otherName = otherData.name || otherId;
        chatBox.innerHTML = `
            <div class="chat-header">
                <span>Chat with <strong>${otherName}</strong></span>
                <button onclick="window.topDownGame.closeChat()">&times;</button>
            </div>
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input">
                <input type="text" id="chat-input-field" placeholder="Type a message..." />
                <button onclick="window.topDownGame.sendMessage()">Send</button>
            </div>
        `;
        chatBox.classList.add('active');

        // Focus input
        document.getElementById('chat-input-field')?.focus();

        // Bind enter key
        document.getElementById('chat-input-field')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                window.topDownGame.sendMessage();
            }
        });

        console.log('[GAME] Chat opened with:', otherName);
    }

    function closeChat() {
        chattingWith = null;
        const chatBox = document.getElementById('chat-box');
        if (chatBox) {
            chatBox.classList.remove('active');
            chatBox.innerHTML = '';
        }
        console.log('[GAME] Chat closed');
    }

    // Expose send message function
    window.topDownGame.sendMessage = function() {
        const input = document.getElementById('chat-input-field');
        const messagesEl = document.getElementById('chat-messages');
        if (!input || !messagesEl) return;

        const text = input.value.trim();
        if (!text) return;

        const myName = State.variables.users?.[State.variables.userId]?.name || State.variables.userId;

        // Add message to local chat
        const msgEl = document.createElement('div');
        msgEl.className = 'chat-message mine';
        msgEl.innerHTML = `<strong>${myName}:</strong> ${text}`;
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // TODO: Sync chat messages via Theyr for the other player to see
        // For now, just local display

        input.value = '';
    };

    // Wait for SugarCube to be ready
    function waitForSugarCube() {
        console.log('[GAME] waitForSugarCube called, State:', typeof State, '$:', typeof $);
        if (typeof State !== 'undefined' && typeof $ !== 'undefined') {
            // SugarCube is ready, bind to passage events
            $(document).on(':passageend', () => {
                if (State?.passage) {
                    currentRoom = State.passage;
                }
                init();
            });

            // If passage already rendered, init now
            if (State.passage) {
                currentRoom = State.passage;
                init();
            }
        } else {
            // SugarCube not ready yet, retry
            setTimeout(waitForSugarCube, 50);
        }
    }

    // Start waiting for SugarCube
    console.log('[GAME] Document readyState:', document.readyState);
    if (document.readyState === 'complete') {
        console.log('[GAME] Document complete, calling waitForSugarCube immediately');
        waitForSugarCube();
    } else {
        console.log('[GAME] Document not complete, adding load listener');
        window.addEventListener('load', waitForSugarCube);
    }
    console.log('[GAME] IIFE complete');
})();
