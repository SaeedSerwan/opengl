# OpenGL compatibility list

OpenGL Classroom compiles real C++ with Clang and links it against a **compatibility layer** that implements the classic OpenGL 1.x fixed-function API and GLUT/FreeGLUT on top of WebGL. Browsers only offer WebGL, which is based on OpenGL ES 2.0/3.0. OpenGL ES has **no** `glBegin`/`glEnd`, no matrix stack and no fixed-function lighting, so these functions cannot be passed straight through to the browser. They are emulated.

How the emulation works:

* `glVertex*` calls are transformed on the CPU by the current model-view and projection matrices, as the fixed-function pipeline specifies. They are collected until `glEnd()`.
* At `glEnd()` the primitive is assembled (quads and polygons are split into triangles, line loops are closed, and culling and polygon mode are applied). WebGL then draws it with a minimal pass-through shader.
* Wide lines, large points and stippled lines are expanded into triangles, because WebGL only guarantees 1-pixel lines.
* Lighting uses the OpenGL 1.x per-vertex formula (ambient + diffuse + specular, up to 8 lights).

Legend: ✅ supported · 🟡 supported with differences (see notes) · ⚠️ accepted but does nothing (a warning is printed) · ❌ not available (compile error: not declared)

## Primitives and vertices

| Function / constant | Status | Notes |
|---|---|---|
| `glBegin`, `glEnd` | ✅ | Errors (nested `glBegin`, `glEnd` without `glBegin`, too few vertices) print a warning in the Output panel |
| `glVertex2f/2d/2i/2s`, `glVertex3f/3d/3i/3s`, `glVertex4f/4d/4i`, `glVertex2fv/2dv/2iv/3fv/3dv/3iv/4fv` | ✅ | |
| `GL_POINTS` | ✅ | |
| `GL_LINES`, `GL_LINE_STRIP`, `GL_LINE_LOOP` | ✅ | |
| `GL_TRIANGLES`, `GL_TRIANGLE_STRIP`, `GL_TRIANGLE_FAN` | ✅ | |
| `GL_QUADS`, `GL_QUAD_STRIP` | ✅ | Emulated (split into triangles) |
| `GL_POLYGON` | ✅ | Emulated as a triangle fan, so it must be convex (as in real OpenGL) |
| `glRectf/d/i/s` | ✅ | |
| `glColor3f/3d/3ub/3i`, `glColor4f/4d/4ub`, `glColor3fv/3dv/3ubv/4fv/4dv/4ubv` | ✅ | The alpha value is used when `GL_BLEND` is enabled |
| `glNormal3f/3d/3fv/3dv` | ✅ | |
| `glPointSize` | ✅ | Sizes > 1 are drawn as squares (round with `GL_POINT_SMOOTH`) |
| `glLineWidth` | ✅ | Emulated: any width works, unlike WebGL's 1-pixel limit |
| `glLineStipple` + `GL_LINE_STIPPLE` | ✅ | Emulated in window space |
| `glPolygonMode` (`GL_FILL`, `GL_LINE`, `GL_POINT`) | ✅ | Separate front and back modes |
| `glShadeModel(GL_FLAT / GL_SMOOTH)` | ✅ | Flat shading uses the same provoking vertex as OpenGL |
| `glVertexPointer`, `glDrawArrays`, `glDrawElements` (vertex arrays) | ❌ | Not part of the course style; use `glBegin`/`glEnd` |

## Frame buffer and state

| Function | Status | Notes |
|---|---|---|
| `glClear` (`GL_COLOR_BUFFER_BIT`, `GL_DEPTH_BUFFER_BIT`) | ✅ | |
| `glClearColor`, `glClearDepth` | ✅ | The window is always opaque, so the clear alpha is ignored |
| `glFlush`, `glFinish` | ✅ | The picture appears when the callback returns |
| `glViewport`, `glScissor` + `GL_SCISSOR_TEST` | ✅ | |
| `glEnable/glDisable(GL_DEPTH_TEST)`, `glDepthFunc`, `glDepthMask` | ✅ | |
| `glEnable/glDisable(GL_BLEND)`, `glBlendFunc` | ✅ | |
| `glEnable/glDisable(GL_CULL_FACE)`, `glCullFace`, `glFrontFace` | ✅ | |
| `glColorMask`, `glPolygonOffset` + `GL_POLYGON_OFFSET_FILL` | ✅ | |
| `glIsEnabled`, `glGetError` | ✅ | |
| `glGetFloatv/Doublev/Integerv/Booleanv` | 🟡 | `GL_MODELVIEW_MATRIX`, `GL_PROJECTION_MATRIX`, `GL_VIEWPORT`, `GL_CURRENT_COLOR`, `GL_POINT_SIZE`, `GL_LINE_WIDTH`, `GL_COLOR_CLEAR_VALUE`, `GL_MATRIX_MODE`, stack depths, enable flags |
| `glGetString` | ✅ | Returns "OpenGL Classroom" strings |
| `glPushAttrib`, `glPopAttrib` | 🟡 | Save and restore colour, sizes, enables, polygon/shade mode, blend, clear colour, viewport and depth function, whatever mask is passed |
| `glHint`, `GL_LINE_SMOOTH`, `GL_POLYGON_SMOOTH`, `GL_DITHER`, `GL_MULTISAMPLE` | 🟡 | Accepted. The canvas is always antialiased |

