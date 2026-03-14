// State Management
const state = {
    categories: [],
    images: [],
    selectedImageIds: new Set(),
    activeFilter: 'all', // 'all', 'unanalyzed', 'uncategorized', or category ID
    theme: localStorage.getItem('theme') || 'dark',
    sidebarWidth: localStorage.getItem('sidebarWidth') || '250',
    isAnalyzing: false,
    ollamaModel: localStorage.getItem('ollamaModel') || 'llama3.2-vision',
    ollamaTemp: localStorage.getItem('ollamaTemp') || 0.8,
    ollamaPredict: localStorage.getItem('ollamaPredict') || -1,
    ollamaContext: localStorage.getItem('ollamaContext') || 2048,
    gridSize: localStorage.getItem('gridSize') || 200 // Default 200px
};

// DOM Elements
const elements = {
    themeBtn: document.getElementById('themeToggleBtn'),
    resizer: document.getElementById('resizer'),
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    toggleUploadBtn: document.getElementById('toggleUploadBtn'),
    categoryList: document.getElementById('categoryList'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    gridSizeSlider: document.getElementById('gridSizeSlider'),
    imageGrid: document.getElementById('imageGrid'),
    analyzeSelectedBtn: document.getElementById('analyzeSelectedBtn'),
    reanalyzeSelectedBtn: document.getElementById('reanalyzeSelectedBtn'),
    clearAnalysisBtn: document.getElementById('clearAnalysisBtn'),
    analyzeViewBtn: document.getElementById('analyzeViewBtn'),
    deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    imageDetailModal: new bootstrap.Modal(document.getElementById('imageDetailModal')),
    detailImage: document.getElementById('detailImage'),
    detailAiText: document.getElementById('detailAiText'),
    smartFilters: document.querySelectorAll('.nav-link[data-filter]'),
    imageCount: document.getElementById('imageCount'),
    galleryTitle: document.getElementById('galleryTitle'),
    emptyState: document.getElementById('emptyState')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initResizer();
    initGridSize();
    initMarqueeSelection();
    bindEvents();

    // Fetch Data
    loadCategories();
    loadImages();
});

// --- UI Shell ---
function initTheme() {
    document.body.setAttribute('data-bs-theme', state.theme);
    const icon = elements.themeBtn.querySelector('i');
    if (state.theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

function initGridSize() {
    if (elements.gridSizeSlider) {
        elements.gridSizeSlider.value = state.gridSize;
        document.documentElement.style.setProperty('--card-min-width', state.gridSize + 'px');
        document.documentElement.style.setProperty('--card-line-clamp', Math.floor(state.gridSize / 60));
    }
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    initTheme();
}

function initResizer() {
    // Apply starting width via custom variable to avoid overriding AdminLTE native collapse state
    document.documentElement.style.setProperty('--lte-sidebar-custom-width', state.sidebarWidth + 'px');

    let isResizing = false;

    elements.resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        elements.resizer.classList.add('resizing');
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 400) newWidth = 400;
        document.documentElement.style.setProperty('--lte-sidebar-custom-width', newWidth + 'px');
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            elements.resizer.classList.remove('resizing');
            // Save the new width
            state.sidebarWidth = getComputedStyle(document.documentElement).getPropertyValue('--lte-sidebar-custom-width').replace('px', '').trim() || '250';
            localStorage.setItem('sidebarWidth', state.sidebarWidth);
        }
    });

    // Support touch devices (tablets)
    elements.resizer.addEventListener('touchstart', (e) => {
        isResizing = true;
        elements.resizer.classList.add('resizing');
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        let newWidth = e.touches[0].clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 400) newWidth = 400;
        document.documentElement.style.setProperty('--lte-sidebar-custom-width', newWidth + 'px');
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (isResizing) {
            isResizing = false;
            elements.resizer.classList.remove('resizing');
            state.sidebarWidth = getComputedStyle(document.documentElement).getPropertyValue('--lte-sidebar-custom-width').replace('px', '').trim() || '250';
            localStorage.setItem('sidebarWidth', state.sidebarWidth);
        }
    });
}

