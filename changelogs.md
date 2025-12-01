                                            ========== MediaHUB @ 2025 ==========
                    ------------------------------------ BY CHIKU ------------------------------------
## Version 0.2
##### Release Date: xx xx xxxx

* Helper Function
  - Introduce a helper function to log things into a log file for each service
  - It can be toggled using the DEBUG environment varible true/false value.

* Upload to metadata and thumbnail generation
  - Files are now have their metadata and thumbnail generated along with the upload process.

* Nodemon and Service Run script
  - Introduced nodemon to ease development, watch the file changes and restart server.
  - Added Shell script to start all service at once.

* Video upload fix
  - Fixed the issue with video upload not working

* Transcoder Service
  - Added a new service "transcoder" for encoding the uploaded videos into small parts and with multiple resolutions.
  - Added script/package to run the services. (Pm2 and terminal script)

* Edit and Delete media file details
  - Added endpoint to handle the edit the media name.
  - Added endpoint to handle the media deletion.

* mysql > sqlite
  - Replaced mysql with sqlite. It will ease the pain of project setup.

## Version 0.1
##### Release Date: 22/November/2025

* Initial Setup
  - Package installations.
  - Database connection setups and initial Prisma models.
  - Auth microservice setup (Signup, Login, JWT Middleware).

* Upload Service
  - Added authenticated file upload endpoint using Multer.
  - Saved uploaded files under `services/upload/uploads/`.
  - Basic validation for missing files and error responses.

* Media Service
  - Added `/media` endpoint to list all media entries.
  - Added `/media/:id` endpoint to fetch single media details.
  - Integrated Prisma queries for ordered media listing.

* Metadata Service
  - Introduced dedicated metadata microservice.
  - Implemented type-based metadata extraction for:
    - Images (dimensions, type).
    - Audio / Video (duration, bitrate, format) via ffprobe.
    - PDFs (page count + basic text preview).
  - Added `MediaMetadata` table and wired JSON metadata storage.
  - Updated `MediaFile.status` to track metadata processing state.

* Thumbnail Service
  - Implemented thumbnail generation microservice.
  - Added image thumbnail generation using `sharp` (resized JPEGs).
  - Added video thumbnail generation using `ffmpeg` (frame capture).
  - Saved thumbnails under `services/upload/thumbnails/`.
  - Linked thumbnails to media records via `MediaFile.thumbnail` field.

* Path & FS Handling
  - Standardized cross-service file path resolution (Upload → Metadata → Thumbnail).
  - Fixed Windows/ESM path issues using `fileURLToPath` and `path.resolve`.
  - Ensured services can safely locate uploaded files from their own context.