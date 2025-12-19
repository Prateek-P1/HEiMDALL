# Build script for creating Python executable with PyInstaller
# Run this before building the Electron app

import PyInstaller.__main__
import os
import sys
import shutil

# Get the project root directory
project_root = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(project_root, 'backend')
frontend_dir = os.path.join(project_root, 'frontend')
output_dir = os.path.join(project_root, 'python-build')

print("=" * 60)
print("Building Heimdall Backend Executable")
print("=" * 60)

# Clean previous builds
if os.path.exists(output_dir):
    print(f"Cleaning previous build at {output_dir}...")
    shutil.rmtree(output_dir)

print("\nStarting PyInstaller build...")
print(f"Backend directory: {backend_dir}")
print(f"Output directory: {output_dir}")

# PyInstaller options
pyinstaller_args = [
    os.path.join(project_root, 'launcher.py'),  # Main script (launcher handles frozen frontend paths)
    
    # Output configuration
    '--name=heimdall-backend',
    f'--distpath={os.path.join(output_dir, "dist")}',
    f'--workpath={os.path.join(output_dir, "build")}',
    f'--specpath={output_dir}',
    
    # Bundle everything into one folder
    '--onedir',
    
    # Don't open console window
    '--noconsole',
    
    # Include additional data files
    f'--add-data={frontend_dir}{os.pathsep}frontend',
    f'--add-data={os.path.join(backend_dir, "models")}{os.pathsep}models',
    
    # Hidden imports (Flask dependencies)
    '--hidden-import=flask',
    '--hidden-import=dotenv',
    '--hidden-import=requests',
    '--hidden-import=werkzeug',
    '--hidden-import=jinja2',
    '--hidden-import=click',
    '--hidden-import=itsdangerous',
    '--hidden-import=markupsafe',
    '--hidden-import=bcrypt',
    
    # SocketIO async driver imports
    '--hidden-import=engineio.async_drivers.threading',
    '--hidden-import=gevent',
    '--hidden-import=geventwebsocket',
    
    # Exclude unnecessary packages to reduce size
    '--exclude-module=tkinter',
    '--exclude-module=matplotlib',
    '--exclude-module=numpy',
    '--exclude-module=pandas',
    
    # Clean build
    '--clean',
    
    # Icon (optional - comment out if not needed)
    # f'--icon={os.path.join(frontend_dir, "assets", "HEiMDALL_logo.ico")}',
]

try:
    print("\nRunning PyInstaller with arguments:")
    for arg in pyinstaller_args:
        print(f"  {arg}")
    
    print("\n" + "=" * 60)
    PyInstaller.__main__.run(pyinstaller_args)
    print("=" * 60)
    
    print("\n✓ Build completed successfully!")
    print(f"\nExecutable location:")
    print(f"  {os.path.join(output_dir, 'dist', 'heimdall-backend', 'heimdall-backend.exe')}")
    print("\nYou can now run: npm run build")
    
except Exception as e:
    print(f"\n✗ Build failed: {e}", file=sys.stderr)
    sys.exit(1)