// --- Marquee Selection Engine ---
function initMarqueeSelection() {
    const selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    selectionBox.id = 'selectionBox';
    document.body.appendChild(selectionBox);

    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    let initialSelection = new Set(); // Store what was selected before the drag started

    // Bind listener to the absolute root mainGallery container to catch all lower screen whitespace
    const mainGallery = document.getElementById('mainGallery');
    mainGallery.addEventListener('mousedown', (e) => {
        // Prevent marquee if clicking on buttons, links, sticky header tools, scrollbars, or already-selected items
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.card-info') || e.target.closest('.sticky-top')) return;

        // Prevent starting drag on the scrollbar (clientX vs offsetWidth trick)
        if (e.clientX >= document.documentElement.offsetWidth) return;

        // Prevent marquee if clicking directly onto an image card. Marquees are only drawn from empty space.
        const card = e.target.closest('.image-card');
        if (card) {
            return; // Let native HTML5 drag-and-drop take over
        }

        isSelecting = true;
        // Account for absolute page scroll so the box draws where the mouse actually is
        startX = e.clientX + window.scrollX;
        startY = e.clientY + window.scrollY;

        // If Ctrl, Cmd, or Shift are not held down, clear existing selection for a fresh marquee
        if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            state.selectedImageIds.clear();
            document.querySelectorAll('.image-card.selected').forEach(c => c.classList.remove('selected'));
            updateBatchButtons();
        }

        // Snapshot the current selection state so we can toggle cleanly
        initialSelection = new Set(state.selectedImageIds);

        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;

        // Account for absolute page scroll
        const currentX = e.clientX + window.scrollX;
        const currentY = e.clientY + window.scrollY;

        // Calculate Box Dimensions (allowing drawing backwards)
        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';

        // Detect intersections with image cards
        const boxRect = selectionBox.getBoundingClientRect();
        const cards = elements.imageGrid.querySelectorAll('.image-card');

        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            // Standard AABB (Axis-Aligned Bounding Box) Collision Math
            const isIntersecting = !(
                boxRect.right < cardRect.left ||
                boxRect.left > cardRect.right ||
                boxRect.bottom < cardRect.top ||
                boxRect.top > cardRect.bottom
            );

            const id = parseInt(card.dataset.id);

            // Toggle logic: If intersecting, swap its visual state compared to the initial
            if (isIntersecting) {
                if (initialSelection.has(id)) {
                    state.selectedImageIds.delete(id);
                    card.classList.remove('selected');
                } else {
                    state.selectedImageIds.add(id);
                    card.classList.add('selected');
                }
            } else {
                // Return to initial state if it falls outside the box during the drag
                if (initialSelection.has(id)) {
                    state.selectedImageIds.add(id);
                    card.classList.add('selected');
                } else {
                    state.selectedImageIds.delete(id);
                    card.classList.remove('selected');
                }
            }
        });

        updateBatchButtons();
    });

    document.addEventListener('mouseup', () => {
        if (isSelecting) {
            isSelecting = false;
            selectionBox.style.display = 'none';
        }
    });
}

// --- Event Binding ---
function bindEvents() {
    elements.themeBtn.addEventListener('click', toggleTheme);

    if (elements.gridSizeSlider) {
        elements.gridSizeSlider.addEventListener('input', (e) => {
            state.gridSize = e.target.value;
            document.documentElement.style.setProperty('--card-min-width', state.gridSize + 'px');
            document.documentElement.style.setProperty('--card-line-clamp', Math.floor(state.gridSize / 60));
            localStorage.setItem('gridSize', state.gridSize);
        });
    }

    elements.toggleUploadBtn.addEventListener('click', () => {
        elements.uploadZone.classList.toggle('d-none');
    });

    elements.uploadZone.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
            elements.fileInput.click();
        }
    });

    elements.uploadZone.querySelector('.btn-close-upload').addEventListener('click', () => {
        elements.uploadZone.classList.add('d-none');
    });

    // Quick File Upload Drag/Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        elements.uploadZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(eventName => {
        elements.uploadZone.addEventListener(eventName, () => {
            elements.uploadZone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        elements.uploadZone.addEventListener(eventName, () => {
            elements.uploadZone.classList.remove('dragover');
        });
    });

    elements.uploadZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Sidebar Category Actions
    elements.addCategoryBtn.addEventListener('click', addCategoryDialog);

    // Filter Listeners
    elements.smartFilters.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveFilter(e.target.closest('a').dataset.filter, e.target.closest('a').innerText.trim());
        });
    });

    // Setup Settings listeners explicitly
    const openSettingsEl = document.getElementById('openSettingsBtn');
    if (openSettingsEl) {
        openSettingsEl.addEventListener('click', openSettings);
    }

    // Fallback global delegation (since Settings was moved to header, it might exist early but good to keep)
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('#openSettingsBtn') || e.target.closest('.settings-link')) {
            openSettings();
        }
    });

    const saveSettingsEl = document.getElementById('saveSettingsBtn');
    if (saveSettingsEl) {
        saveSettingsEl.addEventListener('click', saveSettings);
    } else {
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('#saveSettingsBtn')) {
                saveSettings();
            }
        });
    }

    // Batch Actions
    elements.analyzeSelectedBtn.addEventListener('click', async () => {
        if (state.selectedImageIds.size === 0) return;
        await processAnalysisQueue(Array.from(state.selectedImageIds));
    });

    if (elements.reanalyzeSelectedBtn) {
        elements.reanalyzeSelectedBtn.addEventListener('click', async () => {
            if (state.selectedImageIds.size === 0) return;
            await processAnalysisQueue(Array.from(state.selectedImageIds));
        });
    }

    if (elements.clearAnalysisBtn) {
        elements.clearAnalysisBtn.addEventListener('click', async () => {
            if (state.selectedImageIds.size === 0) return;
            await processClearQueue(Array.from(state.selectedImageIds));
        });
    }

    if (elements.deleteSelectedBtn) {
        elements.deleteSelectedBtn.addEventListener('click', async () => {
            if (state.selectedImageIds.size === 0) return;
            await processDeleteQueue(Array.from(state.selectedImageIds));
        });
    }

    elements.analyzeViewBtn.addEventListener('click', async () => {
        // Collect all currently rendered Unanalyzed image cards
        const viewableUnanalyzed = Array.from(document.querySelectorAll('.image-card'))
            .filter(card => !card.dataset.analyzed || card.dataset.analyzed === "false")
            .map(card => parseInt(card.dataset.id));

        if (viewableUnanalyzed.length === 0) {
            Swal.fire({ toast: true, position: 'bottom-end', icon: 'info', title: 'No unanalyzed images in current view!', showConfirmButton: false, timer: 3000 });
            return;
        }
        await processAnalysisQueue(viewableUnanalyzed);
    });
}

// --- Upload System ---
function handleDrop(e) { handleFiles(e.dataTransfer.files); }
function handleFileSelect(e) { handleFiles(e.target.files); }

