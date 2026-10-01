#!/usr/bin/env bash
# Builds libamp's script compiler (tools/mqjs, CMake target mqjs_wasm) to WebAssembly with
# Emscripten and copies it here with libamp's license, the licenses of the compiled submodules
# and a provenance record.
#
#   npm run build:mqjs        (needs git, CMake and Emscripten: brew install emscripten cmake)
#
# The output is committed: normal builds and CI never run this. Never edit it by hand.
set -euo pipefail

LIBAMP_REPOSITORY='https://github.com/Zellia-Keyboards/Zellia_libamp.git'
# The newest libamp (zhangqili/libamp main is the same commit). The commit the Zellia firmware
# pins, ee9d947, predates scripts: it has no tools/mqjs.
LIBAMP_COMMIT='8f9c439551427a4b29d6f716601509b3d422da75'
# The submodules the compiler compiles (googletest is only for libamp's own tests).
SUBMODULES=(lib/mquickjs lib/littlefs lib/filex lib/levelx)

out="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
for tool in git cmake emcmake emcc shasum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "build.sh: $tool not found (brew install emscripten cmake)" >&2
    exit 1
  fi
done

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

git init --quiet "$work/libamp"
git -C "$work/libamp" fetch --quiet --depth 1 "$LIBAMP_REPOSITORY" "$LIBAMP_COMMIT"
git -C "$work/libamp" checkout --quiet FETCH_HEAD
git -C "$work/libamp" submodule update --quiet --init --depth 1 -- "${SUBMODULES[@]}"

# libamp's mqjs_utils.c calls script_write_log undeclared (static in src/script.c since e969b2f):
# Clang 16+ rejects that by default, and the call never reaches the compiler's output.
emcmake cmake -S "$work/libamp/tools/mqjs" -B "$work/build" -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_FLAGS=-Wno-error=implicit-function-declaration
cmake --build "$work/build" --target mqjs_wasm --parallel

cp "$work/build/mqjs_wasm.js" "$work/build/mqjs_wasm.wasm" "$out/"
cp "$work/libamp/LICENSE" "$out/LICENSE"
rm -rf "$out/licenses"
mkdir -p "$out/licenses"
for module in "${SUBMODULES[@]}"; do
  name="$(basename "$module")"
  for file in "$work/libamp/$module"/LICENSE* "$work/libamp/$module"/COPYING*; do
    if [ -f "$file" ]; then
      cp "$file" "$out/licenses/$name-$(basename "$file")"
    fi
  done
done

# sed reads all of the output: with pipefail, head could fail the script on SIGPIPE.
emscripten="$(emcc --version 2>/dev/null | sed -n 1p)"
js_sha="$(shasum -a 256 "$out/mqjs_wasm.js" | cut -d ' ' -f 1)"
wasm_sha="$(shasum -a 256 "$out/mqjs_wasm.wasm" | cut -d ' ' -f 1)"
cat >"$out/PROVENANCE.md" <<EOF
# libamp script compiler (generated)

Built by \`vendor/mqjs/build.sh\` (\`npm run build:mqjs\`). Do not edit these files.

- Source: $LIBAMP_REPOSITORY at \`$LIBAMP_COMMIT\`, \`tools/mqjs\`, CMake target
  \`mqjs_wasm\` (export \`createMqjsCompiler\`), with the submodules ${SUBMODULES[*]}.
- Emscripten: $emscripten
- Build: \`emcmake cmake -S tools/mqjs -B build -DCMAKE_BUILD_TYPE=Release
  -DCMAKE_C_FLAGS=-Wno-error=implicit-function-declaration\` (see \`build.sh\`), then
  \`cmake --build build --target mqjs_wasm\`.
- License: GPL-3.0 (\`LICENSE\`, libamp's); \`licenses/\` holds the licenses of the compiled
  submodules. A separately licensed component of this MIT app.
- SHA-256: \`mqjs_wasm.js\` $js_sha, \`mqjs_wasm.wasm\` $wasm_sha.
EOF

echo "build.sh: mqjs_wasm from libamp $LIBAMP_COMMIT ($emscripten)"
