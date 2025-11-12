# HEiMDALL

> An OTT streaming platform free for all, free forver

<div align="center">

![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.6-orange?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0+-000000?style=for-the-badge&logo=flask&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![npm](https://img.shields.io/badge/npm-8+-CB3837?style=for-the-badge&logo=npm&logoColor=white)
![Electron.js](https://img.shields.io/badge/Electron-27.0.0-191970?style=for-the-badge&logo=Electron&logoColor=white)

</div>


## Overview

HEiMDALL is a comprehensive mock OTT streaming platform that replicates the core functionality of modern streaming services. Built as a desktop application, it seamlessly integrates a Python Flask backend with an Electron-based frontend to deliver a native application experience.

### Key Features

- **User Authentication** - Secure sign-up and login system with encrypted password storage
- **Profile Management** - Multiple user profiles with personalized settings and preferences
- **Content Discovery** - Browse extensive movie and TV show catalogs powered by TMDB API
- **Personal Watchlist** - Save and manage your favorite content across profiles
- **Search Functionality** - Advanced search capabilities to find content quickly
- **Desktop Application** - Native Windows desktop app with installer support

## Architecture

The application follows a modern client-server architecture:

- **Backend**: Python Flask REST API serving authentication, profile management, and TMDB proxy endpoints
- **Frontend**: Static HTML/CSS/JavaScript with a responsive, modern UI
- **Desktop Layer**: Electron framework wrapping the web application as a native desktop app
- **Data Storage**: CSV-based user data and JSON for profiles and watchlists
- **Security**: bcrypt password hashing and secure session management

## Technology Stack

### Backend
- **Flask** - Lightweight Python web framework
- **Waitress** - Production WSGI server
- **bcrypt** - Password hashing and encryption
- **Requests** - HTTP library for TMDB API integration
- **python-dotenv** - Environment variable management

### Frontend
- **HTML5/CSS3** - Modern, responsive UI design
- **JavaScript (ES6+)** - Client-side interactivity
- **TMDB API** - Comprehensive movie and TV show database

### Desktop Application
- **Electron** - Cross-platform desktop application framework
- **electron-builder** - Application packaging and installer creation

## Quick Start

### Option 1: Use the Installer (Recommended for Windows x64)

1. Download the latest installer from the releases page
2. Run the installer and follow the setup wizard
3. Launch HEiMDALL from your desktop or start menu

### Option 2: Development Setup

#### Prerequisites

- Python 3.8 or higher
- Node.js 16+ and npm
- Git

#### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Prateek-P1/HEiMDALL.git
   cd HEiMDALL
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   TMDB_API_KEY=your_tmdb_api_key_here
   FLASK_SECRET_KEY=your_secret_key_here
   ```
   
   Get your TMDB API key from [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

4. **Install Node.js dependencies**
   ```bash
   npm install
   ```

5. **Run the development server** 
   manually (recommended):
   ```bash
   python launcher.py
   ```
   OR single .bat file to start the server:
   ```bash
   start-dev.bat
   ```

6. **Launch the Electron app**
   ```bash
   npm start
   ```

The application will start, and the Electron window will open automatically.

## Building from Source

### (Manual - Recommended)
1. Install Node Dependencies
```bash
npm install
```
2. Install pyinstaller (if not already installed)
```bash
pip install pyinstaller
```
3. Build the python environment
```bash
python build-python.py
```
4. Build and package the application within the electron environment
```bash
npm run build
```

The installer will be created in the `dist/` directory.

## Project Structure

```
HEiMDALL/
├── backend/                 # Flask backend application
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   └── models/             # Data models and storage
│       ├── user.py         # User authentication logic
│       ├── users.csv       # User database
│       ├── profiles.json   # User profiles
│       └── watchlist.json  # Watchlist data
├── frontend/               # Static web frontend
│   ├── *.html             # HTML pages
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript modules
│   └── assets/            # Images and icons
├── electron/              # Electron desktop wrapper
│   ├── main.js           # Main process
│   └── preload.js        # Preload scripts
├── python-build/         # PyInstaller build output
├── dist/                 # Final application builds
├── package.json          # Node.js configuration
├── launcher.py           # Backend launcher script
├── build-python.py       # Backend build script
└── build-installer.bat   # Complete build automation
```

## Features in Detail

### User Authentication
- Secure password hashing using bcrypt
- Session-based authentication
- Protected routes and API endpoints

### Profile Management
- Multiple profiles per user account
- Profile-specific watchlists and preferences
- Easy profile switching

### Content Browsing
- Integration with TMDB API for up-to-date content
- Trending movies and TV shows
- Detailed information including cast, ratings, and descriptions
- High-quality poster and backdrop images

### Watchlist
- Save movies and TV shows for later viewing
- Profile-specific watchlists
- Quick add/remove functionality

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TMDB_API_KEY` | Your TMDB API key for content data | Yes |
| `FLASK_SECRET_KEY` | Secret key for Flask session management | Yes |
| `PORT` | Backend server port (default: 8000) | No |

### Application Settings

Edit `package.json` to customize:
- Application name and version
- Build configuration
- Electron settings
- Installer options

## Troubleshooting

### Backend won't start
- Ensure all Python dependencies are installed: `pip install -r backend/requirements.txt`
- Verify `.env` file exists with valid TMDB API key
- Check if port 8000 is already in use

### Electron window shows blank screen
- Verify backend is running on port 8000
- Check browser console for errors (View > Toggle Developer Tools)
- Ensure frontend files are present in `frontend/` directory

### Build fails
- Confirm Python and Node.js are properly installed
- Clear build cache: delete `build/` and `dist/` directories
- Reinstall dependencies: `npm install` and `pip install -r backend/requirements.txt`

## Contributing

This project was developed as a collaborative effort. Contributions, issues, and feature requests are welcome!

### Development Team

- [Prateek-P1](https://github.com/Prateek-P1)
- [NJWasTaken](https://github.com/NJWasTaken)
- [NRG2005](https://github.com/NRG2005)
- [Smartboi-123](https://github.com/Smartboi-123)

## License

This project is licensed under the MIT License - see the [LICENSE.txt](LICENSE.txt) file for details.

## Acknowledgments

- [The Movie Database (TMDB)](https://www.themoviedb.org/) for providing the comprehensive movie and TV show API
- [Flask](https://flask.palletsprojects.com/) for the lightweight and powerful Python web framework
- [Electron](https://www.electronjs.org/) for enabling cross-platform desktop application development

**Note**: This is a mock streaming platform for educational purposes