async function handleFiles(files) {
    if (files.length === 0) return;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (validFiles.length === 0) {
        toast('Only image files are allowed', 'error');
        return;
    }

    toast(`Starting upload of ${validFiles.length} file(s)...`, 'info');

    // PHP natively limits max_file_uploads (default 20) and post_max_size (default 8M)
    // To bypass these limits robustly, we upload files in small chunks.
    const CHUNK_SIZE = 3;
    let successCount = 0;
    let errorCount = 0;

    // Determine target category based on active filter visibility
    let targetCategoryId = null;
    if (state.activeFilter !== 'all' && state.activeFilter !== 'unanalyzed' && state.activeFilter !== 'uncategorized') {
        targetCategoryId = state.activeFilter;
    }

    for (let i = 0; i < validFiles.length; i += CHUNK_SIZE) {
        const chunk = validFiles.slice(i, i + CHUNK_SIZE);
        const formData = new FormData();
        chunk.forEach(file => formData.append('images[]', file));

        // Append context-aware target folder if applicable
        if (targetCategoryId) {
            formData.append('category_id', targetCategoryId);
        }

        try {
            const response = await fetch('api/upload.php', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                successCount += data.files ? data.files.length : chunk.length;
            } else {
                errorCount += chunk.length;
            }
        } catch (err) {
            console.error('Upload chunk failed:', err);
            errorCount += chunk.length;
        }
    }

    if (errorCount > 0) {
        toast(`Finished: ${successCount} uploaded, ${errorCount} failed.`, 'warning');
    } else {
        toast(`Successfully uploaded all ${successCount} files!`, 'success');
    }

    // Refresh the gallery to show all newly inserted chunks
    loadImages();
}

// --- Data Fetching & Rendering ---
async function loadCategories() {
    try {
        const res = await fetch('api/categories.php');
        state.categories = await res.json();
        renderCategories();
    } catch (err) {
        console.error("Failed to load categories", err);
    }
}

async function loadImages() {
    try {
        const res = await fetch('api/images.php');
        state.images = await res.json();
        renderGallery();
    } catch (err) {
        console.error("Failed to load images", err);
    }
}

function renderCategories() {
    elements.categoryList.innerHTML = '';
    state.categories.forEach(cat => {
        const li = document.createElement('li');
        li.className = 'nav-item w-100';

        const a = document.createElement('a');
        a.href = "#";
        a.className = `nav-link d-flex align-items-center w-100 ${state.activeFilter == cat.id ? 'active' : ''}`;
        a.dataset.id = cat.id;
        a.innerHTML = `<i class="nav-icon fas ${cat.is_locked ? 'fa-lock text-warning' : 'fa-folder'} me-2"></i> <p class="text-truncate flex-grow-1 mb-0">${escapeHTML(cat.name)}</p>`;

        // Category filters
        a.addEventListener('click', async (e) => {
            e.preventDefault();
            if (cat.is_locked) {
                const { value: password } = await Swal.fire({
                    title: 'Folder Locked',
                    input: 'password',
                    inputPlaceholder: 'Enter folder password',
                    inputAttributes: { autocapitalize: 'off', autocorrect: 'off' },
                    showCancelButton: true
                });
                if (password) {
                    try {
                        const formData = new FormData();
                        formData.append('category_id', cat.id);
                        formData.append('password', password);
                        const res = await fetch('api/folder_auth.php', { method: 'POST', body: formData });

                        if (res.ok) {
                            const authData = await res.json();
                            if (authData.success) {
                                setActiveFilter(cat.id, cat.name);
                            }
                        } else {
                            toast('Incorrect folder password', 'error');
                        }
                    } catch (err) { toast('Authentication error', 'error'); }
                }
            } else {
                setActiveFilter(cat.id, cat.name);
            }
        });

        // Setup drop zone for drag-and-drop category assignment
        a.addEventListener('dragover', (e) => {
            e.preventDefault();
            a.classList.add('bg-secondary', 'bg-opacity-25');
        });
        a.addEventListener('dragleave', (e) => {
            a.classList.remove('bg-secondary', 'bg-opacity-25');
        });
        a.addEventListener('drop', async (e) => {
            e.preventDefault();
            a.classList.remove('bg-secondary', 'bg-opacity-25');
            const data = e.dataTransfer.getData('text/plain');
            if (data) {
                try {
                    const ids = JSON.parse(data);
                    if (Array.isArray(ids)) {
                        toast(`Moving ${ids.length} image(s)...`, 'info');
                        const promises = ids.map(id => updateImageCategory(id, cat.id));
                        await Promise.all(promises);
                        toast(`Moved ${ids.length} image(s) to ${cat.name}!`, 'success');
                        state.selectedImageIds.clear();
                        updateBatchButtons();
                    } else {
                        updateImageCategory(data, cat.id); // fallback
                    }
                } catch (err) {
                    updateImageCategory(data, cat.id); // fallback for raw text
                }
            }
        });

        // Category Edit/Delete UI
        const actionsDiv = document.createElement('div');
        // Let CSS handle the hover state entirely for a fluid native feel
        actionsDiv.className = 'category-actions d-flex align-items-center ms-2 flex-shrink-0';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm text-danger border-0 p-1 me-1 hover-opacity';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = 'Edit Folder';
        editBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); editCategory(cat.id, cat.name); };

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm text-danger border-0 p-1 hover-opacity';
        delBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        delBtn.title = 'Delete Folder';
        delBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); deleteCategory(cat.id, cat.name); };

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(delBtn);

        a.appendChild(actionsDiv);
        li.appendChild(a);
        elements.categoryList.appendChild(li);
    });

    // Wire "Uncategorized" nav-link to drop logic
    const uncatLink = document.querySelector('a[data-filter="uncategorized"]');
    uncatLink.addEventListener('dragover', (e) => { e.preventDefault(); uncatLink.classList.add('bg-secondary', 'bg-opacity-25'); });
    uncatLink.addEventListener('dragleave', () => { uncatLink.classList.remove('bg-secondary', 'bg-opacity-25'); });
    uncatLink.addEventListener('drop', async (e) => {
        e.preventDefault();
        uncatLink.classList.remove('bg-secondary', 'bg-opacity-25');
        const data = e.dataTransfer.getData('text/plain');
        if (data) {
            try {
                const ids = JSON.parse(data);
                if (Array.isArray(ids)) {
                    toast(`Moving ${ids.length} image(s)...`, 'info');
                    const promises = ids.map(id => updateImageCategory(id, 'null'));
                    await Promise.all(promises);
                    toast(`Moved ${ids.length} image(s) to Uncategorized!`, 'success');
                    state.selectedImageIds.clear();
                    updateBatchButtons();
                } else {
                    updateImageCategory(data, 'null');
                }
            } catch (err) {
                updateImageCategory(data, 'null');
            }
        }
    });
}

