import { initWasm, fetchModels, processImage } from './wasm.js';

const $ = (id) => document.getElementById(id);

const el = {
    uploadArea: $('uploadArea'),
    fileInput: $('fileInput'),
    inputImageContainer: $('inputImageContainer'),
    inputPlaceholder: $('inputPlaceholder'),
    inputImage: $('inputImage'),
    inputImageInfo: $('inputImageInfo'),
    inputImageDimensionsInfo: $('inputImageDimensionsInfo'),
    inputActions: $('inputActions'),
    clearBtn: $('clearBtn'),
    outputImageContainer: $('outputImageContainer'),
    outputPlaceholder: $('outputPlaceholder'),
    outputImage: $('outputImage'),
    outputImageInfo: $('outputImageInfo'),
    outputImageDimensionsInfo: $('outputImageDimensionsInfo'),
    outputActions: $('outputActions'),
    processBtn: $('processBtn'),
    downloadBtn: $('downloadBtn'),
    downloadFormat: $('downloadFormat'),
    factorSlider: $('factor'),
    factorValue: $('factorValue'),
    modelSelect: $('model'),
    toast: $('toast'),
    toastMessage: $('toastMessage'),
    toastIcon: $('toastIcon'),
    themeToggle: $('themeToggle'),
    themeIcon: $('themeIcon'),
    compareBtn: $('compareBtn'),
    comparisonModal: $('comparisonModal'),
    closeComparison: $('closeComparison'),
    comparisonOriginal: $('comparisonOriginal'),
    comparisonResult: $('comparisonResult'),
    slider: $('slider'),
    imageWrapper: $('imageWrapper'),
    viewOriginalBtn: $('viewOriginalBtn'),
    viewResultBtn: $('viewResultBtn'),
    viewerModal: $('imageViewer'),
    viewerImage: $('viewerImage'),
    clickGuard: $('clickGuard'),
};

const state = {
    selectedFile: null,
    originalImageDataURL: null,
    originalImageDataBuffer: null,
    resultImageDataURL: null,
    resultImageDataBuffer: null,
    isProcessing: false,
    wasmReady: false,
};

function showToast(message, type = 'success', persist = false) {
    el.toastMessage.textContent = message;
    el.toast.className = 'toast toast-' + type;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        loading: 'fa-circle-notch fa-spin',
    };
    el.toastIcon.className = 'fas ' + (icons[type] || icons.success);

    el.toast.classList.add('show');

    if (!persist) {
        setTimeout(() => el.toast.classList.remove('show'), 3000);
    }
}

function hideToast() {
    el.toast.classList.remove('show');
}

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        el.themeIcon.classList.remove('fa-moon');
        el.themeIcon.classList.add('fa-sun');
    } else {
        el.themeIcon.classList.remove('fa-sun');
        el.themeIcon.classList.add('fa-moon');
    }
}

function populateModelSelect(models) {
    el.modelSelect.innerHTML = '';
    models.forEach(model => {
        const option = new Option(model.name, model.name);
        const parts = [];
        if (model.parameter_count) parts.push('parameter count: ' + model.parameter_count);
        if (model.version) parts.push('version: ' + model.version);
        if (model.author) parts.push('author: ' + model.author);
        if (model.homepage) parts.push('homepage: ' + model.homepage);
        if (model.description) parts.push('description: ' + model.description);
        option.title = parts.join('\n');
        el.modelSelect.appendChild(option);
    });
}

// Theme
function initTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('theme') || (prefersDark.matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    prefersDark.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const theme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeIcon(theme);
        }
    });

    el.themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
    });
}

// Upload
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function getInputBuffer(file) {
    if (file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/bmp') {
        return await readFileAsArrayBuffer(file);
    }

    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    return await readFileAsArrayBuffer(blob);
}

async function handleFile(file) {
    const allowed = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp'];
    if (!allowed.includes(file.type)) {
        showToast('Only JPEG, PNG, BMP, and WebP images are supported', 'warning');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        showToast('File is too large (max 50MB)', 'warning');
        return;
    }

    state.selectedFile = file;
    state.originalImageDataURL = await readFileAsDataURL(file);
    state.originalImageDataBuffer = await getInputBuffer(file);

    el.inputImage.onload = () => {
        el.inputImageDimensionsInfo.textContent =
            el.inputImage.naturalWidth + ' × ' + el.inputImage.naturalHeight;
        el.inputImageInfo.classList.remove('hidden');
        el.inputImage.classList.remove('hidden');
        el.inputPlaceholder.classList.add('hidden');
        el.inputImageContainer.classList.add('has-image');
    };
    el.inputImage.src = state.originalImageDataURL;

    el.uploadArea.classList.add('has-image');
    el.inputActions.style.display = 'flex';
    el.processBtn.disabled = false;

    showToast('Image uploaded successfully', 'success');
}

