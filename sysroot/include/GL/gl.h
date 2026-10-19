/*
 * GL/gl.h — OpenGL Classroom compatibility header
 *
 * This header declares the classic (OpenGL 1.x, "fixed-function") API used in
 * introductory graphics courses. The functions are implemented by the
 * OpenGL Classroom runtime, which translates them to WebGL in the browser.
 *
 * Every function marked GLCL_API is imported by the compiled WebAssembly
 * program from the "gl" import module. See docs/COMPATIBILITY.md for the
 * exact support status of each function.
 */
#ifndef __gl_h_
#define __gl_h_
#define __GL_H__
#define GL_VERSION_1_1 1
#define GL_VERSION_1_2 1
#define GL_VERSION_1_3 1
#define GL_VERSION_1_4 1

#ifdef __cplusplus
extern "C" {
#endif

#define GLCL_API(name) __attribute__((import_module("gl"), import_name(#name)))
#define APIENTRY
#define GLAPI extern
#define GLAPIENTRY
#define WINGDIAPI
#define CALLBACK

typedef unsigned int   GLenum;
typedef unsigned char  GLboolean;
typedef unsigned int   GLbitfield;
typedef void           GLvoid;
typedef signed char    GLbyte;
typedef short          GLshort;
typedef int            GLint;
typedef int            GLsizei;
typedef unsigned char  GLubyte;
typedef unsigned short GLushort;
typedef unsigned int   GLuint;
typedef float          GLfloat;
typedef float          GLclampf;
typedef double         GLdouble;
typedef double         GLclampd;
typedef char           GLchar;

/* Boolean */
#define GL_FALSE 0
#define GL_TRUE  1

/* Data types */
#define GL_BYTE           0x1400
#define GL_UNSIGNED_BYTE  0x1401
#define GL_SHORT          0x1402
#define GL_UNSIGNED_SHORT 0x1403
#define GL_INT            0x1404
#define GL_UNSIGNED_INT   0x1405
#define GL_FLOAT          0x1406
#define GL_DOUBLE         0x140A

/* Primitives */
#define GL_POINTS         0x0000
#define GL_LINES          0x0001
#define GL_LINE_LOOP      0x0002
#define GL_LINE_STRIP     0x0003
#define GL_TRIANGLES      0x0004
#define GL_TRIANGLE_STRIP 0x0005
#define GL_TRIANGLE_FAN   0x0006
#define GL_QUADS          0x0007
#define GL_QUAD_STRIP     0x0008
#define GL_POLYGON        0x0009

/* Buffers */
#define GL_COLOR_BUFFER_BIT   0x00004000
#define GL_DEPTH_BUFFER_BIT   0x00000100
#define GL_STENCIL_BUFFER_BIT 0x00000400
#define GL_ACCUM_BUFFER_BIT   0x00000200
#define GL_CURRENT_BIT        0x00000001
#define GL_POINT_BIT          0x00000002
#define GL_LINE_BIT           0x00000004
#define GL_POLYGON_BIT        0x00000008
#define GL_LIGHTING_BIT       0x00000040
#define GL_ENABLE_BIT         0x00002000
#define GL_TRANSFORM_BIT      0x00001000
#define GL_ALL_ATTRIB_BITS    0x000FFFFF

/* Matrix modes */
#define GL_MATRIX_MODE 0x0BA0
#define GL_MODELVIEW   0x1700
#define GL_PROJECTION  0x1701
#define GL_TEXTURE     0x1702

/* Capabilities (glEnable / glDisable) */
#define GL_POINT_SMOOTH       0x0B10
#define GL_LINE_SMOOTH        0x0B20
#define GL_LINE_STIPPLE       0x0B24
#define GL_POLYGON_SMOOTH     0x0B41
#define GL_POLYGON_STIPPLE    0x0B42
#define GL_CULL_FACE          0x0B44
#define GL_LIGHTING           0x0B50
#define GL_COLOR_MATERIAL     0x0B57
#define GL_FOG                0x0B60
#define GL_DEPTH_TEST         0x0B71
#define GL_STENCIL_TEST       0x0B90
#define GL_NORMALIZE          0x0BA1
#define GL_ALPHA_TEST         0x0BC0
#define GL_DITHER             0x0BD0
#define GL_BLEND              0x0BE2
#define GL_SCISSOR_TEST       0x0C11
#define GL_TEXTURE_1D         0x0DE0
#define GL_TEXTURE_2D         0x0DE1
#define GL_RESCALE_NORMAL     0x803A
#define GL_MULTISAMPLE        0x809D
#define GL_POLYGON_OFFSET_FILL 0x8037
#define GL_LIGHT0 0x4000
#define GL_LIGHT1 0x4001
#define GL_LIGHT2 0x4002
#define GL_LIGHT3 0x4003
#define GL_LIGHT4 0x4004
#define GL_LIGHT5 0x4005
#define GL_LIGHT6 0x4006
#define GL_LIGHT7 0x4007

/* Blending */
#define GL_ZERO                0
#define GL_ONE                 1
#define GL_SRC_COLOR           0x0300
#define GL_ONE_MINUS_SRC_COLOR 0x0301
#define GL_SRC_ALPHA           0x0302
#define GL_ONE_MINUS_SRC_ALPHA 0x0303
#define GL_DST_ALPHA           0x0304
#define GL_ONE_MINUS_DST_ALPHA 0x0305
#define GL_DST_COLOR           0x0306
#define GL_ONE_MINUS_DST_COLOR 0x0307
#define GL_SRC_ALPHA_SATURATE  0x0308

/* Depth / comparison functions */
#define GL_NEVER    0x0200
#define GL_LESS     0x0201
#define GL_EQUAL    0x0202
#define GL_LEQUAL   0x0203
#define GL_GREATER  0x0204
#define GL_NOTEQUAL 0x0205
#define GL_GEQUAL   0x0206
#define GL_ALWAYS   0x0207

/* Faces, winding, polygon mode, shading */
#define GL_FRONT          0x0404
#define GL_BACK           0x0405
#define GL_FRONT_AND_BACK 0x0408
#define GL_CW             0x0900
#define GL_CCW            0x0901
#define GL_POINT          0x1B00
#define GL_LINE           0x1B01
#define GL_FILL           0x1B02
#define GL_FLAT           0x1D00
#define GL_SMOOTH         0x1D01

/* Lighting and materials */
#define GL_AMBIENT               0x1200
#define GL_DIFFUSE               0x1201
#define GL_SPECULAR              0x1202
#define GL_POSITION              0x1203
#define GL_SPOT_DIRECTION        0x1204
#define GL_SPOT_EXPONENT         0x1205
#define GL_SPOT_CUTOFF           0x1206
#define GL_CONSTANT_ATTENUATION  0x1207
#define GL_LINEAR_ATTENUATION    0x1208
#define GL_QUADRATIC_ATTENUATION 0x1209
#define GL_EMISSION              0x1600
#define GL_SHININESS             0x1601
#define GL_AMBIENT_AND_DIFFUSE   0x1602
#define GL_LIGHT_MODEL_LOCAL_VIEWER 0x0B51
#define GL_LIGHT_MODEL_TWO_SIDE  0x0B52
#define GL_LIGHT_MODEL_AMBIENT   0x0B53

/* glGet */
#define GL_CURRENT_COLOR      0x0B00
#define GL_POINT_SIZE         0x0B11
#define GL_LINE_WIDTH         0x0B21
#define GL_VIEWPORT           0x0BA2
#define GL_MODELVIEW_MATRIX   0x0BA6
#define GL_PROJECTION_MATRIX  0x0BA7
#define GL_COLOR_CLEAR_VALUE  0x0C22
#define GL_MAX_LIGHTS         0x0D31
#define GL_MAX_TEXTURE_SIZE   0x0D33
#define GL_MODELVIEW_STACK_DEPTH  0x0BA3
#define GL_PROJECTION_STACK_DEPTH 0x0BA4

/* Hints */
#define GL_PERSPECTIVE_CORRECTION_HINT 0x0C50
#define GL_POINT_SMOOTH_HINT   0x0C51
#define GL_LINE_SMOOTH_HINT    0x0C52
#define GL_POLYGON_SMOOTH_HINT 0x0C53
#define GL_FOG_HINT            0x0C54
#define GL_DONT_CARE 0x1100
#define GL_FASTEST   0x1101
#define GL_NICEST    0x1102

/* Display lists */
#define GL_COMPILE             0x1300
#define GL_COMPILE_AND_EXECUTE 0x1301

/* Strings */
#define GL_VENDOR     0x1F00
#define GL_RENDERER   0x1F01
#define GL_VERSION    0x1F02
#define GL_EXTENSIONS 0x1F03

/* Errors */
#define GL_NO_ERROR          0
#define GL_INVALID_ENUM      0x0500
#define GL_INVALID_VALUE     0x0501
#define GL_INVALID_OPERATION 0x0502
#define GL_STACK_OVERFLOW    0x0503
#define GL_STACK_UNDERFLOW   0x0504
#define GL_OUT_OF_MEMORY     0x0505

/* Texture-related constants (declared so code compiles; textures are not supported) */
#define GL_RGB  0x1907
#define GL_RGBA 0x1908
#define GL_TEXTURE_MAG_FILTER 0x2800
#define GL_TEXTURE_MIN_FILTER 0x2801
#define GL_TEXTURE_WRAP_S 0x2802
#define GL_TEXTURE_WRAP_T 0x2803
#define GL_NEAREST 0x2600
#define GL_LINEAR  0x2601
#define GL_REPEAT  0x2901
#define GL_CLAMP   0x2900
#define GL_TEXTURE_ENV 0x2300
#define GL_TEXTURE_ENV_MODE 0x2200
#define GL_MODULATE 0x2100
#define GL_REPLACE  0x1E01
#define GL_DECAL    0x2101

/* ---------------- Primitive drawing ---------------- */
GLCL_API(glBegin) void glBegin(GLenum mode);
GLCL_API(glEnd)   void glEnd(void);

GLCL_API(glVertex2f) void glVertex2f(GLfloat x, GLfloat y);
GLCL_API(glVertex2d) void glVertex2d(GLdouble x, GLdouble y);
GLCL_API(glVertex2i) void glVertex2i(GLint x, GLint y);
GLCL_API(glVertex2s) void glVertex2s(GLshort x, GLshort y);
GLCL_API(glVertex3f) void glVertex3f(GLfloat x, GLfloat y, GLfloat z);
GLCL_API(glVertex3d) void glVertex3d(GLdouble x, GLdouble y, GLdouble z);
GLCL_API(glVertex3i) void glVertex3i(GLint x, GLint y, GLint z);
GLCL_API(glVertex3s) void glVertex3s(GLshort x, GLshort y, GLshort z);
GLCL_API(glVertex4f) void glVertex4f(GLfloat x, GLfloat y, GLfloat z, GLfloat w);
GLCL_API(glVertex4d) void glVertex4d(GLdouble x, GLdouble y, GLdouble z, GLdouble w);
GLCL_API(glVertex4i) void glVertex4i(GLint x, GLint y, GLint z, GLint w);
GLCL_API(glVertex2fv) void glVertex2fv(const GLfloat *v);
GLCL_API(glVertex2dv) void glVertex2dv(const GLdouble *v);
GLCL_API(glVertex2iv) void glVertex2iv(const GLint *v);
GLCL_API(glVertex3fv) void glVertex3fv(const GLfloat *v);
GLCL_API(glVertex3dv) void glVertex3dv(const GLdouble *v);
GLCL_API(glVertex3iv) void glVertex3iv(const GLint *v);
GLCL_API(glVertex4fv) void glVertex4fv(const GLfloat *v);

GLCL_API(glColor3f)  void glColor3f(GLfloat r, GLfloat g, GLfloat b);
GLCL_API(glColor3d)  void glColor3d(GLdouble r, GLdouble g, GLdouble b);
GLCL_API(glColor3ub) void glColor3ub(GLubyte r, GLubyte g, GLubyte b);
GLCL_API(glColor3i)  void glColor3i(GLint r, GLint g, GLint b);
GLCL_API(glColor4f)  void glColor4f(GLfloat r, GLfloat g, GLfloat b, GLfloat a);
GLCL_API(glColor4d)  void glColor4d(GLdouble r, GLdouble g, GLdouble b, GLdouble a);
GLCL_API(glColor4ub) void glColor4ub(GLubyte r, GLubyte g, GLubyte b, GLubyte a);
GLCL_API(glColor3fv) void glColor3fv(const GLfloat *v);
GLCL_API(glColor3dv) void glColor3dv(const GLdouble *v);
GLCL_API(glColor3ubv) void glColor3ubv(const GLubyte *v);
GLCL_API(glColor4fv) void glColor4fv(const GLfloat *v);
GLCL_API(glColor4dv) void glColor4dv(const GLdouble *v);
GLCL_API(glColor4ubv) void glColor4ubv(const GLubyte *v);

GLCL_API(glNormal3f)  void glNormal3f(GLfloat x, GLfloat y, GLfloat z);
GLCL_API(glNormal3d)  void glNormal3d(GLdouble x, GLdouble y, GLdouble z);
GLCL_API(glNormal3fv) void glNormal3fv(const GLfloat *v);
GLCL_API(glNormal3dv) void glNormal3dv(const GLdouble *v);

GLCL_API(glRectf) void glRectf(GLfloat x1, GLfloat y1, GLfloat x2, GLfloat y2);
GLCL_API(glRectd) void glRectd(GLdouble x1, GLdouble y1, GLdouble x2, GLdouble y2);
GLCL_API(glRecti) void glRecti(GLint x1, GLint y1, GLint x2, GLint y2);
GLCL_API(glRects) void glRects(GLshort x1, GLshort y1, GLshort x2, GLshort y2);

/* ---------------- Frame buffer ---------------- */
GLCL_API(glClear)      void glClear(GLbitfield mask);
GLCL_API(glClearColor) void glClearColor(GLclampf r, GLclampf g, GLclampf b, GLclampf a);
GLCL_API(glClearDepth) void glClearDepth(GLclampd depth);
GLCL_API(glFlush)      void glFlush(void);
GLCL_API(glFinish)     void glFinish(void);
GLCL_API(glColorMask)  void glColorMask(GLboolean r, GLboolean g, GLboolean b, GLboolean a);
GLCL_API(glDepthMask)  void glDepthMask(GLboolean flag);
GLCL_API(glDepthFunc)  void glDepthFunc(GLenum func);
GLCL_API(glBlendFunc)  void glBlendFunc(GLenum sfactor, GLenum dfactor);
GLCL_API(glViewport)   void glViewport(GLint x, GLint y, GLsizei width, GLsizei height);
GLCL_API(glScissor)    void glScissor(GLint x, GLint y, GLsizei width, GLsizei height);

/* ---------------- Transformations ---------------- */
GLCL_API(glMatrixMode)   void glMatrixMode(GLenum mode);
GLCL_API(glLoadIdentity) void glLoadIdentity(void);
GLCL_API(glPushMatrix)   void glPushMatrix(void);
GLCL_API(glPopMatrix)    void glPopMatrix(void);
GLCL_API(glTranslatef)   void glTranslatef(GLfloat x, GLfloat y, GLfloat z);
GLCL_API(glTranslated)   void glTranslated(GLdouble x, GLdouble y, GLdouble z);
GLCL_API(glRotatef)      void glRotatef(GLfloat angle, GLfloat x, GLfloat y, GLfloat z);
GLCL_API(glRotated)      void glRotated(GLdouble angle, GLdouble x, GLdouble y, GLdouble z);
GLCL_API(glScalef)       void glScalef(GLfloat x, GLfloat y, GLfloat z);
GLCL_API(glScaled)       void glScaled(GLdouble x, GLdouble y, GLdouble z);
GLCL_API(glOrtho)        void glOrtho(GLdouble left, GLdouble right, GLdouble bottom, GLdouble top, GLdouble zNear, GLdouble zFar);
GLCL_API(glFrustum)      void glFrustum(GLdouble left, GLdouble right, GLdouble bottom, GLdouble top, GLdouble zNear, GLdouble zFar);
GLCL_API(glLoadMatrixf)  void glLoadMatrixf(const GLfloat *m);
GLCL_API(glLoadMatrixd)  void glLoadMatrixd(const GLdouble *m);
GLCL_API(glMultMatrixf)  void glMultMatrixf(const GLfloat *m);
GLCL_API(glMultMatrixd)  void glMultMatrixd(const GLdouble *m);

/* ---------------- State ---------------- */
GLCL_API(glEnable)      void glEnable(GLenum cap);
GLCL_API(glDisable)     void glDisable(GLenum cap);
GLCL_API(glIsEnabled)   GLboolean glIsEnabled(GLenum cap);
GLCL_API(glPointSize)   void glPointSize(GLfloat size);
GLCL_API(glLineWidth)   void glLineWidth(GLfloat width);
GLCL_API(glLineStipple) void glLineStipple(GLint factor, GLushort pattern);
GLCL_API(glPolygonMode) void glPolygonMode(GLenum face, GLenum mode);
GLCL_API(glShadeModel)  void glShadeModel(GLenum mode);
GLCL_API(glCullFace)    void glCullFace(GLenum mode);
GLCL_API(glFrontFace)   void glFrontFace(GLenum mode);
GLCL_API(glHint)        void glHint(GLenum target, GLenum mode);
GLCL_API(glPushAttrib)  void glPushAttrib(GLbitfield mask);
GLCL_API(glPopAttrib)   void glPopAttrib(void);
GLCL_API(glGetError)    GLenum glGetError(void);
GLCL_API(glGetFloatv)   void glGetFloatv(GLenum pname, GLfloat *params);
GLCL_API(glGetDoublev)  void glGetDoublev(GLenum pname, GLdouble *params);
GLCL_API(glGetIntegerv) void glGetIntegerv(GLenum pname, GLint *params);
GLCL_API(glGetBooleanv) void glGetBooleanv(GLenum pname, GLboolean *params);

static inline const GLubyte *glGetString(GLenum name) {
    switch (name) {
    case GL_VENDOR:   return (const GLubyte *)"OpenGL Classroom";
    case GL_RENDERER: return (const GLubyte *)"OpenGL Classroom legacy-GL-on-WebGL translator";
    case GL_VERSION:  return (const GLubyte *)"1.4 (OpenGL Classroom subset)";
    case GL_EXTENSIONS: return (const GLubyte *)"";
    default: return (const GLubyte *)0;
    }
}

/* ---------------- Lighting ---------------- */
GLCL_API(glLightf)       void glLightf(GLenum light, GLenum pname, GLfloat param);
GLCL_API(glLighti)       void glLighti(GLenum light, GLenum pname, GLint param);
GLCL_API(glLightfv)      void glLightfv(GLenum light, GLenum pname, const GLfloat *params);
GLCL_API(glLightiv)      void glLightiv(GLenum light, GLenum pname, const GLint *params);
GLCL_API(glLightModelf)  void glLightModelf(GLenum pname, GLfloat param);
GLCL_API(glLightModeli)  void glLightModeli(GLenum pname, GLint param);
GLCL_API(glLightModelfv) void glLightModelfv(GLenum pname, const GLfloat *params);
GLCL_API(glMaterialf)    void glMaterialf(GLenum face, GLenum pname, GLfloat param);
GLCL_API(glMateriali)    void glMateriali(GLenum face, GLenum pname, GLint param);
GLCL_API(glMaterialfv)   void glMaterialfv(GLenum face, GLenum pname, const GLfloat *params);
GLCL_API(glMaterialiv)   void glMaterialiv(GLenum face, GLenum pname, const GLint *params);
GLCL_API(glColorMaterial) void glColorMaterial(GLenum face, GLenum mode);

/* ---------------- Raster position (used for text) ---------------- */
GLCL_API(glRasterPos2f) void glRasterPos2f(GLfloat x, GLfloat y);
GLCL_API(glRasterPos2d) void glRasterPos2d(GLdouble x, GLdouble y);
GLCL_API(glRasterPos2i) void glRasterPos2i(GLint x, GLint y);
GLCL_API(glRasterPos3f) void glRasterPos3f(GLfloat x, GLfloat y, GLfloat z);
GLCL_API(glRasterPos3d) void glRasterPos3d(GLdouble x, GLdouble y, GLdouble z);
GLCL_API(glRasterPos3i) void glRasterPos3i(GLint x, GLint y, GLint z);
GLCL_API(glWindowPos2i) void glWindowPos2i(GLint x, GLint y);
GLCL_API(glWindowPos2f) void glWindowPos2f(GLfloat x, GLfloat y);

/* ---------------- Display lists ---------------- */
GLCL_API(glGenLists)    GLuint glGenLists(GLsizei range);
GLCL_API(glNewList)     void glNewList(GLuint list, GLenum mode);
GLCL_API(glEndList)     void glEndList(void);
GLCL_API(glCallList)    void glCallList(GLuint list);
GLCL_API(glDeleteLists) void glDeleteLists(GLuint list, GLsizei range);
GLCL_API(glIsList)      GLboolean glIsList(GLuint list);

/* ---------------- NOT SUPPORTED (accepted, print a warning, do nothing) ----
 * Texture mapping, fog, stencil, accumulation buffer, pixel operations and
 * vertex arrays are outside the scope of this environment.                  */
GLCL_API(glGenTextures)   void glGenTextures(GLsizei n, GLuint *textures);
GLCL_API(glBindTexture)   void glBindTexture(GLenum target, GLuint texture);
GLCL_API(glDeleteTextures) void glDeleteTextures(GLsizei n, const GLuint *textures);
GLCL_API(glTexImage2D)    void glTexImage2D(GLenum target, GLint level, GLint internalformat, GLsizei width, GLsizei height, GLint border, GLenum format, GLenum type, const GLvoid *pixels);
GLCL_API(glTexParameteri) void glTexParameteri(GLenum target, GLenum pname, GLint param);
GLCL_API(glTexParameterf) void glTexParameterf(GLenum target, GLenum pname, GLfloat param);
GLCL_API(glTexEnvi)       void glTexEnvi(GLenum target, GLenum pname, GLint param);
GLCL_API(glTexEnvf)       void glTexEnvf(GLenum target, GLenum pname, GLfloat param);
GLCL_API(glTexCoord2f)    void glTexCoord2f(GLfloat s, GLfloat t);
GLCL_API(glTexCoord2d)    void glTexCoord2d(GLdouble s, GLdouble t);
GLCL_API(glFogf)          void glFogf(GLenum pname, GLfloat param);
GLCL_API(glFogi)          void glFogi(GLenum pname, GLint param);
GLCL_API(glFogfv)         void glFogfv(GLenum pname, const GLfloat *params);
GLCL_API(glPixelStorei)   void glPixelStorei(GLenum pname, GLint param);
GLCL_API(glReadPixels)    void glReadPixels(GLint x, GLint y, GLsizei width, GLsizei height, GLenum format, GLenum type, GLvoid *pixels);
GLCL_API(glDrawPixels)    void glDrawPixels(GLsizei width, GLsizei height, GLenum format, GLenum type, const GLvoid *pixels);
GLCL_API(glPolygonStipple) void glPolygonStipple(const GLubyte *mask);
GLCL_API(glPolygonOffset) void glPolygonOffset(GLfloat factor, GLfloat units);

#ifdef __cplusplus
}
#endif
#endif /* __gl_h_ */
