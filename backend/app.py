# backend/app.py
from flask import Flask, render_template, send_from_directory, request, jsonify, redirect, session, abort
import os
import sys
import requests
import dotenv
import asyncio
import yt_dlp

dotenv.load_dotenv()

# Support running from a PyInstaller onefile bundle. When frozen, PyInstaller
# extracts bundled data into sys._MEIPASS. Use that as the project root so
# static/template paths resolve correctly when packaged into an EXE.
if getattr(sys, 'frozen', False):
    project_root = sys._MEIPASS
else:
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

FRONTEND_DIR = os.path.abspath(os.path.join(project_root, 'frontend'))

app = Flask(__name__,
            template_folder=FRONTEND_DIR,
            static_folder=FRONTEND_DIR,
            static_url_path='')

# Secret keys
# Defer secret key setup until after the User model determines the data dir
app.secret_key = None
TMDB_API_KEY = os.getenv('TMDB_API_KEY')
TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Add Cache-Control headers to prevent browser caching of API responses
@app.after_request
def add_cache_control_headers(response):
    """Prevent browser caching of API responses to avoid stale data"""
    # Only apply to API routes, not static files
    if request.path.startswith('/api/'):
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

# Initialize the User model
from models.user import User
user_model = User()
print(f"Heimdall data dir: {getattr(user_model, 'app_data_dir', 'unknown')}")
print(f"User file: {user_model.file_path}")
print(f"Profiles file: {user_model.profiles_path}")

# Ensure the Flask secret key is set. Prefer the FLASK_SECRET_KEY env var
# (useful for CI / signed builds). If not provided, store a persistent
# secret in the app data dir so sessions survive restarts for the installed app.
try:
    env_key = os.getenv('FLASK_SECRET_KEY')
    if env_key:
        app.secret_key = env_key
    else:
        secret_path = os.path.join(getattr(user_model, 'app_data_dir', DATA_DIR), 'flask_secret.key')
        if os.path.exists(secret_path):
            try:
                with open(secret_path, 'rb') as sf:
                    app.secret_key = sf.read()
            except Exception:
                # Fall back to a random key if file read fails
                app.secret_key = os.urandom(32)
        else:
            try:
                import secrets
                new_key = secrets.token_urlsafe(32)
                with open(secret_path, 'wb') as sf:
                    sf.write(new_key.encode('utf-8'))
                app.secret_key = new_key
            except Exception:
                app.secret_key = os.urandom(32)
except Exception as e:
    print('Failed to initialize Flask secret key:', e)
    app.secret_key = os.urandom(32)

# ...
@app.route('/')
def home():
    if 'username' not in session:
        return redirect('/login.html')
    # Let's default to the main browse page now
    return redirect('/index.html')

@app.route('/login.html')
def login_page():
    return render_template('login.html')

@app.route('/signup.html')
def signup_page():
    return render_template('signup.html')

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        print(f"Login attempt for user: {username}")

        # Debugging: write info to a log file inside the data dir so packaged
        # apps can surface diagnostics without a console.
        try:
            debug_log = os.path.join(getattr(user_model, 'app_data_dir', DATA_DIR), 'heimdall-debug.log')
            with open(debug_log, 'a', encoding='utf-8') as dl:
                dl.write(f"LOGIN ATTEMPT: user={username} file={user_model.file_path} profiles={user_model.profiles_path}\n")
        except Exception as _e:
            print('Failed to write debug log:', _e)

        user = user_model.get_user(username)
        print(f"Found user: {bool(user)}")
        if user is not None:
            print(f"Stored password (raw): {user.get('password')}")

        valid = user_model.validate_login(username, password)
        print(f"Password valid: {valid}")

        if valid:
            session['username'] = username
            return jsonify({'message': 'Login successful'}), 200
        return jsonify({'message': 'Invalid credentials'}), 401
    except Exception as e:
        # Write traceback to debug log for installed apps
        import traceback
        tb = traceback.format_exc()
        print('Exception in /api/login:', tb)
        try:
            debug_log = os.path.join(getattr(user_model, 'app_data_dir', DATA_DIR), 'heimdall-debug.log')
            with open(debug_log, 'a', encoding='utf-8') as dl:
                dl.write('EXCEPTION /api/login:\n')
                dl.write(tb + '\n')
        except Exception:
            pass
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        # Log the signup attempt to debug log
        try:
            debug_log = os.path.join(getattr(user_model, 'app_data_dir', DATA_DIR), 'heimdall-debug.log')
            with open(debug_log, 'a', encoding='utf-8') as dl:
                dl.write(f"SIGNUP ATTEMPT: user={username} file={user_model.file_path}\n")
        except Exception as _e:
            print('Failed to write debug log:', _e)

        success, message = user_model.create_user(username, password)
        if success:
            session['username'] = username
            return jsonify({'message': message}), 200
        return jsonify({'message': message}), 400
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print('Exception in /api/signup:', tb)
        try:
            debug_log = os.path.join(getattr(user_model, 'app_data_dir', DATA_DIR), 'heimdall-debug.log')
            with open(debug_log, 'a', encoding='utf-8') as dl:
                dl.write('EXCEPTION /api/signup:\n')
                dl.write(tb + '\n')
        except Exception:
            pass
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/logout')
def logout():
    session.pop('username', None)
    return redirect('/login.html')