function renderGallery() {
    elements.imageGrid.innerHTML = '';

    // Set view title
    let count = 0;

    state.images.forEach(img => {
        // Apply Filters
        if (state.activeFilter === 'unanalyzed' && img.analysis_result) return;
        if (state.activeFilter === 'uncategorized' && img.category_id !== null) return;
        if (state.activeFilter !== 'all' && state.activeFilter !== 'unanalyzed' && state.activeFilter !== 'uncategorized') {
            if (img.category_id != state.activeFilter) return;
        }

        // NEVER show locked active images in the global scope views. 
        // Only show them if we are actively viewing their exact dedicated folder.
        if (img.is_locked && state.activeFilter != img.category_id) {
            return;
        }

        count++;
        const card = document.createElement('div');
        card.className = `image-card ${state.selectedImageIds.has(img.id) ? 'selected' : ''}`;
        card.dataset.id = img.id;
        card.dataset.analyzed = img.analysis_result ? "true" : "false";

        // Draggable configuration
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
            // Drag the entire selection if this card is part of it, otherwise just drag this card
            let dragIds = [img.id];
            if (state.selectedImageIds.has(img.id) && state.selectedImageIds.size > 1) {
                dragIds = Array.from(state.selectedImageIds);
            }
            e.dataTransfer.setData('text/plain', JSON.stringify(dragIds));
            card.style.opacity = '0.5';
        });
        card.addEventListener('dragend', () => {
            card.style.opacity = '1';
        });

        const aiSnippet = img.analysis_result ? escapeHTML(img.analysis_result) : '<em>No analysis yet</em>';
        const aiBadgeColor = img.analysis_result ? 'text-success border-success bg-success bg-opacity-10' : 'text-warning border-warning bg-warning bg-opacity-10';

        card.innerHTML = `
            <div class="card-actions">
                <button title="Copy Image URL" onclick="copyToClipboard('http://${window.location.host}/imageanalysis/uploads/${img.filename}')"><i class="fas fa-link"></i></button>
                ${img.analysis_result ? `<button title="Copy Analysis" onclick="copyToClipboard('${escapeJsString(img.analysis_result)}')"><i class="fas fa-copy"></i></button>` : ''}
                <a href="uploads/${img.filename}" download class="btn" title="Download Image"><i class="fas fa-download"></i></a>
                <button class="text-danger" title="Delete Image" onclick="deleteImage(${img.id})"><i class="fas fa-trash"></i></button>
            </div>

            <img src="uploads/${img.filename}" alt="Image ${img.id}" loading="lazy" class="gallery-img-click" data-id="${img.id}">
            
            <div class="card-info" onclick="toggleSelection(${img.id}, event)">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge ai-badge ${aiBadgeColor} badge-ai-status">
                        ${img.analysis_result ? '<i class="fas fa-check me-1"></i>Analyzed' : '<i class="fas fa-clock me-1"></i>Pending'}
                    </span>
                    <small class="text-muted" style="font-size: 0.65rem;">${img.category_name || 'Uncategorized'}</small>
                </div>
                <div class="ai-snippet copyable-text" title="Click to copy text" onclick="copyToClipboard('${escapeJsString(img.analysis_result)}'); event.stopPropagation();">${aiSnippet}</div>
            </div>
            
            <!-- Loading overlay for generation -->
            <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-75 d-none flex-column justify-content-center align-items-center z-3 ai-loading-overlay">
                <div class="spinner-border text-primary" role="status"></div>
                <small class="mt-2 fw-bold text-white">Analyzing...</small>
            </div>
        `;

        elements.imageGrid.appendChild(card);

        // Bind Image Detail Modal Click
        const imgEl = card.querySelector('.gallery-img-click');
        imgEl.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger card selection
            elements.detailImage.src = 'uploads/' + img.filename;

            // Format AI text nicely or show placeholder
            const copyBtn = document.getElementById('copyDetailTextBtn');
            if (img.analysis_result && img.analysis_result.trim() !== '') {
                // Convert newlines to breaks for HTML display in the modal
                elements.detailAiText.innerHTML = escapeHTML(img.analysis_result).replace(/\n/g, '<br>');
                copyBtn.classList.remove('d-none');
                copyBtn.onclick = () => copyToClipboard(img.analysis_result);
            } else {
                elements.detailAiText.innerHTML = '<span class="text-muted fst-italic">No analysis available for this image yet. Click "Analyze Selected" to generate one.</span>';
                copyBtn.classList.add('d-none');
            }

            elements.imageDetailModal.show();
        });
    });

    elements.imageCount.innerText = count;
    if (count === 0) elements.emptyState.classList.remove('d-none');
    else elements.emptyState.classList.add('d-none');

    elements.imageGrid.appendChild(elements.emptyState);
    updateBatchButtons();
}