function clearInput() {
    state.selectedFile = null;
    state.originalImageDataURL = null;
    state.originalImageDataBuffer = null;
    el.fileInput.value = '';
    el.inputImage.src = '';
    el.inputImage.classList.add('hidden');
    el.inputPlaceholder.classList.remove('hidden');
    el.inputImageContainer.classList.remove('has-image');
    el.inputImageInfo.classList.add('hidden');
    el.uploadArea.classList.remove('has-image');
    el.inputActions.style.display = 'none';
    el.processBtn.disabled = true;
}

function clearOutput() {
    state.resultImageDataURL = null;
    state.resultImageDataBuffer = null;
    el.outputImage.src = '';
    el.outputImage.classList.add('hidden');
    el.outputPlaceholder.classList.remove('hidden');
    el.outputImageContainer.classList.remove('has-image');
    el.outputImageInfo.classList.add('hidden');
    el.outputActions.style.display = 'none';
}

function initUpload() {
    el.uploadArea.addEventListener('click', () => el.fileInput.click());

    el.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    el.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.uploadArea.classList.add('dragover');
    });

    el.uploadArea.addEventListener('dragleave', () => {
        el.uploadArea.classList.remove('dragover');
    });

    el.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        el.uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        } else {
            showToast('Please upload a valid image', 'warning');
        }
    });

    el.clearBtn.addEventListener('click', () => {
        clearInput();
        clearOutput();
        showToast('Image cleared', 'success');
    });

    el.factorSlider.addEventListener('input', () => {
        el.factorValue.textContent = el.factorSlider.value;
    });
}

// Processing
async function handleProcess() {
    if (!state.selectedFile || state.isProcessing) return;

    state.isProcessing = true;
    el.processBtn.disabled = true;
    el.processBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';

    const model = el.modelSelect.value;
    const factor = el.factorSlider.value;

    // Save settings
    localStorage.setItem('lastModel', model);
    localStorage.setItem('lastFactor', factor);

    try {
        const result = await processImage(
            state.selectedFile.name,
            state.originalImageDataBuffer,
            model,
            factor
        );

        state.resultImageDataBuffer = result.buffer;
        state.resultImageDataURL = URL.createObjectURL(
            new Blob([result.buffer.buffer], { type: 'image/png' })
        );

        el.outputImage.onload = () => {
            el.outputImageDimensionsInfo.textContent =
                Math.round(el.outputImage.naturalWidth) + ' × ' +
                Math.round(el.outputImage.naturalHeight);
            el.outputImageInfo.classList.remove('hidden');
            el.outputImage.classList.remove('hidden');
            el.outputPlaceholder.classList.add('hidden');
            el.outputImageContainer.classList.add('has-image');
        };
        el.outputImage.src = state.resultImageDataURL;

        el.outputActions.style.display = 'flex';
        showToast('Upscaling completed!', 'success');
    } catch (err) {
        showToast('Processing failed: ' + (err.stderr || err.message), 'error');
        console.error('processImage:', err);
    } finally {
        state.isProcessing = false;
        el.processBtn.disabled = false;
        el.processBtn.innerHTML = '<i class="fas fa-play"></i> Process';
    }
}

function initProcessing() {
    el.processBtn.addEventListener('click', handleProcess);
}

// Download
function toBlobPromise(canvas, format, quality) {
    return new Promise(resolve => canvas.toBlob(resolve, format, quality));
}

async function downloadResult() {
    if (!state.resultImageDataBuffer) return;

    const format = el.downloadFormat.value;
    const originalName = state.selectedFile
        ? state.selectedFile.name.replace(/\.[^/.]+$/, '')
        : 'upscaled';
    const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const ext = extMap[format] || 'png';
    const fileName = originalName + '_upscaled.' + ext;

    if (format === 'image/png') {
        const blob = new Blob([state.resultImageDataBuffer.buffer], { type: 'image/png' });
        triggerDownload(blob, fileName);
        return;
    }

    try {
        const blob = new Blob([state.resultImageDataBuffer.buffer], { type: 'image/png' });
        const img = await createImageBitmap(blob);

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        img.close();

        const quality = format === 'image/jpeg' ? 0.92 : 0.90;
        const convertedBlob = await toBlobPromise(canvas, format, quality);

        if (convertedBlob) {
            triggerDownload(convertedBlob, fileName);
        } else {
            triggerDownload(blob, originalName + '_upscaled.png');
        }
    } catch (_) {
        const blob = new Blob([state.resultImageDataBuffer.buffer], { type: 'image/png' });
        triggerDownload(blob, originalName + '_upscaled.png');
    }
}

function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function initDownload() {
    el.downloadBtn.addEventListener('click', downloadResult);
}

