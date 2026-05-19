let wasmModule = null;
let stdoutBuffer = '';
let stderrBuffer = '';

export function isInitialized() {
    return wasmModule !== null;
}

export async function initWasm() {
    stdoutBuffer = '';
    stderrBuffer = '';

    wasmModule = await Module({
        print: function (text) {
            stdoutBuffer += text + '\n';
        },
        printErr: function (text) {
            stderrBuffer += text + '\n';
        }
    });

    return wasmModule;
}

export function parseModelsListing(text) {
    const lines = text.split(/\r?\n/);
    const models = [];
    let currentModel = null;
    let inModel = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '') continue;

        const modelMatch = line.match(/^  ([a-zA-Z0-9_\-]+):\s*$/);
        if (modelMatch) {
            if (currentModel !== null) {
                models.push(currentModel);
            }
            currentModel = { name: modelMatch[1] };
            inModel = true;
            continue;
        }

        if (!inModel || currentModel === null) continue;

        const fieldMatch = line.match(/^\s{2,}([^:]+):\s+(.*)$/);
        if (fieldMatch) {
            let key = fieldMatch[1].trim();
            let value = fieldMatch[2].trim();
            key = key.replace(/ /g, '_');
            currentModel[key] = value;
        }
    }

    if (currentModel !== null) {
        models.push(currentModel);
    }

    return models;
}

export async function fetchModels() {
    if (!wasmModule) {
        throw new Error('WASM module not initialized');
    }

    stdoutBuffer = '';
    wasmModule.callMain(['--lm']);
    return parseModelsListing(stdoutBuffer);
}

export async function processImage(fileName, fileBuffer, model, factor) {
    if (!wasmModule) {
        throw new Error('WASM module not initialized');
    }

    const outputName = 'upscaled.png';

    stdoutBuffer = '';
    stderrBuffer = '';

    try {
        wasmModule.FS.writeFile(fileName, new Uint8Array(fileBuffer));
        wasmModule.callMain(['-i', fileName, '-o', outputName, '-m', model, '-f', String(factor)]);

        const resultBuffer = wasmModule.FS.readFile(outputName);

        return { buffer: resultBuffer, format: 'image/png' };
    } finally {
        try { wasmModule.FS.unlink(fileName); } catch (_) { /* ignore */ }
        try { wasmModule.FS.unlink(outputName); } catch (_) { /* ignore */ }
    }
}

export function getLastStderr() {
    return stderrBuffer;
}
