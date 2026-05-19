let worker = null;
let requestId = 0;
const pending = new Map();

function send(msg, transfer) {
    return new Promise((resolve, reject) => {
        const id = ++requestId;
        msg._id = id;
        pending.set(id, { resolve, reject });
        worker.postMessage(msg, transfer);
    });
}

export async function initWasm() {
    if (worker) {
        worker.terminate();
        pending.clear();
    }

    worker = new Worker('js/worker.js');

    worker.onmessage = (e) => {
        const msg = e.data;
        const cb = pending.get(msg._id);
        if (!cb) return;
        pending.delete(msg._id);

        if (msg.type === 'error') {
            const err = new Error(msg.message || 'Unknown error');
            err.stderr = msg.stderr || '';
            cb.reject(err);
        } else {
            cb.resolve(msg);
        }
    };

    worker.onerror = (e) => {
        console.error('Worker error:', e);
    };

    const res = await send({ type: 'init' });
    if (!res.success) {
        throw new Error(res.error || 'WASM initialization failed');
    }
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
    const res = await send({ type: 'listModels' });
    return parseModelsListing(res.text);
}

export async function processImage(fileName, fileBuffer, model, factor) {
    const res = await send({
        type: 'process',
        fileName,
        fileBuffer,
        model,
        factor
    });

    return { buffer: new Uint8Array(res.buffer), format: 'image/png' };
}