@app.route('/api/current-user')
def current_user():
    if 'username' in session:
        return jsonify({'username': session['username']}), 200
    return jsonify({'message': 'Not logged in'}), 401

@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    profiles = user_model.get_profiles(session['username'])
    return jsonify({'profiles': profiles}), 200

@app.route('/api/profiles', methods=['POST'])
def save_profiles():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    data = request.get_json()
    profiles = data.get('profiles', [])
    
    if user_model.save_profiles(session['username'], profiles):
        return jsonify({'message': 'Profiles saved successfully'}), 200
    return jsonify({'message': 'Error saving profiles'}), 400
@app.route('/profiles.html')
def profiles():
    if 'username' not in session:
        return redirect('/login.html')
    return render_template('profiles.html')

@app.route('/index.html')
def index():
    if 'username' not in session:
        return redirect('/login.html')
    return render_template('index.html')

@app.route('/search.html')
def search_page():
    if 'username' not in session:
        return redirect('/login.html')
    return render_template('search.html')

@app.route('/music.html')
def music_page():
    """Serve the music page"""
    if 'username' not in session:
        return redirect('/login.html')
    return render_template('music.html')

@app.route('/details/<media_type>/<int:tmdb_id>')
def details_page(media_type, tmdb_id):
    if 'username' not in session:
        return redirect('/login.html')
    
    if media_type not in ['movie', 'tv']:
        abort(404, "Invalid media type")
        
    # Just render the template. JS will fetch the data.
    return render_template('details.html', media_type=media_type, tmdb_id=tmdb_id)

def fetch_tmdb(endpoint, extra_params={}):
    """
    Helper function to fetch data from TMDB API
    """
    if not TMDB_API_KEY:
        abort(500, "TMDB API key not configured")

    full_url = f"{TMDB_BASE_URL}{endpoint}"
    params = {'api_key': TMDB_API_KEY, 'language': 'en-US'}
    params.update(extra_params)

    try:
        response = requests.get(full_url, params=params)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching data from TMDB: {str(e)}")
        abort(500, f"Error fetching data from TMDB: {str(e)}")

# --- Movie API Routes ---
@app.route('/api/movies/popular')
def get_popular_movies():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    data = fetch_tmdb('/movie/popular')
    return jsonify(data.get('results', []))

@app.route('/api/movies/trending')
def get_trending_movies():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    data = fetch_tmdb('/trending/movie/week')
    return jsonify(data.get('results', []))

@app.route('/api/movies/top-rated')
def get_top_rated_movies():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    data = fetch_tmdb('/movie/top_rated')
    return jsonify(data.get('results', []))

# --- NEW: TV Show API Routes ---
@app.route('/api/tv/popular')
def get_popular_tv():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    data = fetch_tmdb('/tv/popular')
    return jsonify(data.get('results', []))

@app.route('/api/tv/trending')
def get_trending_tv():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    data = fetch_tmdb('/trending/tv/week')
    return jsonify(data.get('results', []))

@app.route('/api/tv/top-rated')
def get_top_rated_tv():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    data = fetch_tmdb('/tv/top_rated')
    return jsonify(data.get('results', []))

@app.route('/api/genres/<media_type>')
def get_genres(media_type):
    """
    Fetches the list of genres for either 'movie' or 'tv'.
    """
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    if media_type not in ['movie', 'tv']:
        return jsonify({'message': 'Invalid media type'}), 400
    
    data = fetch_tmdb(f'/genre/{media_type}/list')
    return jsonify(data.get('genres', []))