// --- Active States & Selection ---
function setActiveFilter(filterValue, labelName) {
    state.activeFilter = filterValue;

    // Update active nav link visual
    document.querySelectorAll('.nav-sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
        // Check data-filter or data-id
        if (link.dataset.filter == filterValue || link.dataset.id == filterValue) {
            link.classList.add('active');
        }
    });

    // Clear selection on filter change
    state.selectedImageIds.clear();

    elements.galleryTitle.innerHTML = `<i class="fas fa-filter text-muted me-2" style="font-size: 1rem;"></i>${escapeHTML(labelName)}`;
    renderGallery();
}

window.toggleSelection = function (id, event) {
    if (event) { event.stopPropagation(); }

    const isModifierPressed = event && (event.ctrlKey || event.metaKey || event.shiftKey);

    if (!isModifierPressed) {
        // OS Behavior: Standard click clears everything else and selects this one item
        state.selectedImageIds.clear();
        document.querySelectorAll('.image-card.selected').forEach(c => c.classList.remove('selected'));
        state.selectedImageIds.add(id);
    } else {
        // OS Behavior: Ctrl/Cmd click toggles the item additively
        if (state.selectedImageIds.has(id)) {
            state.selectedImageIds.delete(id);
        } else {
            state.selectedImageIds.add(id);
        }
    }

    // Fast DOM update for the specific element
    const card = document.querySelector(`.image-card[data-id="${id}"]`);
    if (card) {
        if (state.selectedImageIds.has(id)) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    }

    updateBatchButtons();
};

function updateBatchButtons() {
    elements.analyzeSelectedBtn.disabled = state.selectedImageIds.size === 0 || state.isAnalyzing;
    elements.analyzeSelectedBtn.innerHTML = `<i class="fas fa-bolt me-1"></i> Analyze Selected (${state.selectedImageIds.size})`;

    if (elements.reanalyzeSelectedBtn) {
        elements.reanalyzeSelectedBtn.disabled = state.selectedImageIds.size === 0 || state.isAnalyzing;
        elements.reanalyzeSelectedBtn.innerHTML = `<i class="fas fa-sync-alt me-1"></i> Reanalyze Selected (${state.selectedImageIds.size})`;
    }

    if (elements.clearAnalysisBtn) {
        elements.clearAnalysisBtn.disabled = state.selectedImageIds.size === 0 || state.isAnalyzing;
        elements.clearAnalysisBtn.innerHTML = `<i class="fas fa-broom me-1"></i> Clear Analysis (${state.selectedImageIds.size})`;
    }

    if (elements.deleteSelectedBtn) {
        elements.deleteSelectedBtn.disabled = state.selectedImageIds.size === 0 || state.isAnalyzing;
        elements.deleteSelectedBtn.innerHTML = `<i class="fas fa-trash me-1"></i> Delete Selected (${state.selectedImageIds.size})`;
    }
    elements.analyzeViewBtn.disabled = state.isAnalyzing;
}

// --- API Transmitting Functions ---

async function addCategoryDialog() {
    const { value: formValues } = await Swal.fire({
        title: 'New Folder',
        html:
            '<input id="swal-input1" class="swal2-input" placeholder="Folder Name (e.g. Landscapes)">' +
            '<input id="swal-input2" class="swal2-input" type="password" placeholder="Optional Password Lock">',
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return [
                document.getElementById('swal-input1').value,
                document.getElementById('swal-input2').value
            ]
        }
    });

    if (formValues && formValues[0]) {
        try {
            const res = await fetch('api/categories.php', {
                method: 'POST',
                body: JSON.stringify({ name: formValues[0], private_key: formValues[1] })
            });
            const data = await res.json();
            if (data.error) toast(data.error, 'error');
            else loadCategories(); // Refresh
        } catch (err) { toast('Error creating category', 'error'); }
    }
}

window.editCategory = async function (id, currentName) {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Folder',
        html:
            `<input id="swal-input-name" class="swal2-input" value="${escapeHTML(currentName)}" placeholder="Folder Name">` +
            '<div class="mt-3 text-start small text-muted px-4 mb-2">Change Password:</div>' +
            '<input id="swal-input-pass" class="swal2-input mt-0" type="password" placeholder="New Password">' +
            '<div class="mt-2"><button type="button" class="btn btn-sm btn-outline-danger" onclick="document.getElementById(\'swal-input-pass\').value=\'\'; Swal.showValidationMessage(\'Password cleared! Click OK to save.\')">Remove Password</button></div>',
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return [
                document.getElementById('swal-input-name').value,
                document.getElementById('swal-input-pass').value
            ]
        }
    });

    if (formValues && formValues[0]) {
        const newName = formValues[0];
        const newPass = formValues[1];

        try {
            const body = { id: id, name: newName };
            // If user explicitly cleared the field or clicked remove, we send it to update DB
            body.private_key = newPass;

            await fetch('api/categories.php', {
                method: 'PUT',
                body: JSON.stringify(body)
            });
            loadCategories();
            toast('Folder updated', 'success');
        } catch (err) { toast('Error updating folder', 'error'); }
    }
}

