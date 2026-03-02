<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeuralVision: Image Analysis Web App</title>

    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- AdminLTE CSS -->
    <link rel="stylesheet" href="assets/css/adminlte.min.css">
    <!-- FontAwesome 6 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <!-- SweetAlert2 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.10.6/dist/sweetalert2.min.css" rel="stylesheet">
    <!-- Custom CSS (Minimized) -->
    <link rel="stylesheet" href="assets/css/style.css">
</head>

<body class="layout-fixed sidebar-expand-lg bg-body-tertiary" data-bs-theme="dark">

    <div class="app-wrapper">
        <!-- Header -->
        <nav class="app-header navbar navbar-expand bg-body sticky-top" style="z-index: 1000;">
            <div class="container-fluid">
                <!-- Sidebar Toggle -->
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" data-lte-toggle="sidebar" href="#" role="button"><i
                                class="fas fa-bars"></i></a>
                    </li>
                </ul>

                <!-- Right Header Actions -->
                <ul class="navbar-nav ms-auto gap-2 align-items-center">
                    <li class="nav-item">
                        <button id="openSettingsBtn" class="btn btn-outline-secondary btn-sm rounded-circle border-0"
                            title="Settings">
                            <i class="fas fa-gear"></i>
                        </button>
                    </li>
                    <li class="nav-item">
                        <button id="themeToggleBtn" class="btn btn-outline-secondary btn-sm rounded-circle border-0"
                            title="Toggle Theme">
                            <i class="fas fa-moon"></i>
                        </button>
                    </li>
                    <li class="nav-item d-flex align-items-center me-3 ms-2 border-start ps-3 border-secondary-subtle">
                        <i class="fas fa-image text-muted small me-2" title="Grid Size"></i>
                        <input type="range" class="form-range" id="gridSizeSlider" min="150" max="400" step="10"
                            value="200" style="width: 100px;">
                    </li>
                    <li class="nav-item d-flex gap-2">
                        <button id="analyzeSelectedBtn" class="btn btn-primary btn-sm" disabled>
                            <i class="fas fa-bolt me-1"></i> Analyze Selected
                        </button>
                        <button id="analyzeViewBtn" class="btn btn-outline-primary btn-sm">
                            <i class="fas fa-magic me-1"></i> Analyze View
                        </button>
                        <button id="deleteSelectedBtn" class="btn btn-outline-danger btn-sm" disabled>
                            <i class="fas fa-trash me-1"></i> Delete Selected
                        </button>
                    </li>
                    <li class="nav-item ms-3 ps-3 border-start border-secondary-subtle d-flex align-items-center">
                        <span class="text-secondary fw-bold pe-2">
                            <i class="fas fa-user-circle me-1"></i>
                            <?php echo htmlspecialchars($_SESSION['username']); ?>
                        </span>
                        <a href="api/auth.php?action=logout" class="btn btn-outline-danger btn-sm" title="Sign Out">
                            <i class="fas fa-sign-out-alt"></i>
                        </a>
                    </li>
                </ul>
            </div>
        </nav>

        <!-- Sidebar -->
        <aside class="app-sidebar bg-body-secondary shadow">
            <div class="sidebar-brand">
                <a href="./index.php" class="brand-link d-flex align-items-center gap-2 px-3">
                    <img src="assets/img/logo.png" alt="NeuralVision Logo" class="brand-image img-circle shadow-sm"
                        style="width: 32px; height: 32px; object-fit: cover; opacity: .8">
                    <span class="brand-text fw-bold bg-gradient-text">NeuralVision</span>
                </a>
            </div>

            <div class="sidebar-wrapper d-flex flex-column h-100">
                <nav class="mt-3 flex-grow-1 overflow-auto px-2">
                    <h6 class="text-uppercase text-muted fw-bold mb-2 small px-3">Smart Filters</h6>
                    <ul class="nav nav-pills nav-sidebar flex-column mb-3" id="smartFilters">
                        <li class="nav-item w-100">
                            <a href="#" class="nav-link active d-flex align-items-center w-100" data-filter="all">
                                <i class="nav-icon fas fa-images me-2"></i>
                                <p class="text-truncate flex-grow-1 mb-0">All Images</p>
                            </a>
                        </li>
                        <li class="nav-item w-100">
                            <a href="#" class="nav-link d-flex align-items-center w-100" data-filter="unanalyzed">
                                <i class="nav-icon fas fa-robot me-2"></i>
                                <p class="text-truncate flex-grow-1 mb-0">Unanalyzed</p>
                            </a>
                        </li>
                        <li class="nav-item w-100">
                            <a href="#" class="nav-link d-flex align-items-center w-100" data-filter="uncategorized">
                                <i class="nav-icon fas fa-folder-open me-2"></i>
                                <p class="text-truncate flex-grow-1 mb-0">Uncategorized</p>
                            </a>
                        </li>
                    </ul>

                    <div class="d-flex justify-content-between align-items-center mb-2 px-3 mt-4">
                        <h6 class="text-uppercase text-muted fw-bold mb-0 small">Folders</h6>
                        <button class="btn btn-sm text-secondary p-0" id="addCategoryBtn" title="Add Folder">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <ul class="nav nav-pills nav-sidebar flex-column" id="categoryList">
                        <!-- Dynamic categories loaded here -->
                    </ul>
                </nav>
            </div>
        </aside>

        <!-- Resizer Handle -->
        <div id="resizer" class="resizer-handle"></div>

        <!-- Main Content -->
        <main class="app-main" id="mainGallery">

            <!-- Sticky Header Zone -->
            <div class="sticky-top bg-body" style="top: 0; z-index: 10;">

                <!-- App Content Header (Actions) -->
                <div class="app-content-header px-4 py-3 d-flex justify-content-end align-items-center">
                    <button class="btn btn-sm btn-primary" id="toggleUploadBtn">
                        <i class="fas fa-upload me-1"></i> Toggle Upload
                    </button>
                </div>

                <!-- Upload Area (Dynamic visibility via JS) -->
                <div class="px-4">
                    <div id="uploadZone"
                        class="upload-zone mb-3 p-4 rounded-4 text-center border-dashed d-flex flex-column justify-content-center align-items-center gap-2 bg-body-tertiary">
                        <i class="fas fa-cloud-arrow-up fa-2x text-muted"></i>
                        <div>
                            <h6 class="mb-0">Drag & Drop images here</h6>
                            <p class="text-muted small mb-0">or click to browse from computer</p>
                        </div>
                        <input type="file" id="fileInput" multiple accept="image/*" class="d-none">
                        <button
                            class="btn btn-sm btn-outline-secondary btn-close-upload position-absolute top-0 end-0 m-3 d-none">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Current Category Title (Below Upload Area) -->
                <div
                    class="px-4 py-2 border-bottom border-secondary-subtle d-flex align-items-center gap-3 bg-body-tertiary">
                    <span id="galleryTitle" class="fw-bold fs-6 mb-0 text-secondary">All Images</span>
                    <span class="badge rounded-pill text-bg-secondary" id="imageCount">0</span>
                </div>
            </div>

            <!-- App Content Gallery Grid -->
            <div class="app-content p-4 d-flex flex-column">

                <!-- Image Grid -->
                <div class="gallery-container content-area" id="imageGrid">
                    <!-- Dynamic images loaded here -->
                    <div class="text-center text-muted mt-5 d-none w-100" id="emptyState" style="grid-column: 1 / -1;">
                        <i class="fas fa-box-open fa-3x mb-3"></i>
                        <p>No images found in this view.</p>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Settings Modal -->
    <div class="modal fade" id="settingsModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">AI Settings</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Ollama Model</label>
                        <div class="d-flex align-items-center mb-2">
                            <select id="ollamaModelSelect" class="form-select">
                                <option value="llama3.2-vision">llama3.2-vision (Default)</option>
                            </select>
                            <button type="button" id="refreshModelsBtn" class="btn btn-outline-secondary ms-2"
                                title="Refresh Models">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                        <small class="text-muted">Ensure your local Ollama is running.</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Temperature: <span id="tempValueDisplay">0.8</span></label>
                        <input type="range" class="form-range" id="ollamaTemp" min="0" max="2" step="0.1" value="0.8">
                        <small class="text-muted">Higher values make output more creative (default: 0.8).</small>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Max Tokens (num_predict)</label>
                        <input type="number" class="form-control" id="ollamaPredict" value="-1">
                        <small class="text-muted">Maximum length of response. -1 for infinity.</small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveSettingsBtn">Save Changes</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Image Detail Modal -->
    <div class="modal fade" id="imageDetailModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content shadow-lg border-0 bg-transparent">
                <div class="modal-body p-0 position-relative">
                    <button type="button"
                        class="btn-close position-absolute top-0 end-0 m-3 z-3 bg-white bg-opacity-75 rounded-circle p-2"
                        data-bs-dismiss="modal" aria-label="Close"></button>
                    <div class="row g-0 rounded-4 overflow-hidden" style="background-color: var(--bs-body-bg);">
                        <div class="col-lg-8 d-flex align-items-center justify-content-center bg-black bg-opacity-75"
                            style="min-height: 400px; max-height: 85vh;">
                            <img id="detailImage" src="" alt="Full Resolution Image" class="img-fluid"
                                style="max-height: 85vh; object-fit: contain;">
                        </div>
                        <div class="col-lg-4 d-flex flex-column border-start border-secondary-subtle">
                            <div class="p-4 flex-grow-1 overflow-auto" style="max-height: 85vh;">
                                <h5 class="mb-3 fw-bold d-flex align-items-center gap-2">
                                    <i class="fas fa-robot text-primary"></i> AI Analysis
                                </h5>
                                <div id="detailAiText" class="text-body mt-2"
                                    style="font-size: 0.95rem; line-height: 1.6;">
                                    <!-- Dynamic text loaded here -->
                                </div>
                            </div>
                            <div
                                class="p-3 border-top border-secondary-subtle bg-body-tertiary d-flex justify-content-end gap-2">
                                <button type="button" class="btn btn-outline-primary btn-sm" id="copyDetailTextBtn">
                                    <i class="fas fa-copy me-1"></i>Copy Text
                                </button>
                                <button type="button" class="btn btn-outline-secondary btn-sm"
                                    data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/adminlte.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.10.6/dist/sweetalert2.all.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>

</html>