## Transformations

| Function | Status | Notes |
|---|---|---|
| `glMatrixMode(GL_MODELVIEW / GL_PROJECTION)` | ✅ | `GL_TEXTURE` is accepted but unused |
| `glLoadIdentity`, `glPushMatrix`, `glPopMatrix` | ✅ | 32-deep stacks; overflow and underflow print a warning |
| `glTranslatef/d`, `glRotatef/d`, `glScalef/d` | ✅ | `glRotatef` with axis (0,0,0) prints a hint |
| `glOrtho`, `glFrustum` | ✅ | |
| `glLoadMatrixf/d`, `glMultMatrixf/d` | ✅ | Column-major, like OpenGL |
| `gluOrtho2D`, `gluPerspective`, `gluLookAt` | ✅ | |

## Lighting

| Function | Status | Notes |
|---|---|---|
| `GL_LIGHTING`, `GL_LIGHT0`…`GL_LIGHT7` | 🟡 | Per-vertex (Gouraud) lighting with the OpenGL 1.x formula. Normals are always renormalised (as if `GL_NORMALIZE` were enabled) |
| `glLightf/i/fv/iv` | ✅ | Ambient, diffuse, specular, position (transformed by the current model-view, as in OpenGL), spot direction/exponent/cutoff, attenuation |
| `glLightModelf/i/fv` | 🟡 | Ambient and local viewer. Two-sided lighting is accepted, but back faces are lit like front faces |
| `glMaterialf/i/fv/iv` | 🟡 | The front material is used for all faces |
| `glColorMaterial` + `GL_COLOR_MATERIAL` | ✅ | |

## Text and raster position

| Function | Status | Notes |
|---|---|---|
| `glRasterPos2f/2d/2i/3f/3d/3i`, `glWindowPos2i/2f` | ✅ | |
| `glutBitmapCharacter`, `glutBitmapString`, `glutBitmapWidth`, `glutBitmapLength`, `glutBitmapHeight` | 🟡 | Drawn with a similar browser font, so pixel-exact glyph shapes differ slightly from FreeGLUT |
| `GLUT_BITMAP_8_BY_13`, `9_BY_15`, `TIMES_ROMAN_10/24`, `HELVETICA_10/12/18` | 🟡 | Same sizes and advance widths for the fixed fonts |
| `glutStrokeCharacter`, `glutStrokeString`, `glutStrokeWidth` | 🟡 | Placed and transformed correctly in model space (≈119 units tall) and advance the model-view matrix like GLUT, but drawn as filled glyphs, not line strokes |

## Display lists

| Function | Status | Notes |
|---|---|---|
| `glGenLists`, `glNewList` (`GL_COMPILE`, `GL_COMPILE_AND_EXECUTE`), `glEndList`, `glCallList`, `glDeleteLists`, `glIsList` | ✅ | Calls are recorded and replayed. Nested lists work |

## GLU quadrics

| Function | Status | Notes |
|---|---|---|
| `gluNewQuadric`, `gluDeleteQuadric`, `gluQuadricDrawStyle` | ✅ | `GLU_FILL`, `GLU_LINE` (`GLU_POINT`/`GLU_SILHOUETTE` are drawn as lines) |
| `gluSphere`, `gluCylinder`, `gluDisk`, `gluPartialDisk` | ✅ | |
| `gluQuadricNormals`, `gluQuadricOrientation`, `gluQuadricTexture` | ⚠️ | Accepted, no effect |

## GLUT / FreeGLUT

There is exactly **one window**: the Graphics Output panel.

