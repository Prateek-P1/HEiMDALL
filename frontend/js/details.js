// frontend/js/details.js
document.addEventListener('DOMContentLoaded', () => {
    // Get the media type and ID we embedded in the HTML
    const tmdbId = window.TMDB_ID;
    const mediaType = window.MEDIA_TYPE;

    // Current item data (populated when details load)
    let currentItem = null;

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

    // Check if item is in watchlist
    async function checkWatchlistStatus() {
        const profile = getCurrentProfile();
        try {
            const response = await fetch(`/api/watchlist?profile=${encodeURIComponent(profile)}`);
            if (!response.ok) return false;

            const items = await response.json();
            return items.some(item => item.id === tmdbId);
        } catch (error) {
            console.error('Error checking watchlist:', error);
            return false;
        }
    }

    // Update watchlist button UI
    function updateWatchlistButton(inWatchlist) {
        const button = document.getElementById('watchlist-button');
        const addIcon = document.getElementById('watchlist-icon-add');
        const checkIcon = document.getElementById('watchlist-icon-check');
        const text = document.getElementById('watchlist-text');

        if (inWatchlist) {
            addIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
            button.classList.add('border-brand-red', 'text-brand-red');
            button.classList.remove('border-brand-light-gray');
        } else {
            addIcon.classList.remove('hidden');
            checkIcon.classList.add('hidden');
            button.classList.remove('border-brand-red', 'text-brand-red');
            button.classList.add('border-brand-light-gray');
        }
    }

    // Add to watchlist
    async function addToWatchlist() {
        if (!currentItem) return;

        const profile = getCurrentProfile();
        const item = {
            id: currentItem.id,
            title: currentItem.title || currentItem.name,
            media_type: mediaType,
            poster_path: currentItem.poster_path,
            backdrop_path: currentItem.backdrop_path
        };

        try {
            const response = await fetch('/api/watchlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profile, item })
            });

            if (response.ok) {
                updateWatchlistButton(true);
            } else {
                console.error('Failed to add to watchlist');
            }
        } catch (error) {
            console.error('Error adding to watchlist:', error);
        }
    }

    // Remove from watchlist
    async function removeFromWatchlist() {
        const profile = getCurrentProfile();

        try {
            const response = await fetch(`/api/watchlist/${tmdbId}?profile=${encodeURIComponent(profile)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                updateWatchlistButton(false);
            } else {
                console.error('Failed to remove from watchlist');
            }
        } catch (error) {
            console.error('Error removing from watchlist:', error);
        }
    }

    // Toggle watchlist
    async function toggleWatchlist() {
        const inWatchlist = await checkWatchlistStatus();
        if (inWatchlist) {
            await removeFromWatchlist();
        } else {
            await addToWatchlist();
        }
    }

    // --- We need this function again (copied from app.js) ---
    // (This is a great candidate for a shared utils.js file)
    const createMediaCard = (item, mediaType) => {
        if (!item.poster_path) return ''; 
        // We use '../' for the href because we are one level deep (e.g., /details/movie/id)
        const watchUrl = `https://vidrock.net/${mediaType}/${item.id}`; 
        const title = item.title || item.name; 

        // We also change the link to be a details link, so clicking a recommendation
        // takes you to another details page.
        const detailsUrl = `/details/${mediaType}/${item.id}`;

        return `
            <a href="${detailsUrl}" class="flex-shrink-0 w-poster-w h-poster-h rounded-lg shadow-lg transform hover:scale-105 hover:z-10 transition-transform duration-300 cursor-pointer">
                <img src="https://image.tmdb.org/t/p/w500${item.poster_path}" alt="${title}" class="w-full h-full object-cover rounded-lg">
            </a>
        `;
    };

    // Function to format runtime from minutes to "1h 55m"
    const formatRuntime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const createEpisodeListItem = (episode, tvId) => {
        const stillUrl = episode.still_path 
            ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
            : 'https://placehold.co/180x100/1a1d23/e50914?text=Heimdall'; // Placeholder

        // Redirect directly to Vidrock for TV episodes
        const playUrl = `https://vidrock.net/tv/${tvId}/${episode.season_number}/${episode.episode_number}`;

        return `
            <div class="episode-item">
                <img src="${stillUrl}" alt="${episode.name}" class="episode-item-thumbnail">
                <div class="episode-item-info">
                    <h4 class="episode-item-title">${episode.episode_number}. ${episode.name}</h4>
                    <p class="episode-item-overview">${episode.overview || 'No description available.'}</p>
                </div>
                <a href="${playUrl}" target="_blank" class="episode-item-play" title="Play Episode">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                    </svg>
                </a>
            </div>
        `;
    };

    // --- NEW: Function to fetch episodes for a season ---
    const fetchEpisodes = async (tvId, seasonNumber) => {
        const container = document.getElementById('episode-list-container');
        container.innerHTML = '<p class="text-gray-400">Loading episodes...</p>';

        try {
            const response = await fetch(`/api/tv/${tvId}/season/${seasonNumber}`);
            if (!response.ok) throw new Error('Failed to fetch season');

            const seasonData = await response.json();
            container.innerHTML = ''; // Clear loading

            if (seasonData.episodes && seasonData.episodes.length > 0) {
                seasonData.episodes.forEach(episode => {
                    container.innerHTML += createEpisodeListItem(episode, tvId);
                });
            } else {
                container.innerHTML = '<p class="text-gray-400">No episode data available for this season.</p>';
            }
        } catch (error) {
            console.error('Error fetching episodes:', error);
            container.innerHTML = '<p class="text-red-500">Error loading episodes.</p>';
        }
    };

    // --- NEW: Function to populate the season <select> dropdown ---
    const populateSeasonSelector = (seasons) => {
        const selector = document.getElementById('season-selector');
        
        // Filter out "Specials" (season_number 0)
        const validSeasons = seasons.filter(s => s.season_number > 0);

        validSeasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season.season_number;
            option.textContent = season.name;
            selector.appendChild(option);
        });

        // Add event listener to fetch new episodes on change
        selector.addEventListener('change', (e) => {
            fetchEpisodes(tmdbId, e.target.value);
        });
    };

    // --- Main function to fetch and populate data ---
    const loadDetails = async () => {
        if (!tmdbId || !mediaType) return;

        try {
            const response = await fetch(`/api/details/${mediaType}/${tmdbId}`);
            if (!response.ok) {
                // ... (error handling is unchanged)
            }
            const data = await response.json();
            const details = data.details;
            const recommendations = data.recommendations;

            // Store current item for watchlist
            currentItem = details;

            // --- (Populate Hero, Meta, Genres, Play Button... all unchanged) ---
            document.getElementById('details-backdrop').src = `https://image.tmdb.org/t/p/original${details.backdrop_path}`;
            document.getElementById('details-poster').src = `https://image.tmdb.org/t/p/w500${details.poster_path}`;
            document.getElementById('details-title').textContent = details.title || details.name;
            document.getElementById('details-overview').textContent = details.overview;
            
            const metaContainer = document.getElementById('details-meta');
            const releaseDate = details.release_date || details.first_air_date;
            const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
            let metaHTML = `<span class="font-semibold">${year}</span>`;
            if (mediaType === 'movie' && details.runtime) {
                metaHTML += `<span>&bull;</span> <span>${formatRuntime(details.runtime)}</span>`;
            } else if (mediaType === 'tv') {
                metaHTML += `<span>&bull;</span> <span>${details.number_of_seasons} Season(s)</span>`;
            }
            metaContainer.innerHTML = metaHTML;

            const genresContainer = document.getElementById('details-genres');
            details.genres.slice(0, 3).forEach(genre => {
                genresContainer.innerHTML += `<span class="genre-tag">${genre.name}</span>`;
            });

            // --- MODIFIED: Update Play Button to redirect to Vidrock directly ---
            const playLink = document.getElementById('details-play-link');
            if (mediaType === 'movie') {
                playLink.href = `https://vidrock.net/movie/${tmdbId}`;
                playLink.target = '_blank'; // Open in new tab
            } else {
                // Default "Play" button to Season 1, Episode 1 on Vidrock
                playLink.href = `https://vidrock.net/tv/${tmdbId}/1/1`;
                playLink.target = '_blank'; // Open in new tab
            }
            
            // Check watchlist status and update button
            const inWatchlist = await checkWatchlistStatus();
            updateWatchlistButton(inWatchlist);

            // --- (Populate Recommendations... unchanged) ---
            const recContainer = document.getElementById('carousel-recommendations');
            const spinner = document.getElementById('recommendations-spinner');
            if (spinner) spinner.style.display = 'flex';
            recContainer.innerHTML = '';

            try {
                if (Array.isArray(recommendations) && recommendations.length > 0) {
                    recommendations.forEach(item => {
                        const recMediaType = item.media_type || mediaType;
                        recContainer.innerHTML += createMediaCard(item, recMediaType);
                    });
                } else {
                    recContainer.innerHTML = '<p class="text-gray-400">No recommendations available.</p>';
                }
            } catch (e) {
                recContainer.innerHTML = '<p class="text-gray-400">Error loading recommendations.</p>';
            } finally {
                // hide spinner once we've attempted to render
                if (spinner) spinner.style.display = 'none';
            }

            // --- NEW: Populate Seasons/Episodes if it's a TV Show ---
            if (mediaType === 'tv' && details.seasons) {
                document.getElementById('seasons-section').classList.remove('hidden'); // Show the section
                populateSeasonSelector(details.seasons);
                // Automatically fetch episodes for the first valid season
                const firstSeason = details.seasons.find(s => s.season_number > 0);
                if (firstSeason) {
                    fetchEpisodes(tmdbId, firstSeason.season_number);
                }
            }

        } catch (error) {
            console.error('Error loading details:', error);
        }
    };

    // Add watchlist button click handler
    document.getElementById('watchlist-button').addEventListener('click', toggleWatchlist);

    // --- Load all content ---
    loadDetails();
});
