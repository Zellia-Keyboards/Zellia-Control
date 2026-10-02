# libamp script compiler (generated)

Built by `vendor/mqjs/build.sh` (`npm run build:mqjs`). Do not edit these files.

- Source: https://github.com/Zellia-Keyboards/Zellia_libamp.git at `8f9c439551427a4b29d6f716601509b3d422da75`, `tools/mqjs`, CMake target
  `mqjs_wasm` (export `createMqjsCompiler`), with the submodules lib/mquickjs lib/littlefs lib/filex lib/levelx.
- Emscripten: emcc (Emscripten gcc/clang-like replacement + linker emulating GNU ld) 6.0.10-git
- Build: `emcmake cmake -S tools/mqjs -B build -DCMAKE_BUILD_TYPE=Release
  -DCMAKE_C_FLAGS=-Wno-error=implicit-function-declaration` (see `build.sh`), then
  `cmake --build build --target mqjs_wasm`.
- License: GPL-3.0 (`LICENSE`, libamp's); `licenses/` holds the licenses of the compiled
  submodules. A separately licensed component of this MIT app.
- SHA-256: `mqjs_wasm.js` afab753742cb8a04a22e7b021ceeff13a4ed1bc2a48ff3301b1fc1c5561cddb1, `mqjs_wasm.wasm` 3af37169fd5ac4f243963671da884a745637075e6bdcf497498aad4ba55d0ced.