| Function | Status | Notes |
|---|---|---|
| `glutInit`, `glutInitDisplayMode` | ✅ | Every mode is accepted. A depth buffer is always available |
| `glutInitWindowSize`, `glutReshapeWindow` | ✅ | Sets the canvas size in pixels (16–2048). Default 500×500 |
| `glutInitWindowPosition`, `glutPositionWindow`, `glutFullScreen`, `glutSetCursor` | ⚠️ | Accepted, ignored |
| `glutCreateWindow`, `glutSetWindowTitle` | ✅ | The title is shown above the picture. A second window reuses the same canvas |
| `glutMainLoop` | ✅ | Hands control to the browser's event loop. Code after it never runs (as on the desktop) |
| `glutLeaveMainLoop`, `glutDestroyWindow`, `exit()` | ✅ | End the program |
| `glutDisplayFunc`, `glutPostRedisplay` | ✅ | Redraws are synchronised to the screen refresh (≈60 Hz) |
| `glutSwapBuffers` | ✅ | |
| `glutReshapeFunc` | ✅ | Called once at start (and after `glutReshapeWindow`). Resizing the panel scales the picture instead of resizing the window |
| `glutIdleFunc` | 🟡 | Single-buffered programs: called about 1000×/s, similar to a desktop PC. With `GLUT_DOUBLE`: once per screen refresh (≈60×/s), like a desktop with v-sync. The picture is shown at the screen refresh rate |
| `glutTimerFunc` | ✅ | |
| `glutKeyboardFunc`, `glutKeyboardUpFunc` | ✅ | Click the picture first. Ctrl+letter gives control codes, Esc = 27, Enter = 13 |
| `glutSpecialFunc`, `glutSpecialUpFunc` | ✅ | Arrows, F1–F12, Page Up/Down, Home, End, Insert, and the FreeGLUT Shift/Ctrl/Alt keys |
| `glutMouseFunc`, `glutMotionFunc`, `glutPassiveMotionFunc`, `glutEntryFunc` | ✅ | Window-pixel coordinates, y from the top, like GLUT. The wheel sends buttons 3/4 |
| `glutMouseWheelFunc` | ✅ | |
| `glutGetModifiers`, `glutIgnoreKeyRepeat` | ✅ | |
| `glutGet` | ✅ | `GLUT_ELAPSED_TIME`, `GLUT_WINDOW_WIDTH/HEIGHT`, `GLUT_SCREEN_WIDTH/HEIGHT` (fixed 1920×1080), `GLUT_INIT_WINDOW_*` |
| `glutCreateMenu`, `glutAddMenuEntry`, `glutAddSubMenu`, `glutAttachMenu`, `glutSetMenu`, `glutChangeToMenuEntry`, `glutRemoveMenuItem`, `glutDestroyMenu`, `glutDetachMenu` | ✅ | Shown as a pop-up menu over the picture |
| `glutVisibilityFunc`, `glutCloseFunc` | ⚠️ | Accepted, never called |
| `glutWire/SolidCube`, `Sphere`, `Cone`, `Torus`, `Cylinder`, `Teapot`, `Tetrahedron`, `Octahedron`, `Icosahedron` | ✅ | Same sizes and orientation as FreeGLUT. The teapot uses the original Newell data as a triangle mesh |
| `glutWire/SolidDodecahedron`, `glutWire/SolidRhombicDodecahedron`, Sierpinski sponge | ❌ | Not declared |
| `glutSetOption` | ⚠️ | Accepted |
| `glewInit` (`<GL/glew.h>`) | ⚠️ | Stub that returns `GLEW_OK` |

## Not supported

These print a one-time warning (⚠️) or are not declared at all (❌, compile error). They are outside an introductory 2D/3D course:

* ⚠️ **Texture mapping:** `glGenTextures`, `glBindTexture`, `glTexImage2D`, `glTexParameter*`, `glTexEnv*`, `glTexCoord*`, `GL_TEXTURE_2D`. Students also cannot load image files, because there is no file system.
* ⚠️ **Fog:** `glFog*`, `GL_FOG`.
* ⚠️ `glReadPixels`, `glDrawPixels`, `glPixelStorei`, `glPolygonStipple`, `GL_ALPHA_TEST`, `GL_STENCIL_TEST`.
* ❌ Modern OpenGL (shaders, VBOs, VAOs, `glGenBuffers`, `glCreateShader`…), GLFW and SDL. They are a different course style.
* ❌ Accumulation buffer, selection/feedback mode (`glRenderMode`, picking), evaluators (`glMap*`), `glBitmap`.

## C++ and the standard library

* C++17 with Clang 22 and libc++. `<iostream>`, `<string>`, `<vector>`, `<cmath>`, `<cstdio>`, `<algorithm>`, `<map>` and the rest of the standard library work. `<bits/stdc++.h>` is provided.
* `cout`, `cerr` and `printf` go to the Output panel. `cin` and `scanf` read from the **Program input** box.
* Exceptions are disabled (`-fno-exceptions`). `throw` gives a compile error.
* No file system: `fopen` / `ifstream` fail. No threads.
* `<windows.h>` is a stub so lab code written on Windows still compiles. `Sleep(ms)` works. `<dos.h>` provides `delay(ms)`.
* `void main()` is rejected by Clang. Use `int main()`.
* Desktop-style animation inside one function works: drawing, then `glFlush()`/`glutSwapBuffers()`, then `Sleep()`/`usleep()`/a delay loop, in a `for` or `while (true)` loop. Each frame is shown as it is drawn (up to ~60 per second), and **Stop** ends an endless loop. Each sleep call waits at most 2 s.
* Programs are compiled without optimisation (`-O0`), like a debug build in Code::Blocks, so empty delay loops really take time.
* Programs may use up to 512 MB of memory and a 1 MB stack.
