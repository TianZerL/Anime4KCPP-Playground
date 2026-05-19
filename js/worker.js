importScripts('../ac_cli.js');

let wasmModule = null;
let stdoutBuffer = '';
let stderrBuffer = '';

async function handleInit() {
    wasmModule = await Module({
        locateFile: function (path) {
            return '../' + path;
        },
        print: function (text) {
            stdoutBuffer += text + '\n';
        },
        printErr: function (text) {
            stderrBuffer += text + '\n';
        }
    });
    return { success: true };
}

function handleListModels() {
    stdoutBuffer = '';
    wasmModule.callMain(['--lm']);
    return { text: stdoutBuffer };
}

function handleProcess(fileName, fileBuffer, model, factor) {
    const outputName = 'upscaled.png';

    stdoutBuffer = '';
    stderrBuffer = '';

    try {
        wasmModule.FS.writeFile(fileName, new Uint8Array(fileBuffer));
        wasmModule.callMain(['-i', fileName, '-o', outputName, '-m', model, '-f', factor]);
        const resultBuffer = wasmModule.FS.readFile(outputName);

        return { buffer: resultBuffer.buffer };
    } finally {
        try { wasmModule.FS.unlink(fileName); } catch (_) { /* ignore */ }
        try { wasmModule.FS.unlink(outputName); } catch (_) { /* ignore */ }
    }
}

self.onmessage = async function (e) {
    const msg = e.data;
    const _id = msg._id;

    try {
        switch (msg.type) {
            case 'init': {
                const result = await handleInit();
                self.postMessage({ _id, type: 'init', ...result });
                break;
            }
            case 'listModels': {
                const result = handleListModels();
                self.postMessage({ _id, type: 'models', ...result });
                break;
            }
            case 'process': {
                const result = handleProcess(
                    msg.fileName, msg.fileBuffer, msg.model, msg.factor
                );
                self.postMessage(
                    { _id, type: 'result', buffer: result.buffer },
                    [result.buffer]
                );
                break;
            }
            default:
                self.postMessage({ _id, type: 'error', message: 'Unknown message type: ' + msg.type });
        }
    } catch (err) {
        self.postMessage({ _id, type: 'error', message: err.message, stderr: stderrBuffer });
    }
};