@app.route('/api/discover')
def discover_media():
    """
    Fetches media based on filters (type, genre, year, page).
    """
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401

    # Get filter parameters from the request
    media_type = request.args.get('type', 'movie') # Default to movie
    genre = request.args.get('genre')
    year = request.args.get('year')
    sort_by = request.args.get('sort', 'popularity.desc')
    page = request.args.get('page', '1') # Support pagination

    # Build the endpoint and query parameters
    endpoint = f'/discover/{media_type}'
    params = {
        'sort_by': sort_by,
        'include_adult': 'false',
        'page': page
    }

    if genre:
        params['with_genres'] = genre
    
    if media_type == 'movie' and year:
        params['primary_release_year'] = year
    elif media_type == 'tv' and year:
        params['first_air_date_year'] = year

    data = fetch_tmdb(endpoint, extra_params=params)
    # Return both results and pagination info
    return jsonify({
        'results': data.get('results', []),
        'page': data.get('page', 1),
        'total_pages': data.get('total_pages', 1)
    })

@app.route('/api/search')
def search_media():
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    query = request.args.get('q')
    
    if not query or len(query) < 2:
        return jsonify([])

    data = fetch_tmdb('/search/multi', {'query': query, 'include_adult': 'false'})
    
    filtered_results = [
        item for item in data.get('results', [])
        if item.get('media_type') in ['movie', 'tv'] and item.get('poster_path')
    ]

    return jsonify(filtered_results)

@app.route('/api/details/<media_type>/<int:tmdb_id>')
def get_details(media_type, tmdb_id):
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    if media_type not in ['movie', 'tv']:
        return jsonify({'message': 'Invalid media type'}), 400

    try:
        # Fetch main details
        details_data = fetch_tmdb(f'/{media_type}/{tmdb_id}')
        
        # Fetch recommendations
        recommendations_data = fetch_tmdb(f'/{media_type}/{tmdb_id}/recommendations')

        # Combine and send
        combined_data = {
            'details': details_data,
            'recommendations': recommendations_data.get('results', [])
        }
        return jsonify(combined_data)

    except Exception as e:
        # This will catch 404s from fetch_tmdb if the ID is invalid
        print(f"Error in get_details: {e}")
        abort(500, "Error fetching details from provider.")

@app.route('/api/tv/<int:tv_id>/season/<int:season_number>')
def get_season_details(tv_id, season_number):
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    try:
        # Fetch details for a specific season
        season_data = fetch_tmdb(f'/tv/{tv_id}/season/{season_number}')
        return jsonify(season_data)
    except Exception as e:
        print(f"Error in get_season_details: {e}")
        abort(500, "Error fetching season details.")

# --- Watch Page Routes ---
@app.route('/watch/movie/<int:tmdb_id>')
def watch_movie(tmdb_id):
    """
    Serves the video player page for MOVIES
    """
    if 'username' not in session:
        return redirect('/login.html')
    # Pass the ID and media_type to the template
    return render_template('watch.html', tmdb_id=tmdb_id, media_type='movie')

@app.route('/watch/tv/<int:tmdb_id>/s/<int:season_num>/e/<int:episode_num>')
def watch_tv(tmdb_id, season_num, episode_num):
    """
    Serves the video player page for a specific TV SHOW episode.
    """
    if 'username' not in session:
        return redirect('/login.html')
    
    # Pass all IDs to the template
    return render_template('watch.html', 
                           tmdb_id=tmdb_id, 
                           media_type='tv', 
                           season_num=season_num, 
                           episode_num=episode_num)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(project_root, 'frontend', 'js'), filename)

@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(project_root, 'frontend', 'css'), filename)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    return send_from_directory(os.path.join(project_root, 'frontend', 'assets'), filename)

# --- Watchlist Routes ---
import json

# Choose data directory (portable-first): prefer exe folder when frozen and writable,
# otherwise fall back to per-user AppData. This mirrors the logic in models.user.
def choose_data_dir():
    env_override = os.getenv('HEIMDALL_DATA_DIR')
    if env_override:
        return env_override

    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        force_portable = os.getenv('HEIMDALL_PORTABLE', '') in ('1', 'true', 'yes')
        if os.access(exe_dir, os.W_OK) or force_portable:
            return exe_dir

    # Fallback to per-user AppData / home
    base = os.getenv('APPDATA') or os.path.expanduser('~')
    data_dir = os.path.join(base, 'Heimdall')
    return data_dir


