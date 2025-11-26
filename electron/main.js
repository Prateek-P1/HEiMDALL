const { app, BrowserWindow, Menu } = require('electron');
const treeKill = require('tree-kill');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let flaskProcess;
const FLASK_PORT = 8000;  // Changed from 5000 to match Flask configuration
const FLASK_URL = `http://localhost:${FLASK_PORT}/index.html`;  // Changed to load index.html directly for testing

// Determine if we're in development or production
const isDev = !app.isPackaged;

function getFlaskExecutablePath() {
    if (isDev) {
        // Development: Use Python directly
        // Run the backend as a module so package-relative imports work
        return {
            command: 'python',
            args: ['-m', 'backend.app'],
            cwd: path.join(__dirname, '..')
        };
    } else {
        // Production: Use bundled executable
        const exePath = path.join(
            process.resourcesPath,
            'heimdall-backend',
            'heimdall-backend.exe'
        );
        return {
            command: exePath,
            args: [],
            cwd: path.dirname(exePath)
        };
    }
}

function startFlaskServer() {
    return new Promise((resolve, reject) => {
        const flaskConfig = getFlaskExecutablePath();
        
        console.log('Starting Flask server...');
        console.log('Command:', flaskConfig.command);
        console.log('Args:', flaskConfig.args);
        console.log('CWD:', flaskConfig.cwd);

        // Build the environment for the spawned backend. For production we
        // explicitly set HEIMDALL_DATA_DIR so the packaged exe reads the
        // same resources folder that the installer places files into.
        // For development, set it to a 'data' folder in the project root.
        const spawnEnv = {
            ...process.env,
            FLASK_ENV: 'production',
            PYTHONUNBUFFERED: '1',
            // Tell the backend not to open the browser when launched by Electron
            NO_BROWSER: '1',
            // Ensure backend binds to the port Electron expects
            PORT: String(FLASK_PORT)
        };

        if (!isDev) {
            // Production: use resources folder
            try {
                const dataDir = path.join(process.resourcesPath, 'heimdall-backend');
                spawnEnv.HEIMDALL_DATA_DIR = dataDir;
                spawnEnv.HEIMDALL_PORTABLE = '1';
                console.log('Will spawn backend with HEIMDALL_DATA_DIR=', dataDir);
            } catch (e) {
                console.warn('Failed to compute HEIMDALL_DATA_DIR:', e);
            }
        } else {
            // Development: use project root 'data' folder instead of AppData
            try {
                const dataDir = path.join(__dirname, '..', 'data');
                spawnEnv.HEIMDALL_DATA_DIR = dataDir;
                spawnEnv.HEIMDALL_PORTABLE = '1';
                console.log('Development mode: using HEIMDALL_DATA_DIR=', dataDir);
            } catch (e) {
                console.warn('Failed to compute HEIMDALL_DATA_DIR for development:', e);
            }
        }

        flaskProcess = spawn(flaskConfig.command, flaskConfig.args, {
            cwd: flaskConfig.cwd,
            env: spawnEnv,
            detached: false
        });

        flaskProcess.stdout.on('data', (data) => {
            console.log(`Flask: ${data}`);
            // Check if server is ready (wait for the restart to complete)
            if (data.toString().includes('Debugger is active') || data.toString().includes('Debugger PIN')) {
                // Server has fully restarted and is ready
                setTimeout(() => resolve(), 1000);
            }
        });

        flaskProcess.stderr.on('data', (data) => {
            console.error(`Flask Error: ${data}`);
        });

        flaskProcess.on('error', (error) => {
            console.error('Failed to start Flask server:', error);
            reject(error);
        });

        flaskProcess.on('close', (code) => {
            console.log(`Flask process exited with code ${code}`);
            flaskProcess = null;
        });

        // Timeout fallback - resolve after 5 seconds even if we don't see the message
        setTimeout(() => {
            if (flaskProcess) {
                resolve();
            }
        }, 5000);
    });
}

function createPlayerWindow(url) {
    // Create a new window for video player
    const playerWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        icon: path.join(__dirname, '..', 'frontend', 'assets', 'HEiMDALL_logo.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        },
        backgroundColor: '#000000',
        title: 'Heimdall Player'
    });

    // Remove menu bar
    playerWindow.setMenuBarVisibility(false);

    // Load the Vidrock URL
    playerWindow.loadURL(url);

    // Handle any external links from the player window
    playerWindow.webContents.setWindowOpenHandler(({ url: newUrl }) => {
        // Keep navigation within Vidrock in the same window
        if (newUrl.includes('vidrock.net')) {
            return { action: 'allow' };
        }
        // Open other links in default browser
        require('electron').shell.openExternal(newUrl);
        return { action: 'deny' };
    });

    return playerWindow;
}

