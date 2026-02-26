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
    // Apply starting width to the AdminLTE root variable natively
    document.documentElement.style.setProperty('--lte-sidebar-width', state.sidebarWidth + 'px');
    document.body.style.setProperty('--lte-sidebar-width', state.sidebarWidth + 'px');

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
        document.documentElement.style.setProperty('--lte-sidebar-width', newWidth + 'px');
        document.body.style.setProperty('--lte-sidebar-width', newWidth + 'px');
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
            elements.resizer.classList.remove('resizing');
            // Save the new width
            state.sidebarWidth = getComputedStyle(document.documentElement).getPropertyValue('--lte-sidebar-width').replace('px', '').trim();
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
        document.documentElement.style.setProperty('--lte-sidebar-width', newWidth + 'px');
        document.body.style.setProperty('--lte-sidebar-width', newWidth + 'px');
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (isResizing) {
            isResizing = false;
            elements.resizer.classList.remove('resizing');
            state.sidebarWidth = getComputedStyle(document.documentElement).getPropertyValue('--lte-sidebar-width').replace('px', '').trim();
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
        a.innerHTML = `<i class="nav-icon fas fa-folder me-2"></i> <p class="text-truncate flex-grow-1 mb-0">${escapeHTML(cat.name)}</p>`;

        // Category filters
        a.addEventListener('click', (e) => {
            e.preventDefault();
            setActiveFilter(cat.id, cat.name);
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
    if (elements.deleteSelectedBtn) {
        elements.deleteSelectedBtn.disabled = state.selectedImageIds.size === 0 || state.isAnalyzing;
        elements.deleteSelectedBtn.innerHTML = `<i class="fas fa-trash me-1"></i> Delete Selected (${state.selectedImageIds.size})`;
    }
    elements.analyzeViewBtn.disabled = state.isAnalyzing;
}

// --- API Transmitting Functions ---

async function addCategoryDialog() {
    const { value: catName } = await Swal.fire({
        title: 'New Folder',
        input: 'text',
        inputPlaceholder: 'e.g. Landscapes, Receipts',
        showCancelButton: true
    });

    if (catName) {
        try {
            const res = await fetch('api/categories.php', {
                method: 'POST',
                body: JSON.stringify({ name: catName })
            });
            const data = await res.json();
            if (data.error) toast(data.error, 'error');
            else loadCategories(); // Refresh
        } catch (err) { toast('Error creating category', 'error'); }
    }
}

window.editCategory = async function (id, currentName) {
    const { value: newName } = await Swal.fire({
        title: 'Edit Folder Name',
        input: 'text',
        inputValue: currentName,
        showCancelButton: true
    });

    if (newName && newName !== currentName) {
        try {
            await fetch('api/categories.php', {
                method: 'PUT',
                body: JSON.stringify({ id: id, name: newName })
            });
            loadCategories();
            toast('Folder renamed', 'success');
        } catch (err) { toast('Error renaming folder', 'error'); }
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
        inputValue: 'Describe this image in detail for FLUX.1D limiting to max Flux.1D input token as we want to reproduce it using FLUX.1D. Start answering straight away, no intro like "This image shows...", no bullet points, no lists, just a simple paragraph answer.',
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
        const card = document.querySelector(`.image-card[data-id="${id}"]`);
        if (!card) continue;

        const loader = card.querySelector('.ai-loading-overlay');
        const badge = card.querySelector('.badge-ai-status');
        const snippet = card.querySelector('.ai-snippet');

        if (loader) loader.classList.remove('d-none', 'd-flex');
        if (loader) loader.classList.add('d-flex'); // show flex

        try {
            const res = await fetch('api/analyze.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    prompt: customPrompt,
                    model: state.ollamaModel,
                    temperature: state.ollamaTemp,
                    num_predict: state.ollamaPredict
                })
            });
            const data = await res.json();

            if (loader) {
                loader.classList.remove('d-flex');
                loader.classList.add('d-none');
            }

            if (data.success) {
                successes++;
                card.dataset.analyzed = "true";
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
            } else {
                toast(`Failed AI on ID ${id}`, 'error');
            }
        } catch (err) {
            console.error("AI Error:", err);
            if (loader) {
                loader.classList.remove('d-flex');
                loader.classList.add('d-none');
            }
            toast(`Timeout or error on ${id}`, 'error');
        }
    }

    state.isAnalyzing = false;
    elements.analyzeViewBtn.innerHTML = '<i class="fas fa-magic me-1"></i> Analyze View';
    updateBatchButtons();

    // Clear selections so checkboxes untick naturally
    state.selectedImageIds.clear();

    // Soft reload to sync state data silently
    loadImages();

    Swal.fire({
        icon: 'success',
        title: 'Batch completed',
        text: `Processed ${successes} out of ${idsArray.length} images.`,
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
    const refreshBtn = document.getElementById('refreshModelsBtn');

    tempInput.value = state.ollamaTemp;
    tempDisplay.innerText = state.ollamaTemp;
    predictInput.value = state.ollamaPredict;

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

    state.ollamaModel = modelSelect.value;
    state.ollamaTemp = tempInput.value;
    state.ollamaPredict = predictInput.value;

    localStorage.setItem('ollamaModel', state.ollamaModel);
    localStorage.setItem('ollamaTemp', state.ollamaTemp);
    localStorage.setItem('ollamaPredict', state.ollamaPredict);

    toast('Settings saved', 'success');
    const modalEl = document.getElementById('settingsModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
}

// End of settings logic
