# Anime4KCPP-Playground

A high performance anime upscaler - in your browser.
[Try it!](https://tianzerl.github.io/Anime4KCPP-Playground/)

## Build (WASM)

Build the WASM module from the upstream [Anime4KCPP](https://github.com/TianZerL/Anime4KCPP) project:

```shell
git clone https://github.com/TianZerL/Anime4KCPP.git
cd Anime4KCPP
mkdir build_wasm && cd build_wasm
emcmake cmake .. \
  -DCMAKE_EXE_LINKER_FLAGS="\
    -sMODULARIZE=1 \
    -sINVOKE_RUN=0 \
    -sEXPORTED_RUNTIME_METHODS=['FS','callMain'] \
    -sENVIRONMENT=web,worker"
cmake --build . -j4
```

You can also build with multi-threading support. **Note:** This requires the hosting page to send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers, which [GitHub Pages does not support](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-custom-domain-for-your-github-pages-site). Use this build only on platforms with custom headers or for local testing.

```shell
git clone https://github.com/TianZerL/Anime4KCPP.git
cd Anime4KCPP
mkdir build_wasm && cd build_wasm
emcmake cmake .. \
  -DCMAKE_CXX_FLAGS="-sUSE_PTHREADS=1" \
  -DCMAKE_EXE_LINKER_FLAGS="\
    -sMODULARIZE=1 \
    -sINVOKE_RUN=0 \
    -sEXPORTED_RUNTIME_METHODS=['FS','callMain'] \
    -sENVIRONMENT=web,worker \
    -sUSE_PTHREADS=1 \
    -sPTHREAD_POOL_SIZE=4"
cmake --build . -j4
```

After building, copy the resulting `ac_cli.js` and `ac_cli.wasm` to the project root directory.

## Development

Since this is a pure static site using ES Modules, serve it with any HTTP server:

```shell
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080` in your browser.

To test the multi-threaded build locally, you need a server that sends the required COOP/COEP headers. For example, use the following script:

```python
from http.server import HTTPServer, SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        super().end_headers()

HTTPServer(('localhost', 8080), Handler).serve_forever()
```

Run it and open `http://localhost:8080` in a browser on the same machine.

Verify that the page is cross-origin isolated by opening the browser console:

```js
self.crossOriginIsolated  // should return true
```

## Deploy

Push to `main` branch — GitHub Actions automatically builds the WASM module and deploys to GitHub Pages.

## Features

- Upload images (JPEG/PNG/BMP/WebP) via click or drag-and-drop
- Select upscaling model and factor (2x–4x)
- Before/after comparison with interactive slider
- Download result as PNG, JPG, or WebP
- Dark/light theme toggle
- Keyboard shortcuts (Ctrl+O to open, Enter to process, Esc to close)
