document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('music-search-input');
    const resultsList = document.getElementById('music-results-list');
    const resultsSection = document.getElementById('results-section');
    const emptyState = document.getElementById('empty-state');
    const player = document.getElementById('music-player');
    const playerContainer = document.getElementById('music-player-container');
    const playerTrackImage = document.getElementById('player-track-image');
    const playerTrackTitle = document.getElementById('player-track-title');
    const playerTrackArtist = document.getElementById('player-track-artist');
    const closePlayerBtn = document.getElementById('close-player');
    const prevBtn = document.getElementById('player-prev-btn');
    const nextBtn = document.getElementById('player-next-btn');
    const modalCancelClear = document.getElementById('modal-cancel-clear');
    const modalConfirmClear = document.getElementById('modal-confirm-clear');

    // Queue Elements
    const queuePanel = document.getElementById('queue-panel');
    const toggleQueueBtn = document.getElementById('toggle-queue-btn');
    const closeQueueBtn = document.getElementById('close-queue-btn');
    const clearQueueBtn = document.getElementById('clear-queue-btn');
    const queueList = document.getElementById('queue-list');
    const queueEmpty = document.getElementById('queue-empty');
    const queueCount = document.getElementById('queue-count');
    const queueBadge = document.getElementById('queue-badge');
    const queueNowPlaying = document.getElementById('queue-now-playing');
    const queueCurrentImage = document.getElementById('queue-current-image');
    const queueCurrentTitle = document.getElementById('queue-current-title');
    const queueCurrentArtist = document.getElementById('queue-current-artist');
    const clearQueueModal = document.getElementById('clear-queue-modal');
    
    // Lyrics Elements
    const lyricsPanel = document.getElementById('lyrics-panel');
    const toggleLyricsBtn = document.getElementById('toggle-lyrics-btn');
    const closeLyricsBtn = document.getElementById('close-lyrics-btn');
    const lyricsTrackImage = document.getElementById('lyrics-track-image');
    const lyricsTrackTitle = document.getElementById('lyrics-track-title');
    const lyricsTrackArtist = document.getElementById('lyrics-track-artist');
    const lyricsLoading = document.getElementById('lyrics-loading');
    const lyricsText = document.getElementById('lyrics-text');
    const lyricsError = document.getElementById('lyrics-error');
    const mainContent = document.getElementById('main-content');

    // Playlists Elements
    const playlistsPanel = document.getElementById('playlists-panel');
    const togglePlaylistsBtn = document.getElementById('toggle-playlists-btn');
    const closePlaylistsBtn = document.getElementById('close-playlists-btn');
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    const createPlaylistEmptyBtn = document.getElementById('create-playlist-empty-btn');
    const playlistsList = document.getElementById('playlists-list');
    const playlistsEmpty = document.getElementById('playlists-empty');
    const playlistsCount = document.getElementById('playlists-count');
    const playlistsBadge = document.getElementById('playlists-badge');
    const createPlaylistModal = document.getElementById('create-playlist-modal');
    const playlistNameInput = document.getElementById('playlist-name-input');
    const modalCancelCreatePlaylist = document.getElementById('modal-cancel-create-playlist');
    const modalConfirmCreatePlaylist = document.getElementById('modal-confirm-create-playlist');
    const addToPlaylistModal = document.getElementById('add-to-playlist-modal');
    const playlistSelectionList = document.getElementById('playlist-selection-list');
    const modalCancelAddToPlaylist = document.getElementById('modal-cancel-add-to-playlist');
    const deletePlaylistModal = document.getElementById('delete-playlist-modal');
    const modalCancelDeletePlaylist = document.getElementById('modal-cancel-delete-playlist');
    const modalConfirmDeletePlaylist = document.getElementById('modal-confirm-delete-playlist');

    // State
    let currentTrack = null;
    let musicQueue = [];
    let playHistory = [];
    let selectedQueueIndex = -1;
    let playlists = [];
    let selectedPlaylistId = null;
    let trackToAdd = null;
    let playlistToDelete = null; 
    const loadQueue = () => {
        try {
            const saved = localStorage.getItem('heimdall-music-queue');
            if (saved) {
                musicQueue = JSON.parse(saved);
                updateQueueUI();
            }
        } catch (e) {
            console.error('Failed to load queue:', e);
        }
    };

    // Save queue to localStorage
    const saveQueue = () => {
        try {
            localStorage.setItem('heimdall-music-queue', JSON.stringify(musicQueue));
        } catch (e) {
            console.error('Failed to save queue:', e);
        }
    };

    // Load playlists from localStorage
    const loadPlaylists = () => {
        try {
            const saved = localStorage.getItem('heimdall-music-playlists');
            if (saved) {
                playlists = JSON.parse(saved);
                updatePlaylistsUI();
            }
        } catch (e) {
            console.error('Failed to load playlists:', e);
        }
    };

    // Save playlists to localStorage
    const savePlaylists = () => {
        try {
            localStorage.setItem('heimdall-music-playlists', JSON.stringify(playlists));
        } catch (e) {
            console.error('Failed to save playlists:', e);
        }
    };

    // Create new playlist
    const createPlaylist = (name) => {
        if (!name || name.trim().length === 0) {
            showNotification('Playlist name cannot be empty', 'warning');
            return null;
        }

        const playlist = {
            id: Date.now().toString(),
            name: name.trim(),
            tracks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        playlists.push(playlist);
        savePlaylists();
        updatePlaylistsUI();
        showNotification(`Playlist "${name}" created`, 'success');
        return playlist;
    };

    // Delete playlist
    const deletePlaylist = (playlistId) => {
        const index = playlists.findIndex(p => p.id === playlistId);
        if (index === -1) return;

        const playlistName = playlists[index].name;
        playlists.splice(index, 1);
        savePlaylists();
        updatePlaylistsUI();
        showNotification(`Playlist "${playlistName}" deleted`, 'info');
    };

    // Add track to playlist
    const addTrackToPlaylist = (playlistId, track) => {
        const playlist = playlists.find(p => p.id === playlistId);
        if (!playlist) {
            showNotification('Playlist not found', 'error');
            return;
        }

        // Check if track already exists in playlist
        const exists = playlist.tracks.some(t => t.id === track.id);
        if (exists) {
            showNotification(`Already in "${playlist.name}"`, 'warning');
            return;
        }

        playlist.tracks.push(track);
        playlist.updatedAt = new Date().toISOString();
        savePlaylists();
        updatePlaylistsUI();
        showNotification(`Added to "${playlist.name}"`, 'success');
    };

    // Remove track from playlist
    const removeTrackFromPlaylist = (playlistId, trackIndex) => {
        const playlist = playlists.find(p => p.id === playlistId);
        if (!playlist) return;

        playlist.tracks.splice(trackIndex, 1);
        playlist.updatedAt = new Date().toISOString();
        savePlaylists();
        updatePlaylistsUI();
    };

    // Play playlist (load all tracks into queue)
    const playPlaylist = (playlistId) => {
        const playlist = playlists.find(p => p.id === playlistId);
        if (!playlist || playlist.tracks.length === 0) {
            showNotification('Playlist is empty', 'warning');
            return;
        }

        // Add all tracks to queue
        playlist.tracks.forEach(track => {
            if (!musicQueue.some(t => t.id === track.id)) {
                musicQueue.push(track);
            }
        });

        saveQueue();
        updateQueueUI();
        showNotification(`Loaded "${playlist.name}" to queue`, 'success');

        // If nothing is playing, start playing
        if (!currentTrack) {
            playNext();
        }
    };

    // Set navbar profile image (No changes)
    const setNavbarProfileImage = () => {
        const img = document.getElementById('nav-profile-img');
        if (!img) return;

        const raw = localStorage.getItem('vstream-current-profile');
        if (!raw) return;

        try {
            const profile = JSON.parse(raw);
            if (profile && profile.image) {
                img.src = profile.image;
                return;
            }
        } catch (e) {}

        const name = raw;
        if (typeof name === 'string' && name.length > 0) {
            const initial = name.charAt(0).toUpperCase();
            img.src = `https://placehold.co/40x40/e50914/white?text=${initial}`;
        }
    };

    setNavbarProfileImage();

    // Format duration (No changes)
    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Debounce function (No changes)
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    // Parse track info (No changes)
    const parseTrackInfo = (youtubeTitle, channelName) => {
        let artist = channelName || 'Unknown Artist';
        let title = youtubeTitle;

        const cleanTitle = (str) => {
            return str
                .replace(/\(official\s*(video|audio|music\s*video|lyric\s*video)\)/gi, '')
                .replace(/\[official\s*(video|audio|music\s*video|lyric\s*video)\]/gi, '')
                .replace(/official\s*(video|audio|music\s*video|lyric\s*video)/gi, '')
                .replace(/\(lyric(s)?\s*video\)/gi, '')
                .replace(/\[lyric(s)?\s*video\]/gi, '')
                .replace(/lyric(s)?\s*video/gi, '')
                .replace(/\(.*?\d{4}.*?remaster(ed)?\)/gi, '')
                .replace(/\(.*?remaster(ed)?\)/gi, '')
                .replace(/\[.*?remaster(ed)?\]/gi, '')
                .replace(/\(.*?version\)/gi, '')
                .replace(/\[.*?version\]/gi, '')
                .replace(/\(.*?remix\)/gi, '')
                .replace(/\[.*?remix\]/gi, '')
                .replace(/\(.*?edit\)/gi, '')
                .replace(/\[.*?edit\]/gi, '')
                .replace(/【.*?】/g, '')
                .replace(/〈.*?〉/g, '')
                .replace(/\(ft\.?.*?\)/gi, '')
                .replace(/\[ft\.?.*?\]/gi, '')
                .replace(/feat\.?\s+.*/gi, '')
                .replace(/\s*-\s*topic$/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        if (youtubeTitle.includes(' - ')) {
            const parts = youtubeTitle.split(' - ');
            if (parts.length >= 2) {
                artist = cleanTitle(parts[0]);
                title = cleanTitle(parts.slice(1).join(' - '));
            }
        } else if (youtubeTitle.includes(': ')) {
            const parts = youtubeTitle.split(': ');
            if (parts.length >= 2) {
                artist = cleanTitle(parts[0]);
                title = cleanTitle(parts.slice(1).join(': '));
            }
        } else if (youtubeTitle.toLowerCase().includes(' by ')) {
            const index = youtubeTitle.toLowerCase().indexOf(' by ');
            title = cleanTitle(youtubeTitle.substring(0, index));
            artist = cleanTitle(youtubeTitle.substring(index + 4));
        } else {
            title = cleanTitle(youtubeTitle);
        }

        artist = artist
            .replace(/VEVO$/i, '')
            .replace(/official$/i, '')
            .replace(/\s*-\s*topic$/i, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!artist || artist === 'Unknown Artist' || artist.length === 0) {
            artist = channelName || 'Unknown Artist';
        }

        return { artist, title };
    };

    // Search music (No changes)
    async function searchMusic(query) {
        if (!query || query.trim().length < 2) {
            resultsSection.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        resultsList.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red"></div>
            </div>
        `;

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/music/search/${encodeURIComponent(query)}`);
            const results = await response.json();

            resultsList.innerHTML = '';

            if (results.length === 0) {
                resultsList.innerHTML = `
                    <div class="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p class="text-gray-400 text-lg">No results found for "${query}"</p>
                        <p class="text-gray-500 text-sm mt-2">Try a different search term</p>
                    </div>
                `;
                return;
            }

            results.forEach(track => {
                const trackCard = document.createElement('div');
                trackCard.className = 'flex items-center p-4 bg-brand-gray rounded-xl hover:bg-brand-light-gray transition-all duration-200 group';
                
                const duration = track.duration ? formatDuration(track.duration) : '';
                
                trackCard.innerHTML = `
                    <img src="${track.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image'}" 
                         alt="${track.title}" 
                         class="w-20 h-20 rounded-lg object-cover shadow-md mr-4 flex-shrink-0">
                    <div class="flex-1 min-w-0 mr-4">
                        <h3 class="font-bold text-lg truncate group-hover:text-brand-red transition-colors duration-200">
                            ${track.title}
                        </h3>
                        <p class="text-sm text-gray-400 truncate">${track.artist}</p>
                        ${duration ? `<p class="text-xs text-gray-500 mt-1">${duration}</p>` : ''}
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="play-btn p-2 hover:bg-brand-light-gray rounded-lg transition-colors" title="Play now">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-500 group-hover:text-brand-red transition-colors duration-200" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                        </button>
                        <button class="add-queue-btn p-2 hover:bg-brand-light-gray rounded-lg transition-colors" title="Add to queue">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 hover:text-brand-red transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                        <button class="add-to-playlist-btn p-2 hover:bg-brand-light-gray rounded-lg transition-colors" title="Add to playlist">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-500 hover:text-brand-red transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </button>
                    </div>
                `;
                
                const playBtn = trackCard.querySelector('.play-btn');
                const addQueueBtn = trackCard.querySelector('.add-queue-btn');
                const addToPlaylistBtn = trackCard.querySelector('.add-to-playlist-btn');

                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playTrack(track, false);
                });

                addQueueBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    addToQueue(track);
                });

                addToPlaylistBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openAddToPlaylistModal(track);
                });

                resultsList.appendChild(trackCard);
            });

        } catch (error) {
            console.error('Search failed:', error);
            resultsList.innerHTML = `
                <div class="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p class="text-red-400 text-lg">Error loading results</p>
                    <p class="text-gray-500 text-sm mt-2">Please try again later</p>
                </div>
            `;
        }
    }

    async function playTrack(track, fromQueue = false) {
        
        // If a track is already playing and it's a *different* track, add old track to history
        if (currentTrack && (!track || currentTrack.id !== track.id)) {
            playHistory.push(currentTrack);
        }

        // If no track is provided (e.g., end of queue), stop the player
        if (!track) {
            player.pause();
            player.src = '';
            playerContainer.classList.add('hidden');
            currentTrack = null;
            return;
        }

        currentTrack = track;
        
        playerTrackImage.src = track.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image';
        playerTrackTitle.textContent = track.title;
        playerTrackArtist.textContent = track.artist;
        playerContainer.classList.remove('hidden');
        
        // Update queue now playing
        if (queueNowPlaying) {
            queueCurrentImage.src = track.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image';
            queueCurrentTitle.textContent = track.title;
            queueCurrentArtist.textContent = track.artist;
            queueNowPlaying.classList.remove('hidden');
        }
        
        player.src = '';
        player.innerHTML = '<source src="" type="audio/mpeg">';
        
        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/music/stream?source=${track.source}&id=${encodeURIComponent(track.id)}`
            );
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            player.src = data.stream_url;
            player.play();

            // If lyrics panel is open, refresh them
            if (!lyricsPanel.classList.contains('hidden')) {
                toggleLyricsPanel(); // This will close it
                toggleLyricsPanel(); // This will re-open it with the new track info
            }


        } catch (error) {
            console.error('Failed to get stream URL:', error);
            
            playerTrackTitle.textContent = 'Error Playing Track';
            playerTrackArtist.textContent = error.message || 'Could not load audio stream';
            
            setTimeout(() => {
                // Only hide if it's still the track that failed
                if (currentTrack && currentTrack.id === track.id) {
                    playerContainer.classList.add('hidden');
                    currentTrack = null;
                }
            }, 3000);
        }
    }

    function addToQueue(track) {
        // Check if already in queue
        const exists = musicQueue.some(t => t.id === track.id);
        if (exists) {
            showNotification('Already in queue', 'warning');
            return;
        }

        musicQueue.push(track);
        saveQueue();
        updateQueueUI();
        showNotification('Added to queue', 'success');

        // If nothing is playing and this is the first song, play it
        if (!currentTrack && musicQueue.length === 1) {
            playNext();
        }
    }

    // Remove from queue (No changes)
    function removeFromQueue(index) {
        musicQueue.splice(index, 1);
        saveQueue();
        updateQueueUI();
    }

    function clearQueue() {
        if (musicQueue.length === 0) return;
        
        musicQueue = [];
        playHistory = [];
        saveQueue();
        updateQueueUI();
        showNotification('Queue cleared', 'info');
        
        // Hide the modal after clearing
        clearQueueModal.classList.add('hidden');
    }

    function playNext(manualSkip = false) {
        if (musicQueue.length === 0) {
            console.log('Queue is empty, stopping player.');
            playTrack(null); // Stop player
            showNotification('End of queue', 'info');
            return;
        }

        const nextTrack = musicQueue.shift(); // Remove first item
        saveQueue();
        updateQueueUI();
        playTrack(nextTrack, true);
    }

    function playPrevious() {
        if (playHistory.length === 0) {
            console.log('No previous track in history');
            showNotification('No previous songs in history', 'info');
            return;
        }

        // If a track is currently playing, put it back at the *start* of the 'up next' queue
        if (currentTrack) {
            musicQueue.unshift(currentTrack);
            saveQueue(); // Save the modified queue
        }

        const prevTrack = playHistory.pop(); // Get the last played track
        playTrack(prevTrack, true); // Play it
        updateQueueUI(); // Update UI to show the added track
    }

    function moveQueueItem(index, direction) {
        if (direction === 'up') {
            if (index === 0) return; // Can't move top item up
            // Swap item with the one above it
            [musicQueue[index - 1], musicQueue[index]] = [musicQueue[index], musicQueue[index - 1]];
            selectedQueueIndex = index - 1; // Keep the item selected
        } 
        else if (direction === 'down') {
            if (index === musicQueue.length - 1) return; // Can't move last item down
            // Swap item with the one below it
            [musicQueue[index], musicQueue[index + 1]] = [musicQueue[index + 1], musicQueue[index]];
            selectedQueueIndex = index + 1; // Keep the item selected
        }

        saveQueue();
        updateQueueUI();
    }

    function updateQueueUI() {
        
        const count = musicQueue.length;
        queueCount.textContent = `(${count})`;
        
        if (count > 0) {
            queueBadge.textContent = count;
            queueBadge.classList.remove('hidden');
            queueList.classList.remove('hidden');
            queueEmpty.classList.add('hidden');
        } else {
            queueBadge.classList.add('hidden');
            queueList.classList.add('hidden');
            queueEmpty.classList.remove('hidden');
            selectedQueueIndex = -1;
        }

        queueList.innerHTML = '';

        musicQueue.forEach((track, index) => {
            const queueItem = document.createElement('div');
            const isSelected = index === selectedQueueIndex;
            queueItem.className = `p-3 bg-brand-black rounded-lg transition-all duration-200 group queue-item-enter ${isSelected ? 'bg-brand-light-gray' : 'hover:bg-brand-light-gray'}`;
            queueItem.dataset.index = index; // Store index
            
            queueItem.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-gray-500 w-6 text-sm queue-item-number">${index + 1}</span>
                <img src="${track.image || 'https://placehold.co/40x40/1a1d23/666?text=No+Image'}" 
                     alt="${track.title}" 
                     class="w-10 h-10 rounded object-cover shadow-md">
                <div class="flex-1 min-w-0"> 
                    <h4 class="font-semibold text-sm truncate">${track.title}</h4>
                    <p class="text-xs text-gray-400 truncate">${track.artist}</p>
                </div>

                <button class="play-queue-btn p-2 hover:bg-brand-gray rounded-full transition-all" title="Play from here">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-brand-red" fill="currentColor" viewBox="0 0 20 20">
                       <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                </button>
                <button class="remove-queue-btn p-2 hover:bg-brand-gray rounded-full transition-all" title="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            ${isSelected ? `
            <div class="flex justify-end space-x-2 mt-2 pt-2 border-t border-brand-gray">
                <button class="move-up-btn flex-1 text-xs py-1 px-2 rounded bg-brand-gray hover:bg-brand-red disabled:opacity-50 disabled:cursor-not-allowed" title="Move Up" ${index === 0 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                </button>
                <button class="move-down-btn flex-1 text-xs py-1 px-2 rounded bg-brand-gray hover:bg-brand-red disabled:opacity-50 disabled:cursor-not-allowed" title="Move Down" ${index === musicQueue.length - 1 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
            ` : ''}
        `;
            
            queueItem.addEventListener('click', (e) => {
                // Don't play if clicking remove or drag handle
                if (e.target.closest('button')) {
                    return;
                }

                const clickedIndex = parseInt(queueItem.dataset.index, 10);

                // If already selected, deselect. Otherwise, select.
                if (selectedQueueIndex === clickedIndex) {
                    selectedQueueIndex = -1;
                } else {
                    selectedQueueIndex = clickedIndex;
                }
                updateQueueUI(); // Re-render to show/hide buttons
            });
            
            // Play button
            const playBtn = queueItem.querySelector('.play-queue-btn');
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent item click
                const clickedIndex = parseInt(queueItem.dataset.index, 10);

                // Get all tracks *before* this one
                const tracksToHistory = musicQueue.splice(0, clickedIndex);

                // Add all the tracks we just *skipped* in the queue to history
                if (tracksToHistory.length > 0) {
                    playHistory.push(...tracksToHistory);
                }

                // Now, musicQueue[0] is the track that was clicked.
                playNext(); // playNext will pop musicQueue[0], save, play, and update UI
            });

            // Remove button
            const removeBtn = queueItem.querySelector('.remove-queue-btn');
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent item click
                const clickedIndex = parseInt(queueItem.dataset.index, 10);

                // If removing the selected item, reset selection
                if (selectedQueueIndex === clickedIndex) {
                    selectedQueueIndex = -1;
                }

                removeFromQueue(clickedIndex);
            });

            // Move buttons (only if they exist)
            const moveUpBtn = queueItem.querySelector('.move-up-btn');
            if (moveUpBtn) {
                moveUpBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    moveQueueItem(parseInt(queueItem.dataset.index, 10), 'up');
                });
            }

            const moveDownBtn = queueItem.querySelector('.move-down-btn');
            if (moveDownBtn) {
                moveDownBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    moveQueueItem(parseInt(queueItem.dataset.index, 10), 'down');
                });
            }

            queueList.appendChild(queueItem);
        });
    }

    // Show notification (No changes)
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const colors = {
            success: 'bg-green-600',
            warning: 'bg-yellow-600',
            info: 'bg-blue-600',
            error: 'bg-red-600'
        };
        
        notification.className = `fixed bottom-24 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Toggle queue panel (No changes)
    function toggleQueuePanel() {
        const isHidden = queuePanel.classList.contains('hidden');

        if (isHidden) {
            closeLyricsPanel(); // Close lyrics if open
            closePlaylistsPanel(); // Close playlists if open
            queuePanel.classList.remove('hidden');
            if (window.innerWidth >= 768) {
                mainContent.style.marginRight = '400px';
            }
        } else {
            queuePanel.classList.add('hidden');
            mainContent.style.marginRight = '0';
        }
    }

    // Close queue panel (No changes)
    function closeQueuePanel() {
        queuePanel.classList.add('hidden');
        mainContent.style.marginRight = '0';
    }

    // Fetch lyrics (No changes)
    async function fetchLyrics(artist, title) {
        lyricsLoading.classList.remove('hidden');
        lyricsText.classList.add('hidden');
        lyricsError.classList.add('hidden');

        console.log(`Fetching lyrics for: "${artist}" - "${title}"`);

        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/music/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
            );

            if (response.status === 404) {
                throw new Error('Lyrics not found');
            }
            
            if (response.status === 504) {
                throw new Error('Lyrics service timed out');
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch lyrics (${response.status})`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            if (data.lyrics) {
                displayLyrics(data.lyrics);
            } else {
                throw new Error('No lyrics in response');
            }

        } catch (error) {
            console.error('Failed to fetch lyrics:', error);
            lyricsLoading.classList.add('hidden');
            lyricsError.classList.remove('hidden');
            
            const errorMsg = lyricsError.querySelector('p.text-gray-400');
            const errorDetail = lyricsError.querySelector('p.text-gray-500');
            
            if (error.message.includes('timeout') || error.message.includes('504')) {
                if (errorMsg) errorMsg.textContent = 'Lyrics service is slow';
                if (errorDetail) errorDetail.textContent = 'The lyrics service is taking too long. Try again later.';
            } else if (error.message.includes('not found') || error.message.includes('404')) {
                if (errorMsg) errorMsg.textContent = 'Lyrics not available';
                if (errorDetail) errorDetail.textContent = 'We couldn\'t find lyrics for this track';
            } else {
                if (errorMsg) errorMsg.textContent = 'Error loading lyrics';
                if (errorDetail) errorDetail.textContent = error.message || 'Please try again later';
            }
        }
    }

    // Display lyrics (No changes)
    function displayLyrics(lyricsString) {
        lyricsLoading.classList.add('hidden');
        lyricsText.classList.remove('hidden');
        lyricsText.innerHTML = '';

        const lines = lyricsString.split('\n');
        
        lines.forEach(line => {
            const lineDiv = document.createElement('div');
            lineDiv.className = 'lyrics-line text-white';
            lineDiv.textContent = line || '\u00A0';
            lyricsText.appendChild(lineDiv);
        });
    }

    // Toggle lyrics panel (No changes)
    function toggleLyricsPanel() {
        if (!currentTrack) {
            showNotification('Play a song to see lyrics', 'info');
            return;
        }

        const isHidden = lyricsPanel.classList.contains('hidden');

        if (isHidden) {
            closeQueuePanel(); // Close queue if open
            closePlaylistsPanel(); // Close playlists if open
            lyricsPanel.classList.remove('hidden');

            lyricsTrackImage.src = currentTrack.image || 'https://placehold.co/80x80/1a1d23/666?text=No+Image';
            lyricsTrackTitle.textContent = currentTrack.title;
            lyricsTrackArtist.textContent = currentTrack.artist;

            const { artist, title } = parseTrackInfo(currentTrack.title, currentTrack.artist);
            console.log(`Parsed: "${artist}" - "${title}"`);
            fetchLyrics(artist, title);

            if (window.innerWidth >= 768) {
                mainContent.style.marginRight = '400px';
            }
        } else {
            lyricsPanel.classList.add('hidden');
            mainContent.style.marginRight = '0';
        }
    }

    // Close lyrics panel (No changes)
    function closeLyricsPanel() {
        lyricsPanel.classList.add('hidden');
        mainContent.style.marginRight = '0';
    }

    // Update playlists UI
    function updatePlaylistsUI() {
        const count = playlists.length;
        playlistsCount.textContent = `(${count})`;

        if (count > 0) {
            playlistsBadge.textContent = count;
            playlistsBadge.classList.remove('hidden');
            playlistsList.classList.remove('hidden');
            playlistsEmpty.classList.add('hidden');
        } else {
            playlistsBadge.classList.add('hidden');
            playlistsList.classList.add('hidden');
            playlistsEmpty.classList.remove('hidden');
        }

        playlistsList.innerHTML = '';

        playlists.forEach((playlist) => {
            const playlistCard = document.createElement('div');
            playlistCard.className = 'bg-brand-black rounded-lg overflow-hidden transition-all duration-200 hover:bg-brand-light-gray';
            playlistCard.dataset.playlistId = playlist.id;

            const trackCount = playlist.tracks.length;
            const isExpanded = selectedPlaylistId === playlist.id;

            playlistCard.innerHTML = `
                <div class="p-4 cursor-pointer playlist-header">
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                            <h3 class="font-bold text-lg truncate">${playlist.name}</h3>
                            <p class="text-sm text-gray-400">${trackCount} track${trackCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${trackCount > 0 ? `
                            <button class="play-playlist-btn p-2 hover:bg-brand-gray rounded-full transition-all" title="Play all">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-brand-red" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                                </svg>
                            </button>
                            ` : ''}
                            <button class="delete-playlist-btn p-2 hover:bg-brand-gray rounded-full transition-all" title="Delete playlist">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
                ${isExpanded && trackCount > 0 ? `
                <div class="px-4 pb-4 space-y-2 playlist-tracks">
                    ${playlist.tracks.map((track, index) => `
                        <div class="flex items-center space-x-3 p-2 bg-brand-gray rounded-lg hover:bg-brand-light-gray transition-all group">
                            <span class="text-gray-500 w-6 text-sm">${index + 1}</span>
                            <img src="${track.image || 'https://placehold.co/40x40/1a1d23/666?text=No+Image'}"
                                 alt="${track.title}"
                                 class="w-10 h-10 rounded object-cover shadow-md">
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-sm truncate">${track.title}</h4>
                                <p class="text-xs text-gray-400 truncate">${track.artist}</p>
                            </div>
                            <button class="add-to-queue-btn p-2 hover:bg-brand-black rounded-full transition-all opacity-0 group-hover:opacity-100" data-track-index="${index}" title="Add to queue">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 hover:text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <button class="remove-from-playlist-btn p-2 hover:bg-brand-black rounded-full transition-all opacity-0 group-hover:opacity-100" data-track-index="${index}" title="Remove">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400 hover:text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            `;

            // Event listeners for playlist card
            const header = playlistCard.querySelector('.playlist-header');
            header.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;

                if (selectedPlaylistId === playlist.id) {
                    selectedPlaylistId = null;
                } else {
                    selectedPlaylistId = playlist.id;
                }
                updatePlaylistsUI();
            });

            // Play playlist button
            const playBtn = playlistCard.querySelector('.play-playlist-btn');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playPlaylist(playlist.id);
                });
            }

            // Delete playlist button
            const deleteBtn = playlistCard.querySelector('.delete-playlist-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                playlistToDelete = playlist.id;
                deletePlaylistModal.classList.remove('hidden');
            });

            // Add to queue buttons for each track
            const addToQueueBtns = playlistCard.querySelectorAll('.add-to-queue-btn');
            addToQueueBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const trackIndex = parseInt(btn.dataset.trackIndex, 10);
                    addToQueue(playlist.tracks[trackIndex]);
                });
            });

            // Remove from playlist buttons
            const removeFromPlaylistBtns = playlistCard.querySelectorAll('.remove-from-playlist-btn');
            removeFromPlaylistBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const trackIndex = parseInt(btn.dataset.trackIndex, 10);
                    removeTrackFromPlaylist(playlist.id, trackIndex);
                });
            });

            playlistsList.appendChild(playlistCard);
        });
    }

    // Toggle playlists panel
    function togglePlaylistsPanel() {
        const isHidden = playlistsPanel.classList.contains('hidden');

        if (isHidden) {
            closeQueuePanel();
            closeLyricsPanel();
            playlistsPanel.classList.remove('hidden');
            if (window.innerWidth >= 768) {
                mainContent.style.marginRight = '400px';
            }
        } else {
            playlistsPanel.classList.add('hidden');
            mainContent.style.marginRight = '0';
        }
    }

    // Close playlists panel
    function closePlaylistsPanel() {
        playlistsPanel.classList.add('hidden');
        mainContent.style.marginRight = '0';
    }

    // Open add to playlist modal
    function openAddToPlaylistModal(track) {
        trackToAdd = track;

        if (playlists.length === 0) {
            playlistSelectionList.innerHTML = '<p class="text-gray-400 text-center py-4">No playlists available. Create one first!</p>';
        } else {
            playlistSelectionList.innerHTML = '';
            playlists.forEach(playlist => {
                const playlistBtn = document.createElement('button');
                playlistBtn.className = 'w-full text-left p-3 bg-brand-black rounded-lg hover:bg-brand-light-gray transition-colors duration-200';
                playlistBtn.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-semibold">${playlist.name}</h4>
                            <p class="text-sm text-gray-400">${playlist.tracks.length} track${playlist.tracks.length !== 1 ? 's' : ''}</p>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                `;
                playlistBtn.addEventListener('click', () => {
                    addTrackToPlaylist(playlist.id, trackToAdd);
                    addToPlaylistModal.classList.add('hidden');
                    trackToAdd = null;
                });
                playlistSelectionList.appendChild(playlistBtn);
            });
        }

        addToPlaylistModal.classList.remove('hidden');
    }

    // Event Listeners
    toggleQueueBtn.addEventListener('click', toggleQueuePanel);
    closeQueueBtn.addEventListener('click', closeQueuePanel);
    clearQueueBtn.addEventListener('click', () => {
        if (musicQueue.length > 0) { // Only show modal if queue isn't empty
            clearQueueModal.classList.remove('hidden');
        } else {
            showNotification('Queue is already empty', 'info');
        }
    });

    // Hide the modal on "Cancel"
    modalCancelClear.addEventListener('click', () => {
        clearQueueModal.classList.add('hidden');
    });

    // Run the clear logic on "Confirm"
    modalConfirmClear.addEventListener('click', clearQueue);

    toggleLyricsBtn.addEventListener('click', toggleLyricsPanel);
    closeLyricsBtn.addEventListener('click', closeLyricsPanel);

    // Playlists event listeners
    togglePlaylistsBtn.addEventListener('click', togglePlaylistsPanel);
    closePlaylistsBtn.addEventListener('click', closePlaylistsPanel);

    createPlaylistBtn.addEventListener('click', () => {
        playlistNameInput.value = '';
        createPlaylistModal.classList.remove('hidden');
        playlistNameInput.focus();
    });

    createPlaylistEmptyBtn.addEventListener('click', () => {
        playlistNameInput.value = '';
        createPlaylistModal.classList.remove('hidden');
        playlistNameInput.focus();
    });

    modalCancelCreatePlaylist.addEventListener('click', () => {
        createPlaylistModal.classList.add('hidden');
    });

    modalConfirmCreatePlaylist.addEventListener('click', () => {
        const name = playlistNameInput.value.trim();
        if (name) {
            createPlaylist(name);
            createPlaylistModal.classList.add('hidden');
        }
    });

    playlistNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const name = playlistNameInput.value.trim();
            if (name) {
                createPlaylist(name);
                createPlaylistModal.classList.add('hidden');
            }
        }
    });

    modalCancelAddToPlaylist.addEventListener('click', () => {
        addToPlaylistModal.classList.add('hidden');
        trackToAdd = null;
    });

    modalCancelDeletePlaylist.addEventListener('click', () => {
        deletePlaylistModal.classList.add('hidden');
        playlistToDelete = null;
    });

    modalConfirmDeletePlaylist.addEventListener('click', () => {
        if (playlistToDelete) {
            deletePlaylist(playlistToDelete);
            deletePlaylistModal.classList.add('hidden');
            playlistToDelete = null;
        }
    });

    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', () => playNext(true));

    closePlayerBtn.addEventListener('click', () => {
        player.pause();
        player.src = '';
        playerContainer.classList.add('hidden');
        closeLyricsPanel();
        closeQueuePanel();
        closePlaylistsPanel();
        currentTrack = null;
        playHistory = []; // Clear history
    });

    player.addEventListener('ended', () => {
        console.log('Track ended, playing next in queue');
        playNext(false); // Pass false, not a manual skip
    });

    // Handle window resize (No changes)
    window.addEventListener('resize', () => {
        const anyPanelOpen = !queuePanel.classList.contains('hidden') || !lyricsPanel.classList.contains('hidden') || !playlistsPanel.classList.contains('hidden');
        if (window.innerWidth < 768 || !anyPanelOpen) {
            mainContent.style.marginRight = '0';
        } else if (anyPanelOpen) {
            mainContent.style.marginRight = '400px';
        }
    });

    // Search functionality (No changes)
    const debouncedSearch = debounce(searchMusic, 500);

    searchInput.addEventListener('input', (event) => {
        debouncedSearch(event.target.value);
    });

    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            searchMusic(searchInput.value);
        }
    });

    // Initialize
    loadQueue();
    loadPlaylists();
});