DATA_DIR = choose_data_dir()
os.makedirs(DATA_DIR, exist_ok=True)

WATCHLIST_FILE = os.path.join(DATA_DIR, 'watchlist.json')

# If we're using the exe folder as DATA_DIR but legacy data exists in AppData,
# migrate existing files so users keep their data after upgrading.
def migrate_legacy_appdata_if_needed(target_dir):
    legacy_base = os.getenv('APPDATA') or os.path.expanduser('~')
    legacy_dir = os.path.join(legacy_base, 'Heimdall')
    if os.path.abspath(legacy_dir) == os.path.abspath(target_dir):
        return

    try:
        if os.path.isdir(legacy_dir):
            for filename in ('users.csv', 'profiles.json', 'watchlist.json'):
                src = os.path.join(legacy_dir, filename)
                dst = os.path.join(target_dir, filename)
                if os.path.exists(src) and not os.path.exists(dst):
                    try:
                        import shutil
                        shutil.copy2(src, dst)
                        print(f'Migrated {src} -> {dst}')
                    except Exception as e:
                        print(f'Failed to migrate {src} -> {dst}: {e}')
    except Exception as e:
        print('Migration check failed:', e)


migrate_legacy_appdata_if_needed(DATA_DIR)

def load_watchlist():
    """Load watchlist data from JSON file"""
    try:
        with open(WATCHLIST_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_watchlist(data):
    """Save watchlist data to JSON file"""
    with open(WATCHLIST_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/watchlist.html')
def watchlist_page():
    """Serve the watchlist page"""
    if 'username' not in session:
        return redirect('/login.html')
    return render_template('watchlist.html')

@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    """Get watchlist items for current user and profile"""
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    username = session['username']
    profile = request.args.get('profile', 'default')
    
    watchlist_data = load_watchlist()
    user_key = f"{username}:{profile}"
    
    return jsonify(watchlist_data.get(user_key, [])), 200

@app.route('/api/watchlist', methods=['POST'])
def add_to_watchlist():
    """Add an item to the watchlist"""
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    username = session['username']
    data = request.get_json()
    profile = data.get('profile', 'default')
    item = data.get('item')
    
    if not item:
        return jsonify({'message': 'No item provided'}), 400
    
    watchlist_data = load_watchlist()
    user_key = f"{username}:{profile}"
    
    if user_key not in watchlist_data:
        watchlist_data[user_key] = []
    
    # Check if item already exists
    existing_ids = [i['id'] for i in watchlist_data[user_key]]
    if item['id'] not in existing_ids:
        watchlist_data[user_key].append(item)
        save_watchlist(watchlist_data)
        return jsonify({'message': 'Added to watchlist'}), 200
    
    return jsonify({'message': 'Already in watchlist'}), 200

@app.route('/api/watchlist/<int:item_id>', methods=['DELETE'])
def remove_from_watchlist(item_id):
    """Remove an item from the watchlist"""
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    username = session['username']
    profile = request.args.get('profile', 'default')
    
    watchlist_data = load_watchlist()
    user_key = f"{username}:{profile}"
    
    if user_key in watchlist_data:
        watchlist_data[user_key] = [
            item for item in watchlist_data[user_key] 
            if item['id'] != item_id
        ]
        save_watchlist(watchlist_data)
    
    return jsonify({'message': 'Removed from watchlist'}), 200

@app.route('/api/watchlist/profile/<profile_name>', methods=['DELETE'])
def delete_profile_watchlist(profile_name):
    """Delete all watchlist data for a specific profile"""
    if 'username' not in session:
        return jsonify({'message': 'Not logged in'}), 401
    
    username = session['username']
    user_key = f"{username}:{profile_name}"
    
    watchlist_data = load_watchlist()
    
    if user_key in watchlist_data:
        del watchlist_data[user_key]
        save_watchlist(watchlist_data)
        return jsonify({'message': 'Profile watchlist deleted'}), 200
    
    return jsonify({'message': 'No watchlist data found'}), 200

@app.route('/api/music/search/<query>')
def search_music(query):
    all_results = []

    # Search YouTube (using yt-dlp) with updated options to fix signature issues
    YDL_OPTS = {
        'format': 'bestaudio/best',
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'ignoreerrors': True,  # Continue on errors
        'age_limit': None,
        'geo_bypass': True,
        # These options help with signature extraction issues
        'extractor_retries': 3,
        'fragment_retries': 10,
        'skip_unavailable_fragments': True,
    }
    try:
        with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
            # Search for 10 videos to ensure we get good results even if some fail
            search_data = ydl.extract_info(f"ytsearch10:{query} official audio", download=False)
            if search_data.get('entries'):
                for video in search_data['entries']:
                    # Skip videos that failed to extract
                    if not video:
                        continue
                    try:
                        all_results.append({
                            'source': 'youtube',
                            'id': video['webpage_url'], # The ID will be the full URL
                            'title': video['title'],
                            'artist': video.get('uploader', 'Unknown Artist'),
                            'image': video.get('thumbnail', ''),
                            'duration': video.get('duration', 0)
                        })
                        # Stop after getting 5 valid results
                        if len(all_results) >= 5:
                            break
                    except Exception as e:
                        print(f"Error processing video: {e}")
                        continue
    except Exception as e:
        print(f"yt-dlp search error: {e}")

    return jsonify(all_results)

@app.route('/api/music/stream')
def get_music_stream():
    source = request.args.get('source')
    track_id = request.args.get('id')

    if not source or not track_id:
        return jsonify({'error': 'Missing source or id'}), 400

    stream_url = ''
    try:
        if source == 'youtube':
            YDL_OPTS = {
                'format': 'bestaudio/best', # Select best audio
                'quiet': True,
                'no_warnings': True,
                'ignoreerrors': True,
                'extractor_retries': 3,
                'fragment_retries': 10,
                'skip_unavailable_fragments': True,
            }
            with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
                info = ydl.extract_info(track_id, download=False)
                if info and 'url' in info:
                    stream_url = info['url'] # This is the direct stream URL
                else:
                    raise Exception("Could not extract stream URL")

        if not stream_url:
            raise Exception("Could not find stream URL")

        return jsonify({'stream_url': stream_url})

    except Exception as e:
        print(f"Stream error: {e}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/music/lyrics')
def get_lyrics():
    """Proxy endpoint for lyrics with multiple fallback APIs"""
    artist = request.args.get('artist')
    title = request.args.get('title')
    
    if not artist or not title:
        return jsonify({'error': 'Missing artist or title'}), 400
    
    # Try multiple lyrics sources
    lyrics_sources = [
        {
            'name': 'lyrics.ovh',
            'url': f"https://api.lyrics.ovh/v1/{artist}/{title}",
            'timeout': 5
        },
        {
            'name': 'lrclib',
            'url': f"https://lrclib.net/api/get?artist_name={artist}&track_name={title}",
            'timeout': 5
        }
    ]
    
    for source in lyrics_sources:
        try:
            print(f"Trying {source['name']} for: {artist} - {title}")
            response = requests.get(source['url'], timeout=source['timeout'])
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle different API response formats
                if 'lyrics' in data:
                    # lyrics.ovh format
                    print(f"Success from {source['name']}")
                    return jsonify({'lyrics': data['lyrics']}), 200
                elif 'plainLyrics' in data:
                    # lrclib format
                    print(f"Success from {source['name']}")
                    return jsonify({'lyrics': data['plainLyrics']}), 200
                elif 'syncedLyrics' in data:
                    # lrclib synced format (fallback)
                    print(f"Success from {source['name']} (synced)")
                    return jsonify({'lyrics': data['syncedLyrics']}), 200
                    
        except requests.exceptions.Timeout:
            print(f"{source['name']} timed out")
            continue
        except requests.exceptions.ConnectionError:
            print(f"{source['name']} connection failed")
            continue
        except Exception as e:
            print(f"{source['name']} error: {e}")
            continue
    
    # All sources failed
    return jsonify({'error': 'Lyrics not found in any source'}), 404

if __name__ == '__main__':
    # Prefer waitress for a stable single-process server (no reloader).
    try:
        from waitress import serve
        print('Starting waitress server on 127.0.0.1:8000')
        serve(app, host='127.0.0.1', port=8000)
    except Exception:
        # Fall back to Flask dev server if waitress isn't available.
        print('Waitress not available, starting Flask dev server (debug=False)')
        app.run(host='127.0.0.1', port=8000, debug=False)
