# Local development video tools

Run `npm run setup:tools` from frontend after installing demo-server dependencies.
This downloads the pinned `b6.1.1` Windows x64 FFmpeg build from eugeneware/ffmpeg-static's GitHub releases, including its license/readme, and copies ffprobe-static's Windows executable here.
The generated provenance.json records source and local SHA-256 hashes (not an independent publisher signature).
These binaries and caches are ignored by Git. Do not bundle or redistribute them with the mobile app; review their licenses before any future distribution.
