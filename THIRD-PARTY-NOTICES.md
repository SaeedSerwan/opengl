# Third-party components

These are downloaded from npm at build time and included in the published site (`dist/`). They are not stored in this repository.

| Component | Use | Licence |
|---|---|---|
| [LLVM / Clang / LLD](https://llvm.org) 22 | C++ compiler and linker | Apache License 2.0 with LLVM Exceptions |
| [libc++, wasi-libc](https://github.com/WebAssembly/wasi-sdk) (inside the toolchain sysroot) | C/C++ standard libraries | Apache 2.0 with LLVM Exceptions; wasi-libc: MIT/Apache-2.0 and others (see wasi-libc) |
| [YoWASP Clang](https://github.com/YoWASP/clang) (`@yowasp/clang`) | WebAssembly build and JavaScript runtime of the toolchain | ISC (packaging) / Apache-2.0 (LLVM) |
| [CodeMirror 5](https://codemirror.net/5/) | Code editor | MIT |
| [Utah teapot](https://github.com/mikolalysenko/teapot) | `glutSolidTeapot` / `glutWireTeapot` mesh (in `js/runtime/teapot-data.js`) | Public domain (Martin Newell, 1975) |

Development-only (not published): `playwright-core` (Apache-2.0) and `pngjs` (MIT) for the automated tests.

The OpenGL and GLUT header files in `sysroot/include/` were written for this project. They declare the same function names and constant values as the OpenGL 1.x and FreeGLUT APIs.
