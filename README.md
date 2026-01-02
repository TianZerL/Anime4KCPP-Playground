# Anime4KCPP-Playground
A high performance anime upscaler - in your browser. [Try it!](https://tianzerl.github.io/Anime4KCPP-Playground/)

# build
```shell
git clone https://github.com/TianZerL/Anime4KCPP.git
cd Anime4KCPP
mkdir build_wasm && cd build_wasm
emcmake cmake .. -DCMAKE_EXE_LINKER_FLAGS="-sMODULARIZE=1 -sINVOKE_RUN=0 -sEXPORTED_RUNTIME_METHODS=['FS','callMain'] -sENVIRONMENT=web"
cmake --build . --parallel 4
```
