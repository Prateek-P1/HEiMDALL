const profiles = {
    data: [],

    async updateAccountInfo() {
        try {
            const response = await fetch('/api/current-user');
            if (response.ok) {
                const { username } = await response.json();
                const initial = username.charAt(0).toUpperCase();
                document.querySelector('.account-initial').textContent = initial;
                document.querySelector('.account-name').textContent = username;
            }
        } catch (error) {
            console.error('Error fetching account info:', error);
        }
    },

    async init() {
        // Load profiles from backend
        try {
            const response = await fetch('/api/profiles');
            if (response.ok) {
                const data = await response.json();
                this.data = data.profiles;
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
            // Fallback to default profiles if loading fails
            this.data = [
                { id: 1, name: 'Vero', image: 'https://placehold.co/160x160/e50914/white?text=V' },
                { id: 2, name: 'Kids', image: 'https://placehold.co/160x160/3498db/white?text=K' },
                { id: 3, name: 'Guest', image: 'https://placehold.co/160x160/2ecc71/white?text=G' }
            ];
        }
        
        await this.updateAccountInfo();
        this.render();
        this.setupEventListeners();
    },

    async save() {
        try {
            await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profiles: this.data })
            });
        } catch (error) {
            console.error('Error saving profiles:', error);
        }
    },

    render() {
        const grid = document.querySelector('.profile-grid');
        const isEditing = document.body.classList.contains('editing-mode');
        
        // Clear existing profiles
        grid.innerHTML = '';

        // Render existing profiles
        this.data.forEach(profile => {
            const profileEl = document.createElement('div');
            profileEl.className = 'group flex flex-col items-center cursor-pointer relative';
            profileEl.innerHTML = `
                <div class="w-32 h-32 md:w-40 md:h-40 rounded-md overflow-hidden border-4 border-transparent group-hover:border-white transition-all duration-200 transform group-hover:scale-110">
                    <img src="${profile.image}" alt="${profile.name}" class="w-full h-full object-cover">
                </div>
                <span class="mt-4 text-lg text-gray-400 group-hover:text-white transition-colors duration-200">${profile.name}</span>
                ${isEditing ? `
                    <button class="delete-profile absolute -top-2 -right-2 bg-brand-red text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-700 transition-colors duration-200" data-id="${profile.id}">
                        ×
                    </button>
                ` : ''}
            `;

            if (!isEditing) {
                profileEl.addEventListener('click', () => {
                    // Clear profile-specific cache when switching profiles
                    console.log('Switching to profile:', profile.name);
                    if (window.CacheUtils) {
                        window.CacheUtils.clearProfileCache();
                    }
                    localStorage.setItem('vstream-current-profile', profile.name);
                    localStorage.setItem('vstream-current-profile', JSON.stringify(profile));
                    window.location.href = 'index.html';
                });
            }

            grid.appendChild(profileEl);
        });

        // Add the "Add Profile" button if we're not at max capacity (8 profiles)
        if (this.data.length < 8) {
            const addProfileEl = document.createElement('div');
            addProfileEl.className = 'group flex flex-col items-center cursor-pointer';
            addProfileEl.innerHTML = `
                <div class="w-32 h-32 md:w-40 md:h-40 rounded-md bg-brand-gray group-hover:bg-brand-light-gray flex items-center justify-center border-4 border-transparent group-hover:border-white transition-all duration-200 transform group-hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <span class="mt-4 text-lg text-gray-400 group-hover:text-white transition-colors duration-200">Add Profile</span>
            `;

            addProfileEl.addEventListener('click', () => this.addProfile());
            grid.appendChild(addProfileEl);
        }
    },

    setupEventListeners() {
        const manageBtn = document.querySelector('.manage-profiles-btn');
        manageBtn.addEventListener('click', () => {
            document.body.classList.toggle('editing-mode');
            manageBtn.textContent = document.body.classList.contains('editing-mode') ? 'Done' : 'Manage Profiles';
            this.render();
        });

        // Event delegation for delete buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-profile')) {
                const id = parseInt(e.target.dataset.id);
                this.deleteProfile(id);
            }
        });

        // Logout button - clear all cache before logging out
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                console.log('Logging out - clearing all cache');
                if (window.CacheUtils) {
                    window.CacheUtils.clearAllCache();
                }
                window.location.href = '/api/logout';
            });
        }
    },

    createProfileModal() {
        if (this._modalCreated) return;
        this._modalCreated = true;

        const modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.style = `
            position:fixed; inset:0; display:none; align-items:center; justify-content:center;
            background:rgba(0,0,0,0.6); z-index:9999;
        `;

        const box = document.createElement('div');
        box.style = `
            width:320px; max-width:90%; background:#0b0b0b; color:#fff; padding:18px; border-radius:8px;
            box-shadow:0 6px 24px rgba(0,0,0,0.6);
        `;

        box.innerHTML = `
            <h3 style="margin:0 0 10px;font-size:18px">Add Profile</h3>
            <label style="display:block;margin-bottom:8px;font-size:13px;color:#cfcfcf">Name</label>
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Profile name';
        input.style = 'width:100%; padding:8px 10px; margin-bottom:12px; border-radius:4px; border:1px solid #333; background:#111; color:#fff';

        const btnRow = document.createElement('div');
        btnRow.style = 'display:flex; gap:8px; justify-content:flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style = 'padding:8px 12px; border-radius:6px; background:#333; color:#fff; border:0';

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = 'Add';
        addBtn.style = 'padding:8px 12px; border-radius:6px; background:#e50914; color:#fff; border:0';

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(addBtn);

        box.appendChild(input);
        box.appendChild(btnRow);
        modal.appendChild(box);
        document.body.appendChild(modal);

        // store refs
        this._modal = modal;
        this._modalInput = input;
        this._modalAddBtn = addBtn;
        this._modalCancelBtn = cancelBtn;

        // keyboard handling
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addBtn.click();
            if (e.key === 'Escape') cancelBtn.click();
        });

        // Cancel handler
        cancelBtn.addEventListener('click', () => {
            this._modal.style.display = 'none';
            this._modalResolve && this._modalResolve(null);
            this._modalResolve = null;
        });

        // Add handler
        addBtn.addEventListener('click', () => {
            const val = this._modalInput.value.trim();
            if (!val) {
                this._modalInput.focus();
                return;
            }
            this._modal.style.display = 'none';
            this._modalResolve && this._modalResolve(val);
            this._modalResolve = null;
        });
    },

    createConfirmModal() {
        if (this._confirmModalCreated) return;
        this._confirmModalCreated = true;

        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.style = `
            position:fixed; inset:0; display:none; align-items:center; justify-content:center;
            background:rgba(0,0,0,0.6); z-index:9999;
        `;

        const box = document.createElement('div');
        box.style = `
            width:360px; max-width:92%; background:#0b0b0b; color:#fff; padding:18px; border-radius:8px;
            box-shadow:0 6px 24px rgba(0,0,0,0.6);
        `;

        box.innerHTML = `
            <h3 style="margin:0 0 10px;font-size:18px">Confirm</h3>
            <p id="confirm-message" style="margin:0 0 12px;color:#cfcfcf;font-size:14px"></p>
        `;

        const btnRow = document.createElement('div');
        btnRow.style = 'display:flex; gap:8px; justify-content:flex-end';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style = 'padding:8px 12px; border-radius:6px; background:#333; color:#fff; border:0';

        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.textContent = 'Delete';
        okBtn.style = 'padding:8px 12px; border-radius:6px; background:#e50914; color:#fff; border:0';

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);

        box.appendChild(btnRow);
        modal.appendChild(box);
        document.body.appendChild(modal);

        // store refs
        this._confirmModal = modal;
        this._confirmMessageEl = box.querySelector('#confirm-message');
        this._confirmOkBtn = okBtn;
        this._confirmCancelBtn = cancelBtn;

        // keyboard handling
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') okBtn.click();
            if (e.key === 'Escape') cancelBtn.click();
        });

        // Cancel handler
        cancelBtn.addEventListener('click', () => {
            this._confirmModal.style.display = 'none';
            this._confirmResolve && this._confirmResolve(false);
            this._confirmResolve = null;
        });

        // OK handler
        okBtn.addEventListener('click', () => {
            this._confirmModal.style.display = 'none';
            this._confirmResolve && this._confirmResolve(true);
            this._confirmResolve = null;
        });
    },

    // Show confirm modal with custom message, returns Promise<boolean>
    showConfirmModal(message = 'Are you sure?') {
        this.createConfirmModal();
        this._confirmMessageEl.textContent = message;
        this._confirmModal.style.display = 'flex';
        // focus for keyboard events
        this._confirmOkBtn.focus();

        return new Promise((resolve) => {
            this._confirmResolve = resolve;
        });
    },

    // Show modal and return entered name or null
    showProfileModal() {
        this.createProfileModal();
        this._modalInput.value = '';
        this._modal.style.display = 'flex';
        setTimeout(() => this._modalInput.focus(), 50);

        return new Promise((resolve) => {
            this._modalResolve = resolve;
        });
    },

    async addProfile() {
        if (this.data.length >= 8) return;

        const name = await this.showProfileModal();
        if (!name) return;

        const initial = name.charAt(0).toUpperCase();
        const colors = ['e50914', '3498db', '2ecc71', 'f1c40f', '9b59b6', 'e67e22', '1abc9c', 'd35400'];
        const color = colors[this.data.length % colors.length];

        const newProfile = {
            id: Date.now(),
            name,
            image: `https://placehold.co/160x160/${color}/white?text=${initial}`
        };

        this.data.push(newProfile);
        await this.save();
        this.render();
    },

    async deleteProfile(id) {
        // Use in-app confirm modal instead of window.confirm
        const profileToDelete = this.data.find(profile => profile.id === id);
        if (!profileToDelete) return;

        const confirmed = await this.showConfirmModal(`Delete profile "${profileToDelete.name}"? This will remove its watchlist.`);
        if (!confirmed) return;

        // Delete watchlist data for this profile
        try {
            await fetch(`/api/watchlist/profile/${encodeURIComponent(profileToDelete.name)}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Error deleting profile watchlist:', error);
        }

        this.data = this.data.filter(profile => profile.id !== id);
        await this.save();
        this.render();
    },
};

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => profiles.init());