# Anime4KCPP-Playground

A high performance anime upscaler - in your browser.
[Try it!](https://tianzerl.github.io/Anime4KCPP-Playground/)

## Build (WASM)

Build the WASM module from the upstream [Anime4KCPP](https://github.com/TianZerL/Anime4KCPP) project:

```shell
git clone https://github.com/TianZerL/Anime4KCPP.git
cd Anime4KCPP
mkdir build_wasm && cd build_wasm
emcmake cmake .. -DCMAKE_EXE_LINKER_FLAGS="-sMODULARIZE=1 -sINVOKE_RUN=0 -sEXPORTED_RUNTIME_METHODS=['FS','callMain'] -sENVIRONMENT=web"
cmake --build . --parallel 4
```

Copy the built `ac_cli.js` and `ac_cli.wasm` to the project root directory.

## Development

Since this is a pure static site using ES Modules, serve it with any HTTP server:

```shell
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080` in your browser.

## Deploy

Push to `main` branch — GitHub Actions automatically builds the WASM module and deploys to GitHub Pages.

## Features

- Upload images (JPEG/PNG/BMP) via click or drag-and-drop
- Select upscaling model and factor (2x–4x)
- Before/after comparison with interactive slider
- Download result as PNG, JPG, or WebP
- Dark/light theme toggle
