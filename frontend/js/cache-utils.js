/**
 * Cache utility functions for HEiMDALL
 * Handles localStorage management and cache invalidation
 */

const CacheUtils = {
    /**
     * Clear all application cache and localStorage
     * Call this on logout or when switching users
     */
    clearAllCache() {
        console.log('Clearing all application cache');
        localStorage.clear();
        // Also clear sessionStorage if used
        sessionStorage.clear();
    },

    /**
     * Clear profile-specific cached data
     * Call this when switching profiles
     */
    clearProfileCache() {
        console.log('Clearing profile-specific cache');
        // Remove profile-specific items from localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Keep user login state but remove profile-specific data
            if (key && key !== 'isLoggedIn') {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    },

    /**
     * Validate and sync profile data with backend
     * Returns the current profile from backend or null
     */
    async validateProfileCache() {
        try {
            const response = await fetch('/api/profiles');
            if (!response.ok) {
                if (response.status === 401) {
                    // Session expired, clear cache and redirect to login
                    this.clearAllCache();
                    window.location.href = '/login.html';
                    return null;
                }
                throw new Error('Failed to fetch profiles');
            }

            const data = await response.json();
            const currentProfileStr = localStorage.getItem('vstream-current-profile');

            if (currentProfileStr) {
                try {
                    const currentProfile = JSON.parse(currentProfileStr);
                    // Check if the current profile still exists in backend
                    const profileExists = data.profiles.some(p => p.id === currentProfile.id);
                    if (!profileExists) {
                        console.warn('Current profile no longer exists, clearing cache');
                        this.clearProfileCache();
                        return null;
                    }
                    return currentProfile;
                } catch (e) {
                    console.error('Error parsing current profile:', e);
                    this.clearProfileCache();
                }
            }

            return null;
        } catch (error) {
            console.error('Error validating profile cache:', error);
            return null;
        }
    },

    /**
     * Get cache timestamp for a specific key
     * Returns timestamp or null if not set
     */
    getCacheTimestamp(key) {
        const timestamp = localStorage.getItem(`${key}_timestamp`);
        return timestamp ? parseInt(timestamp, 10) : null;
    },

    /**
     * Set cache timestamp for a specific key
     */
    setCacheTimestamp(key) {
        localStorage.setItem(`${key}_timestamp`, Date.now().toString());
    },

    /**
     * Check if cache is stale (older than maxAge in milliseconds)
     */
    isCacheStale(key, maxAge = 5 * 60 * 1000) { // Default 5 minutes
        const timestamp = this.getCacheTimestamp(key);
        if (!timestamp) return true;
        return Date.now() - timestamp > maxAge;
    }
};

// Export for use in other scripts
window.CacheUtils = CacheUtils;