window.deleteCategory = async function (id, name) {
    const confirm = await Swal.fire({
        title: 'Delete Folder?',
        text: `Delete "${name}"? Images inside will become Uncategorized.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
        try {
            await fetch('api/categories.php', {
                method: 'DELETE',
                body: JSON.stringify({ id: id })
            });

            // If viewing this folder, bounce to 'All Images'
            if (state.activeFilter == id) setActiveFilter('all', 'All Images');

            loadCategories();
            loadImages(); // Required to update the labels on images
            toast('Folder deleted', 'success');
        } catch (err) { toast('Error deleting', 'error'); }
    }
}

async function updateImageCategory(imgId, catId) {
    try {
        await fetch('api/images.php', {
            method: 'POST',
            body: JSON.stringify({ id: imgId, category_id: catId })
        });

        // Optimistic refresh
        loadImages();
        toast('Moved image successfully', 'success');
    } catch (err) {
        toast('Action failed', 'error');
    }
}

window.deleteImage = async function (id) {
    // Confirm delete
    const result = await Swal.fire({
        title: "Delete permanently?",
        text: "This removes the record and deletes the file from disk.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444"
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch('api/delete_image.php', {
                method: 'DELETE',
                body: JSON.stringify({ id: id })
            });
            const data = await res.json();
            if (data.success) {
                state.selectedImageIds.delete(id);
                loadImages(); // Refresh array and remove from DOM globally
                toast('Image deleted', 'success');
            }
        } catch (err) { toast('Error deleting file', 'error'); }
    }
}

async function processDeleteQueue(idsArray) {
    if (idsArray.length === 0) return;

    const result = await Swal.fire({
        title: `Delete ${idsArray.length} images?`,
        text: "This permanently removes these records and files from disk.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444"
    });

    if (!result.isConfirmed) return;

    state.isAnalyzing = true; // Use this lock to disable buttons
    updateBatchButtons();

    if (elements.deleteSelectedBtn) {
        elements.deleteSelectedBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Deleting...';
    }

    let successes = 0;

    for (const id of idsArray) {
        try {
            const res = await fetch('api/delete_image.php', {
                method: 'DELETE',
                body: JSON.stringify({ id: id })
            });
            const data = await res.json();
            if (data.success) {
                successes++;
                state.selectedImageIds.delete(id);
            }
        } catch (err) {
            console.error(`Failed to delete ID ${id}`, err);
        }
    }

    state.isAnalyzing = false;
    updateBatchButtons();

    // Soft reload to sync state data silently
    loadImages();

    Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'success',
        title: `Deleted ${successes} out of ${idsArray.length} images.`,
        showConfirmButton: false,
        timer: 3000
    });
}

// --- Ollama AI Processor ---

async function processAnalysisQueue(idsArray) {
    if (idsArray.length === 0) return;
    state.isAnalyzing = true;
    updateBatchButtons();

    elements.analyzeViewBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Processing...';

    // Ask for prompt
    const { value: customPrompt, isDismissed } = await Swal.fire({
        title: 'Custom Instruction',
        input: 'text',
        //1st version
        //inputValue: 'Describe this image in detail for FLUX.1D limiting to max Flux.1D input token as we want to reproduce it using FLUX.1D. Start answering straight away, no intro like "This image shows...", no bullet points, no lists, just a simple paragraph answer.',
        //2nd version
        //inputValue: 'Provide a highly precise visual description optimized for **FLUX.1D** prompt reconstruction. Focus only on elements that influence image synthesis: subject identity and facial structure, pose, body proportions, clothing and materials, hairstyle, makeup, lighting setup, color palette, environment, camera angle, lens perspective, depth of field, composition, textures, reflections, shadows, background elements, and overall artistic style. Preserve exact spatial relationships and visual hierarchy. Avoid speculation, storytelling, or interpretation—describe only observable visual information. Use dense, descriptive language suitable for generative prompts while remaining within typical FLUX token limits. Write a single compact paragraph with no introduction, no bullet points, and no lists. Include key photographic details such as focal length impression (portrait, wide, macro), lighting direction and intensity, contrast level, mood, and rendering style (photorealistic, cinematic, studio lighting, HDR, etc.). Emphasize distinctive facial features, skin texture, material finishes, and color accents that are critical for reproducing the image faithfully. The output must be a single continuous paragraph beginning immediately with the visual description.',
        //micro visual details
        //inputValue: 'Analyze the provided image and reconstruct it as a high-precision FLUX generation prompt by extracting the exact visual structure of the scene. Begin with the primary subject identity and physical characteristics, including facial geometry, bone structure, symmetry, eye shape, nose shape, lips, jawline, skin tone, skin texture, and visible micro details. Continue with body proportions, pose, posture, gesture, and framing within the composition. Describe clothing, fabrics, and material properties, including texture, reflectivity, translucency, gloss, metallic surfaces, or fabric behavior. Specify hairstyle, hair texture, color gradients, and makeup details if present. Carefully analyze lighting physics, including key light direction, fill light intensity, rim lighting, reflections, shadow softness, contrast ratio, and how light interacts with skin and materials. Identify the dominant color palette and secondary accents present in the scene. Describe the environment and background elements, including depth layers, atmosphere, reflections, and spatial separation from the subject. Include camera and photographic characteristics such as camera angle, framing, lens impression (portrait, wide, macro), depth of field, focus plane, perspective distortion, and bokeh behavior. Capture surface textures, reflections, shadows, and highlights that influence visual realism. Maintain accurate spatial relationships and visual hierarchy across all elements. Avoid interpretation, storytelling, or speculation—describe only observable visual information. Output the result as one dense paragraph formatted like a FLUX-ready prompt, optimized for photorealistic reconstruction with cinematic lighting, high contrast, HDR detail, and ultra-detailed textures. Prioritize subject geometry, lighting direction, and material behavior over descriptive wording to maximize reconstruction accuracy.',
        //inputValue: '',
        //image analysis prompt built using the FLUX template structure
        //inputValue: 'Analyze the provided image and reconstruct it as a FLUX-ready visual prompt using the following structured order: subject identity, distinct facial structure, pose and framing, clothing materials and textures, hairstyle and makeup details, lighting style and direction, dominant color palette, environment/background, cinematic composition, camera angle, depth of field, and lens feel. Describe visible elements using dense generative-prompt language while preserving accurate spatial relationships, proportions, reflections, shadows, textures, and material finishes. Emphasize distinctive facial features, skin texture, lighting contrast, and surface reflections that influence image synthesis. Maintain a photorealistic cinematic rendering style with high contrast and HDR detail. Avoid storytelling, assumptions, or interpretation. Output one compact paragraph formatted as a FLUX-ready prompt, beginning immediately with the subject description and following the structure: [subject identity], [distinct facial structure], [pose and framing], wearing [clothing materials and textures], [hairstyle and makeup details], dramatic [lighting style and direction], color palette of [dominant colors], set in [environment/background], cinematic composition, [camera angle], shallow depth of field, [lens feel], ultra-detailed textures, realistic skin, reflections and shadows preserved, photorealistic cinematic rendering, high contrast, HDR detail.',
        //Cinematic Photography Prompt Version
        //inputValue: 'Provide a cinematic visual description optimized for FLUX.1D, focusing on subject identity, facial structure, pose, body proportions, wardrobe materials, hairstyle, makeup, lighting design, color grading, environment, and composition. Include photographic details such as lens feel (portrait, wide, macro), camera angle, depth of field, lighting direction, contrast, reflections, and shadows. Emphasize textures, skin realism, material finishes, and spatial relationships. Write one compact paragraph using dense generative-prompt language with a photorealistic, cinematic studio aesthetic, avoiding storytelling or interpretation.',
        //Ultra-Short Viral Prompt (Instagram Style)
        inputValue: 'Describe the image with FLUX-optimized visual precision focusing only on synthesis-critical details: facial structure, pose, clothing materials, lighting, color palette, environment, camera angle, depth of field, composition, textures, reflections, and shadows. Avoid storytelling or interpretation. Write one dense aesthetic paragraph using generative-prompt language that preserves spatial relationships and visual hierarchy, emphasizing distinctive facial features, skin texture, material finishes, and key color accents for accurate reconstruction.',
        text: 'What should the AI look for?',
        showCancelButton: true
    });

    if (isDismissed) {
        state.isAnalyzing = false;
        elements.analyzeViewBtn.innerHTML = '<i class="fas fa-magic me-1"></i> Analyze View';
        updateBatchButtons();
        return;
    }

    let successes = 0;

    for (const id of idsArray) {
        // Try to find card for UI updates (spinner, badge)
        let card = document.querySelector(`.image-card[data-id="${id}"]`);

        let loader = card ? card.querySelector('.ai-loading-overlay') : null;
        if (loader) {
            loader.classList.remove('d-none');
            loader.classList.add('d-flex');
        }

        try {
            const res = await fetch('api/analyze.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    prompt: customPrompt,
                    model: state.ollamaModel,
                    temperature: state.ollamaTemp,
                    num_predict: state.ollamaPredict,
                    num_ctx: state.ollamaContext
                })
            });
            const data = await res.json();

            // Check if card is STILL/NOW in DOM (user might have switched back)
            card = document.querySelector(`.image-card[data-id="${id}"]`);
            if (card) {
                loader = card.querySelector('.ai-loading-overlay');
                if (loader) {
                    loader.classList.remove('d-flex');
                    loader.classList.add('d-none');
                }
            }

            if (data.success) {
                successes++;

                // CRITICAL: Update global state immediately. 
                // This ensures if the user switches back to this view later, the data is ready.
                const img = state.images.find(i => i.id == id);
                if (img) img.analysis_result = data.analysis_result;

                // Sync UI only if card exists in current DOM
                if (card) {
                    card.dataset.analyzed = "true";
                    const badge = card.querySelector('.badge-ai-status');
                    const snippet = card.querySelector('.ai-snippet');

                    if (badge) {
                        badge.className = 'badge ai-badge text-success border-success bg-success bg-opacity-10 badge-ai-status';
                        badge.innerHTML = '<i class="fas fa-check me-1"></i>Analyzed';
                    }
                    if (snippet) {
                        snippet.innerHTML = escapeHTML(data.analysis_result);
                        snippet.title = "Click to copy text";
                        snippet.onclick = (e) => {
                            e.stopPropagation();
                            copyToClipboard(data.analysis_result);
                        };
                    }
                }
            } else {
                console.warn(`Analysis failed for ID ${id}:`, data.error || 'Unknown error');
            }
        } catch (err) {
            console.error(`AI Network/System Error on ID ${id}:`, err);
            // Cleanup UI if card is visible
            card = document.querySelector(`.image-card[data-id="${id}"]`);
            if (card) {
                loader = card.querySelector('.ai-loading-overlay');
                if (loader) {
                    loader.classList.remove('d-flex');
                    loader.classList.add('d-none');
                }
            }
        }
    }

    state.isAnalyzing = false;
    // Reset buttons
    elements.analyzeViewBtn.innerHTML = '<i class="fas fa-magic me-1"></i> Analyze View';
    if (elements.analyzeSelectedBtn) elements.analyzeSelectedBtn.innerHTML = '<i class="fas fa-bolt me-1"></i> Analyze Selected';
    if (elements.reanalyzeSelectedBtn) elements.reanalyzeSelectedBtn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Reanalyze Selected';

    updateBatchButtons();

    // Clear selections
    state.selectedImageIds.clear();

    // Final background sync
    await loadImages();

    Swal.fire({
        icon: 'success',
        title: 'Batch completed',
        text: `Processed ${successes} out of ${idsArray.length} images. Results are stored in the background.`,
        timer: 3000
    });
}


// --- Utility Formats ---
function toast(msg, iconType) {
    Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: iconType,
        title: msg,
        showConfirmButton: false,
        timer: 3000
    });
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
}

function escapeJsString(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

async function processClearQueue(idsArray) {
    if (idsArray.length === 0) return;

    const result = await Swal.fire({
        title: `Clear analysis for ${idsArray.length} images?`,
        text: "This will reset them to 'Unanalyzed' status and remove previous AI text.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#6c757d"
    });

    if (!result.isConfirmed) return;

    state.isAnalyzing = true;
    updateBatchButtons();

    try {
        const res = await fetch('api/clear_analysis.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: idsArray })
        });
        const data = await res.json();

        if (data.success) {
            // Update local state for immediate visual sync
            idsArray.forEach(id => {
                const img = state.images.find(i => i.id == id);
                if (img) {
                    img.analysis_result = null;
                    img.prompt = null;
                }
            });

            // Clear selections
            state.selectedImageIds.clear();

            // Background sync
            await loadImages();

            toast(`Cleared analysis for ${data.cleared_count} images`, 'success');
        } else {
            toast('Failed to clear analysis', 'error');
        }
    } catch (err) {
        console.error("Clear Error:", err);
        toast('Connection error', 'error');
    } finally {
        state.isAnalyzing = false;
        updateBatchButtons();
    }
}

window.copyToClipboard = function (text) {
    navigator.clipboard.writeText(text).then(() => {
        toast('Copied to clipboard', 'success');
    }).catch(err => {
        toast('Failed to copy', 'error');
    });
};

// --- Settings Logic ---
async function openSettings() {
    const tempInput = document.getElementById('ollamaTemp');
    const tempDisplay = document.getElementById('tempValueDisplay');
    const predictInput = document.getElementById('ollamaPredict');
    const contextInput = document.getElementById('ollamaContext');
    const refreshBtn = document.getElementById('refreshModelsBtn');

    tempInput.value = state.ollamaTemp;
    tempDisplay.innerText = state.ollamaTemp;
    predictInput.value = state.ollamaPredict;
    contextInput.value = state.ollamaContext;

    tempInput.oninput = () => tempDisplay.innerText = tempInput.value;

    if (refreshBtn) {
        refreshBtn.onclick = fetchModels;
    }

    // Force show the modal using Bootstrap 5 native JS
    const modalEl = document.getElementById('settingsModal');
    let settingsModal = bootstrap.Modal.getInstance(modalEl);
    if (!settingsModal) {
        settingsModal = new bootstrap.Modal(modalEl, {
            keyboard: true
        });
    }
    settingsModal.show();

    // THEN attempt to fetch models in background without blocking
    fetchModels();
}

async function fetchModels() {
    const modelSelect = document.getElementById('ollamaModelSelect');
    try {
        const res = await fetch('http://127.0.0.1:11434/api/tags');
        const data = await res.json();

        let foundCurrent = false;
        modelSelect.innerHTML = '';
        if (data.models && data.models.length > 0) {
            data.models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.name;
                opt.innerText = m.name;
                if (m.name === state.ollamaModel) {
                    opt.selected = true;
                    foundCurrent = true;
                }
                modelSelect.appendChild(opt);
            });
        }

        if (!foundCurrent) {
            const opt = document.createElement('option');
            opt.value = state.ollamaModel;
            opt.innerText = state.ollamaModel + ' (Current)';
            opt.selected = true;
            modelSelect.appendChild(opt);
        }
    } catch (err) {
        console.error(err);
        toast('Could not fetch models. Is Ollama running?', 'warning');
    }
}

function saveSettings() {
    const tempInput = document.getElementById('ollamaTemp');
    const modelSelect = document.getElementById('ollamaModelSelect');
    const predictInput = document.getElementById('ollamaPredict');
    const contextInput = document.getElementById('ollamaContext');

    state.ollamaModel = modelSelect.value;
    state.ollamaTemp = tempInput.value;
    state.ollamaPredict = predictInput.value;
    state.ollamaContext = contextInput.value;

    localStorage.setItem('ollamaModel', state.ollamaModel);
    localStorage.setItem('ollamaTemp', state.ollamaTemp);
    localStorage.setItem('ollamaPredict', state.ollamaPredict);
    localStorage.setItem('ollamaContext', state.ollamaContext);

    toast('Settings saved', 'success');
    const modalEl = document.getElementById('settingsModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
}

// End of settings logic