// Comparison modal
let isDragging = false;

function openComparisonModal() {
    if (!state.originalImageDataURL || !state.resultImageDataURL) {
        showToast('Please upscale an image first', 'warning');
        return;
    }

    el.comparisonModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    el.comparisonResult.onload = () => {
        const resultWidth = el.comparisonResult.naturalWidth;
        const resultHeight = el.comparisonResult.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = resultWidth;
        canvas.height = resultHeight;
        const ctx = canvas.getContext('2d');

        const originalImg = new Image();
        originalImg.onload = function () {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(originalImg, 0, 0, resultWidth, resultHeight);
            el.comparisonOriginal.src = canvas.toDataURL('image/png');
            updateSliderPosition(50);
        };
        originalImg.src = state.originalImageDataURL;
    };
    el.comparisonResult.src = state.resultImageDataURL;
}

function closeComparisonModal() {
    el.comparisonModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function updateSliderPosition(percentage) {
    const clamped = Math.max(0, Math.min(100, percentage));
    el.slider.style.left = clamped + '%';
    el.comparisonOriginal.style.clipPath =
        'polygon(0 0, ' + clamped + '% 0, ' + clamped + '% 100%, 0 100%)';
    el.comparisonResult.style.clipPath =
        'polygon(' + clamped + '% 0, 100% 0, 100% 100%, ' + clamped + '% 100%)';
}

function onDrag(e) {
    if (!isDragging) return;
    const rect = el.imageWrapper.getBoundingClientRect();
    let xPos;
    if (e.type.includes('touch')) {
        xPos = e.touches[0].clientX - rect.left;
    } else {
        xPos = e.clientX - rect.left;
    }
    updateSliderPosition((xPos / rect.width) * 100);
}

function startDrag(e) {
    e.preventDefault();
    isDragging = true;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('touchmove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
    el.slider.style.background = 'white';
    el.slider.style.width = '6px';
}

function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
    el.slider.style.background = 'rgba(255, 255, 255, 0.8)';
    el.slider.style.width = '4px';
}

function openImageViewer(url) {
    el.viewerImage.src = url;
    el.viewerModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeImageViewer() {
    el.viewerModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    el.viewerImage.src = '';
}

function initComparison() {
    el.slider.addEventListener('mousedown', startDrag);
    el.slider.addEventListener('touchstart', startDrag);
    el.compareBtn.addEventListener('click', openComparisonModal);
    el.closeComparison.addEventListener('click', closeComparisonModal);
    el.comparisonModal.addEventListener('click', (e) => {
        if (e.target === el.comparisonModal) closeComparisonModal();
    });

    el.viewOriginalBtn.addEventListener('click', () => {
        if (!state.originalImageDataURL) return;
        openImageViewer(state.originalImageDataURL);
    });

    el.viewResultBtn.addEventListener('click', () => {
        if (!state.resultImageDataURL) return;
        openImageViewer(state.resultImageDataURL);
    });

    el.viewerModal.addEventListener('click', (e) => {
        if (e.target === el.viewerModal) closeImageViewer();
    });

    document.addEventListener('selectstart', (e) => {
        if (isDragging) e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (el.viewerModal.classList.contains('active')) {
                closeImageViewer();
            } else if (el.comparisonModal.classList.contains('active')) {
                closeComparisonModal();
            }
        }
    });
}

// Keyboard shortcuts
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                el.fileInput.click();
            }
        }

        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !el.processBtn.disabled) {
            handleProcess();
        }
    });
}

// Init
function restoreSettings() {
    const lastModel = localStorage.getItem('lastModel');
    const lastFactor = localStorage.getItem('lastFactor');
    if (lastModel) el.modelSelect.value = lastModel;
    if (lastFactor) {
        el.factorSlider.value = lastFactor;
        el.factorValue.textContent = lastFactor;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initUpload();
    initProcessing();
    initDownload();
    initComparison();
    initKeyboardShortcuts();

    showToast('Loading WebAssembly module...', 'loading', true);

    el.clickGuard.addEventListener('click', (e) => {
        const hint = document.createElement('div');
        hint.className = 'click-feedback';
        hint.textContent = 'Loading...';
        hint.style.left = e.clientX + 'px';
        hint.style.top = e.clientY + 'px';
        document.body.appendChild(hint);
        setTimeout(() => hint.remove(), 1000);
    });

    try {
        await initWasm();
        state.wasmReady = true;
        el.clickGuard.classList.add('hidden');
        hideToast();
        const models = await fetchModels();
        populateModelSelect(models);
        restoreSettings();
        showToast('WebAssembly module loaded successfully', 'success');
    } catch (err) {
        showToast('WebAssembly module loading failed: ' + err.message, 'error', true);
        console.error('initWasm:', err);
    }
});
