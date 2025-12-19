// frontend/js/watchparty.js

// Initialize Socket.IO connection
// Use window.location.origin to support cross-device connections
const socket = io(window.location.origin);

let currentRoom = null;
let isHost = false;
let isInWatchparty = false;

// Get current profile from localStorage
function getCurrentProfile() {
    const profileData = localStorage.getItem('vstream-current-profile');
    if (profileData) {
        try {
            const profile = JSON.parse(profileData);
            return profile.name || 'default';
        } catch (e) {
            return profileData || 'default';
        }
    }
    return 'default';
}

// Load and display active rooms
async function loadActiveRooms() {
    try {
        const response = await fetch('/api/watchparty/list');
        if (!response.ok) {
            console.error('Failed to load rooms');
            return;
        }

        const data = await response.json();
        const rooms = data.rooms || [];

        const container = document.getElementById('rooms-container');
        const noRoomsMsg = document.getElementById('no-rooms');

        if (rooms.length === 0) {
            container.innerHTML = '';
            noRoomsMsg.classList.remove('hidden');
        } else {
            noRoomsMsg.classList.add('hidden');
            container.innerHTML = rooms.map(room => `
                <div class="bg-brand-light-gray rounded-xl p-6 border border-gray-700 hover:border-brand-red transition duration-200">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <h3 class="font-bold text-lg mb-1">${escapeHtml(room.media_title)}</h3>
                            <p class="text-gray-400 text-sm">${room.media_type === 'movie' ? 'Movie' : 'TV Show'}</p>
                        </div>
                        <div class="flex items-center gap-2 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>${room.participant_count}</span>
                        </div>
                    </div>
                    <div class="space-y-2 mb-4">
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-400">Host:</span>
                            <span class="font-semibold">${escapeHtml(room.host)}</span>
                        </div>
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-gray-400">Room Code:</span>
                            <span class="font-mono font-bold text-brand-red">${room.room_code}</span>
                        </div>
                    </div>
                    <button 
                        onclick="joinRoom('${room.room_code}')"
                        class="w-full py-2 bg-brand-red hover:bg-red-700 rounded-lg font-semibold transition duration-200"
                    >
                        Join Room
                    </button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

// Join a room
async function joinRoom(roomCode) {
    try {
        // First verify the room exists
        const response = await fetch(`/api/watchparty/${roomCode}`);
        if (!response.ok) {
            showJoinError('Room not found');
            return;
        }

        const roomData = await response.json();
        
        // Redirect to the watch party room page
        window.location.href = `/watchparty-room.html?room=${roomCode}`;
        
    } catch (error) {
        console.error('Error joining room:', error);
        showJoinError('Failed to join room');
    }
}

// Show join error message
function showJoinError(message) {
    const errorDiv = document.getElementById('join-error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Load active rooms
    loadActiveRooms();

    // Join room button handler
    const joinBtn = document.getElementById('join-room-btn');
    const roomCodeInput = document.getElementById('room-code-input');

    if (joinBtn) {
        joinBtn.addEventListener('click', () => {
            const roomCode = roomCodeInput.value.trim().toUpperCase();
            if (roomCode.length === 6) {
                joinRoom(roomCode);
            } else {
                showJoinError('Please enter a valid 6-character room code');
            }
        });
    }

    // Allow Enter key to join
    if (roomCodeInput) {
        roomCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinBtn.click();
            }
        });

        // Auto-uppercase input
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    // Refresh rooms button
    const refreshBtn = document.getElementById('refresh-rooms-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadActiveRooms();
        });
    }

    // Auto-refresh rooms every 10 seconds
    setInterval(loadActiveRooms, 10000);
});

// Socket.IO event listeners for real-time updates
socket.on('connect', () => {
    console.log('Connected to watchparty server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from watchparty server');
});

socket.on('error', (data) => {
    console.error('Watchparty error:', data.message);
    showJoinError(data.message);
});
