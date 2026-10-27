// Compiler and linker flags shared by the browser compiler (js/compiler-worker.js)
// and the build script (scripts/build.mjs, which precompiles sysroot/prelude/prelude.h
// with exactly the same compile flags).
export const COMPILE_FLAGS = [
  '-std=c++17', '-O0', '-fno-exceptions', '-fno-color-diagnostics',
  '-Wall', '-Wno-unused-parameter', '-Wno-unused-variable', '-Wno-unused-function',
  '-Wno-unused-but-set-variable', '-Wno-unused-const-variable',
  '-Iinclude',
];
export const LINK_FLAGS = [
  '-Wl,--export-table', '-Wl,--export-if-defined=fflush',
  '-Wl,-z,stack-size=1048576', '-Wl,--stack-first', '-Wl,--max-memory=536870912',
];
// Programs that include one of these headers are compiled with the
// precompiled header (much faster: ~1 s instead of ~4-5 s).
export const PCH_TRIGGER = /#\s*include\s*<(iostream|string|vector|sstream|iomanip|fstream|ostream|istream|bits\/stdc\+\+\.h|algorithm|map|set|list|deque|queue|stack|array|functional|memory|numeric|utility|unordered_map|unordered_set|iterator|limits)>/;
