# NeuralVision 👁️🤖

NeuralVision is a sophisticated, AI-enhanced image analysis and gallery management platform. It combines a high-performance web dashboard with local AI capabilities to provide users with a secure, organized, and intelligent workspace for their visual assets.

## 🚀 Key Features

- **Local AI Analysis**: leverages Ollama (Llama 3.2 Vision) to generate detailed architectural and descriptive analysis of images directly on your hardware.
- **Secure Workspaces**: Robust user authentication system with isolated data per account.
- **Private Folders**: Granular folder-level security with optional password protection and visual lock indicators.
- **Modern UI/UX**:
    - **AdminLTE & Bootstrap 5**: A premium, responsive interface.
    - **Draggable Sidebar**: Custom-built resizable navigation that respects native collapse animations.
    - **Glassmorphism & Theming**: Integrated Light/Dark mode with persistent preferences.
- **Advanced Gallery Tools**:
    - **Marquee Selection**: Multi-select images effortlessly using a click-and-drag box.
    - **Drag-and-Drop Categorization**: Assign images to folders via intuitive drag gestures.
    - **Batch Actions**: Analyze, delete, or move multiple images in one click.
- **Context-Aware Uploads**: Intelligent uploading that automatically targets the currently active folder.

## 🛠️ Technology Stack

- **Backend**: PHP (PDO), MySQL
- **Frontend**: Vanilla JavaScript (ES6+), Bootstrap 5, AdminLTE v4
- **AI Engine**: Ollama (Llama 3.2-Vision)
- **UI Components**: SweetAlert2, FontAwesome 6

## 📦 Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/neuralvision.git
    ```
2.  **Database Setup**:
    - Import `database/schema.sql` into your MySQL server.
    - Configure `config/db.php` with your database credentials.
3.  **Local AI Core**:
    - Install [Ollama](https://ollama.com/).
    - Pull the vision model: `ollama pull llama3.2-vision`.
4.  **Web Server**:
    - Deploy to a PHP-enabled server (XAMPP, Apache, Nginx).
    - Ensure the `uploads/` directory is writable.

## 🔒 Security

NeuralVision prioritizes data privacy. All images are stored locally, and AI analysis is performed on-device via Ollama, ensuring no visual data ever leaves your server. Folders can be further secured with `bcrypt` hashed passwords for private galleries.

---
*Developed with focus on performance and intelligence.*



# NeuralVision Implementation Tasks

- [x] Phase 1: Foundation (Database & Setup)
  - [x] Create folder structure (`api`, `assets/css`, `assets/js`, `config`, `database`, `uploads`)
  - [x] Create `database/schema.sql`
  - [x] Establish `config/db.php` connection

- [x] Phase 2: Core Backend API
  - [x] Implement `api/categories.php` (GET, POST, DELETE)
  - [x] Implement `api/upload.php` (POST)
  - [x] Implement `api/images.php` (GET, update category)
  - [x] Implement `api/delete_image.php` (DELETE)

- [x] Phase 3: Frontend Shell & UI System
  - [x] Draft `index.php` with Bootstrap 5 and FontAwesome
  - [x] Implement `assets/css/style.css` (Theming, Glassmorphism, Grid)
  - [x] Implement light/dark mode toggle and local storage persistence
  - [x] Implement draggable resizable sidebar and local storage persistence

- [x] Phase 4: Gallery & Drag-and-Drop
  - [x] Implement `app.js` state management (`loadCategories`, `loadImages`)
  - [x] Build drag-and-drop workspace for file uploads
  - [x] Build image card rendering with checkboxes and quick actions
  - [x] Implement drag-and-drop image categorization into sidebar folders

- [x] Phase 5: AI Integration (Ollama)
  - [x] Implement `api/analyze.php` (Read local image, Base64 encode, cURL to Ollama)
  - [x] Implement UI for "Analyze Selected" batch action
  - [x] Implement UI for "Analyze View" sequential action
  - [x] Add loading indicators for processing items

- [x] Phase 6: Polish
  - [x] Integrate SweetAlert2 for toast notifications
  - [x] Handle API failure states and timeouts gracefully
  - [x] Final UI/UX review and tweaks

- [x] Phase 7: UX Improvements & Configuration
  - [x] Implement AI Settings Modal (Model selection, Temperature, Max Tokens)
  - [x] Shrink upload area and prevent auto-close
  - [x] Add Folder Renaming logic (PUT endpoint) 
  - [x] Enable 1-click text copying on AI descriptions
  - [x] Implement UI for "Delete Selected" batch action
  - [x] Integrate custom NeuralVision app logo

- [x] Phase 8: Gallery Enhancements
  - [x] Implement Image Detail Modal (Large view + full AI text)
  - [x] Implement UI for Gallery Card Size control (Header slider)
  - [x] Bind Card Size control to CSS Grid column sizing via JS

- [x] Phase 9: Marquee Drag Selection
  - [x] Inject CSS styling for a floating selection box overlay.
  - [x] Bind mousedown/move/up events in Javascript to draw the box.
  - [x] Calculate DOM rect intersections to automatically select image cards inside the box.

- [x] Phase 10: Context-Aware Background Uploading
  - [x] Update frontend `handleFiles` to append `state.activeFilter` as a target `category_id` in the `FormData` POST payload if the user is inside a specific folder view.
  - [x] Modify `api/upload.php` to accept the optional `category_id` from the `$_POST` array.
  - [x] Update the PHP SQL `INSERT` prepared statement to map the injected `category_id` during the initial file creation, bypassing the 'Uncategorized' null state.

- [ ] Phase 11: Authentication & Private Workspaces
  - [x] Implement DB Schema changes (`users` table, `user_id` FKs, `private_key` column on `categories`).
  - [x] Build `api/auth.php` (login, register, logout endpoints).
  - [x] Build `login.php` & `register.php` UIs with AJAX form handlers.
  - [x] Lock `index.php` behind `$_SESSION['user_id']` and add a Logout button to the header.
  - [x] Refactor all `api/*.php` endpoints to filter strictly by `user_id`.
  - [x] Update `app.js` UI to prompt for Optional Folder Passwords when creating folders, and verify passwords against `api/folder_auth.php` when clicking locked folders.
  - [x] Fix sidebar collapse/resizing regression by removing body-level overrides and using custom width variable.
  - [x] Implement folder password updates and "Unlock Folder" option in `editCategory` and `api/categories.php`.