// On Windows, set the AppUserModelID so the taskbar uses the packaged app icon
if (process.platform === 'win32') {
    try {
        app.setAppUserModelId('com.jaljira.heimdall');
    } catch (e) {
        console.warn('Failed to set AppUserModelId:', e);
    }
}

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        icon: path.join(__dirname, '..', 'frontend', 'assets', 'HEiMDALL_logo.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: true,
            allowRunningInsecureContent: false
        },
        show: true, // Show immediately for debugging
        backgroundColor: '#0b0c0f' // Match your brand-black color
    });

    // Remove the default menu
    Menu.setApplicationMenu(null);

    // Log all requests for debugging
    mainWindow.webContents.session.webRequest.onCompleted((details) => {
        if (details.statusCode !== 200) {
            console.log(`Request failed: ${details.url} - Status: ${details.statusCode}`);
        }
    });

    // Log any resource loading errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        console.error(`Failed to load ${isMainFrame ? 'main frame' : 'resource'}: ${validatedURL}`);
        console.error(`Error: ${errorDescription} (${errorCode})`);
    });

    // Load the Flask app
    console.log(`Loading URL: ${FLASK_URL}`);
    mainWindow.loadURL(FLASK_URL);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        console.log('Window ready to show');
        mainWindow.show();
    });
    
    // Fallback: Show window after page loads if ready-to-show doesn't fire
    mainWindow.webContents.once('did-finish-load', () => {
        console.log('Page finished loading');
        
        // Log the current URL
        console.log('Current URL:', mainWindow.webContents.getURL());
        
        // Execute JavaScript to check and fix rendering
        mainWindow.webContents.executeJavaScript(`
            console.log('=== DEBUGGING INFO ===');
            console.log('Body HTML length:', document.body ? document.body.innerHTML.length : 0);
            console.log('Body background:', window.getComputedStyle(document.body).backgroundColor);
            console.log('Body color:', window.getComputedStyle(document.body).color);
            console.log('Body opacity:', window.getComputedStyle(document.body).opacity);
            console.log('Body visibility:', window.getComputedStyle(document.body).visibility);
            console.log('Body display:', window.getComputedStyle(document.body).display);
            console.log('Tailwind loaded:', typeof tailwind !== 'undefined');
            
            // Check if form exists and its visibility
            const form = document.getElementById('loginForm');
            console.log('Login form found:', !!form);
            if (form) {
                const formStyles = window.getComputedStyle(form);
                console.log('Form display:', formStyles.display);
                console.log('Form visibility:', formStyles.visibility);
                console.log('Form opacity:', formStyles.opacity);
            }
            
            // Check if backdrop image loaded
            const backdrop = document.querySelector('img[alt="Heimdall Backdrop"]');
            console.log('Backdrop image found:', !!backdrop);
            console.log('Backdrop loaded:', backdrop ? backdrop.complete : false);
            
            // Check the main content container
            const contentDiv = document.querySelector('.relative.z-10');
            if (contentDiv) {
                const divStyles = window.getComputedStyle(contentDiv);
                console.log('Content div display:', divStyles.display);
                console.log('Content div visibility:', divStyles.visibility);
                console.log('Content div opacity:', divStyles.opacity);
            }
            
            // Force a repaint
            document.body.style.display = 'none';
            document.body.offsetHeight; // Trigger reflow
            document.body.style.display = '';
            
            console.log('=== FORCED REPAINT ===');
            
            // Return body length
            document.body ? document.body.innerHTML.length : 0
        `).then(length => {
            console.log('Body HTML length:', length);
            if (length === 0) {
                console.error('WARNING: Page body is empty!');
            }
        }).catch(err => {
            console.error('Error executing debug script:', err);
        });
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // If it's a Vidrock link, open in a new Electron window
        if (url.includes('vidrock.net')) {
            createPlayerWindow(url);
            return { action: 'deny' };
        }
        
        // Other external links - open in default browser
        require('electron').shell.openExternal(url);
        return { action: 'deny' };
    });

    // Emitted when the window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // When user closes main window via the X button, quit the app which will
    // trigger the before-quit handler to kill child processes.
    mainWindow.on('close', (e) => {
        // Allow default behavior; we ensure child processes are killed in before-quit
    });

    // Handle page load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('Failed to load:', errorDescription);
        console.error('URL:', validatedURL);
        console.error('Error code:', errorCode);
        
        // Don't retry on ERR_ABORTED (-3) as it's usually intentional navigation
        if (errorCode !== -3) {
            // Retry loading after a delay
            setTimeout(() => {
                if (mainWindow) {
                    console.log('Retrying to load URL...');
                    mainWindow.loadURL(FLASK_URL);
                }
            }, 2000);
        }
    });
    
    // Log when page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Page loaded successfully');
    });
    
    // Log console messages from the web page
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`Web Console [${level}]:`, message);
    });
}

// Disable hardware acceleration (fixes white screen on some systems)
app.disableHardwareAcceleration();

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
    try {
        console.log('Starting Heimdall application...');
        await startFlaskServer();
        console.log('Flask server started successfully');
        
        // Give Flask more time to fully initialize (especially for debug mode restart)
        setTimeout(() => {
            createWindow();
        }, 2000);

        app.on('activate', () => {
            // On macOS it's common to re-create a window when dock icon is clicked
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    } catch (error) {
        console.error('Failed to start application:', error);
        app.quit();
    }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
    // On macOS applications stay active until user quits explicitly
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Clean up Flask process before quitting
app.on('before-quit', () => {
    if (flaskProcess) {
        console.log('Stopping Flask server...');
        try {
            // Use tree-kill to terminate the process tree on Windows reliably
            treeKill(flaskProcess.pid, 'SIGTERM', (err) => {
                if (err) {
                    console.error('Error sending SIGTERM to Flask process tree:', err);
                }
                // After a short delay, try to force-kill if still alive
                setTimeout(() => {
                    try {
                        // If process still exists, escalate
                        process.kill(flaskProcess.pid, 0);
                        try { treeKill(flaskProcess.pid, 'SIGKILL'); } catch (_) { try { flaskProcess.kill('SIGKILL'); } catch (_) {} }
                    } catch (e) {
                        // process is already gone
                    }
                }, 1200);
            });
        } catch (err) {
            try { flaskProcess.kill(); } catch (_) {}
        }
        flaskProcess = null;
    }
});

// Handle app termination
process.on('exit', () => {
    if (flaskProcess) {
        try { treeKill(flaskProcess.pid); } catch (_) { try { flaskProcess.kill(); } catch (_) {} }
    }
});

// Catch crashes and errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});
