/*
 * GL/freeglut_std.h — OpenGL Classroom compatibility header (GLUT / FreeGLUT subset)
 *
 * Window and callback functions are implemented by the OpenGL Classroom
 * runtime. There is exactly one window: the "Graphics Output" panel.
 *
 * How glutMainLoop() works here: in a desktop program it never returns.
 * In the browser, glutMainLoop() hands control back to the browser's event
 * loop, which then calls your display / idle / timer / keyboard / mouse
 * callbacks, exactly like GLUT would. Code written after glutMainLoop()
 * is never executed, just as on the desktop.
 */
#ifndef __FREEGLUT_STD_H__
#define __FREEGLUT_STD_H__
#define GLUT_API_VERSION 4
#define FREEGLUT 1
#define GLUT_XLIB_IMPLEMENTATION 13

#include <GL/gl.h>
#include <GL/glu.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Display modes */
#define GLUT_RGB         0x0000
#define GLUT_RGBA        0x0000
#define GLUT_INDEX       0x0001
#define GLUT_SINGLE      0x0000
#define GLUT_DOUBLE      0x0002
#define GLUT_ACCUM       0x0004
#define GLUT_ALPHA       0x0008
#define GLUT_DEPTH       0x0010
#define GLUT_STENCIL     0x0020
#define GLUT_MULTISAMPLE 0x0080
#define GLUT_STEREO      0x0100

/* Mouse */
#define GLUT_LEFT_BUTTON   0
#define GLUT_MIDDLE_BUTTON 1
#define GLUT_RIGHT_BUTTON  2
#define GLUT_DOWN 0
#define GLUT_UP   1
#define GLUT_LEFT    0
#define GLUT_ENTERED 1

/* Special keys */
#define GLUT_KEY_F1  1
#define GLUT_KEY_F2  2
#define GLUT_KEY_F3  3
#define GLUT_KEY_F4  4
#define GLUT_KEY_F5  5
#define GLUT_KEY_F6  6
#define GLUT_KEY_F7  7
#define GLUT_KEY_F8  8
#define GLUT_KEY_F9  9
#define GLUT_KEY_F10 10
#define GLUT_KEY_F11 11
#define GLUT_KEY_F12 12
#define GLUT_KEY_LEFT      100
#define GLUT_KEY_UP        101
#define GLUT_KEY_RIGHT     102
#define GLUT_KEY_DOWN      103
#define GLUT_KEY_PAGE_UP   104
#define GLUT_KEY_PAGE_DOWN 105
#define GLUT_KEY_HOME      106
#define GLUT_KEY_END       107
#define GLUT_KEY_INSERT    108
#define GLUT_KEY_NUM_LOCK  0x006D
#define GLUT_KEY_BEGIN     0x006E
#define GLUT_KEY_DELETE    0x006F
#define GLUT_KEY_SHIFT_L   0x0070
#define GLUT_KEY_SHIFT_R   0x0071
#define GLUT_KEY_CTRL_L    0x0072
#define GLUT_KEY_CTRL_R    0x0073
#define GLUT_KEY_ALT_L     0x0074
#define GLUT_KEY_ALT_R     0x0075

/* Modifiers */
#define GLUT_ACTIVE_SHIFT 1
#define GLUT_ACTIVE_CTRL  2
#define GLUT_ACTIVE_ALT   4

/* glutGet */
#define GLUT_WINDOW_X             100
#define GLUT_WINDOW_Y             101
#define GLUT_WINDOW_WIDTH         102
#define GLUT_WINDOW_HEIGHT        103
#define GLUT_WINDOW_BUFFER_SIZE   104
#define GLUT_WINDOW_DOUBLEBUFFER  115
#define GLUT_WINDOW_RGBA          116
#define GLUT_SCREEN_WIDTH         200
#define GLUT_SCREEN_HEIGHT        201
#define GLUT_INIT_WINDOW_X        500
#define GLUT_INIT_WINDOW_Y        501
#define GLUT_INIT_WINDOW_WIDTH    502
#define GLUT_INIT_WINDOW_HEIGHT   503
#define GLUT_INIT_DISPLAY_MODE    504
#define GLUT_ELAPSED_TIME         700

/* Cursors (accepted, ignored) */
#define GLUT_CURSOR_RIGHT_ARROW 0
#define GLUT_CURSOR_LEFT_ARROW  1
#define GLUT_CURSOR_INFO        2
#define GLUT_CURSOR_CROSSHAIR   0x0009
#define GLUT_CURSOR_NONE        0x0065
#define GLUT_CURSOR_INHERIT     0x0064

/* Fonts (FreeGLUT values) */
#define GLUT_STROKE_ROMAN          ((void *)0x0000)
#define GLUT_STROKE_MONO_ROMAN     ((void *)0x0001)
#define GLUT_BITMAP_9_BY_15        ((void *)0x0002)
#define GLUT_BITMAP_8_BY_13        ((void *)0x0003)
#define GLUT_BITMAP_TIMES_ROMAN_10 ((void *)0x0004)
#define GLUT_BITMAP_TIMES_ROMAN_24 ((void *)0x0005)
#define GLUT_BITMAP_HELVETICA_10   ((void *)0x0006)
#define GLUT_BITMAP_HELVETICA_12   ((void *)0x0007)
#define GLUT_BITMAP_HELVETICA_18   ((void *)0x0008)

/* ---------------- Initialisation & window ---------------- */
GLCL_API(glutInit)              void glutInit(int *argcp, char **argv);
GLCL_API(glutInitDisplayMode)   void glutInitDisplayMode(unsigned int mode);
GLCL_API(glutInitWindowSize)    void glutInitWindowSize(int width, int height);
GLCL_API(glutInitWindowPosition) void glutInitWindowPosition(int x, int y);
GLCL_API(glutCreateWindow)      int  glutCreateWindow(const char *title);
GLCL_API(glutDestroyWindow)     void glutDestroyWindow(int window);
GLCL_API(glutSetWindowTitle)    void glutSetWindowTitle(const char *title);
GLCL_API(glutReshapeWindow)     void glutReshapeWindow(int width, int height);
GLCL_API(glutPositionWindow)    void glutPositionWindow(int x, int y);
GLCL_API(glutFullScreen)        void glutFullScreen(void);
GLCL_API(glutSetCursor)         void glutSetCursor(int cursor);
GLCL_API(glutGetWindow)         int  glutGetWindow(void);
GLCL_API(glutSetWindow)         void glutSetWindow(int window);

/* ---------------- Main loop ---------------- */
GLCL_API(glutMainLoop)      void glutMainLoop(void);
GLCL_API(glutLeaveMainLoop) void glutLeaveMainLoop(void);
GLCL_API(glutPostRedisplay) void glutPostRedisplay(void);
GLCL_API(glutSwapBuffers)   void glutSwapBuffers(void);

/* ---------------- Callbacks ---------------- */
GLCL_API(glutDisplayFunc)       void glutDisplayFunc(void (*func)(void));
GLCL_API(glutReshapeFunc)       void glutReshapeFunc(void (*func)(int width, int height));
GLCL_API(glutKeyboardFunc)      void glutKeyboardFunc(void (*func)(unsigned char key, int x, int y));
GLCL_API(glutKeyboardUpFunc)    void glutKeyboardUpFunc(void (*func)(unsigned char key, int x, int y));
GLCL_API(glutSpecialFunc)       void glutSpecialFunc(void (*func)(int key, int x, int y));
GLCL_API(glutSpecialUpFunc)     void glutSpecialUpFunc(void (*func)(int key, int x, int y));
GLCL_API(glutMouseFunc)         void glutMouseFunc(void (*func)(int button, int state, int x, int y));
GLCL_API(glutMotionFunc)        void glutMotionFunc(void (*func)(int x, int y));
GLCL_API(glutPassiveMotionFunc) void glutPassiveMotionFunc(void (*func)(int x, int y));
GLCL_API(glutMouseWheelFunc)    void glutMouseWheelFunc(void (*func)(int wheel, int direction, int x, int y));
GLCL_API(glutEntryFunc)         void glutEntryFunc(void (*func)(int state));
GLCL_API(glutIdleFunc)          void glutIdleFunc(void (*func)(void));
GLCL_API(glutTimerFunc)         void glutTimerFunc(unsigned int millis, void (*func)(int value), int value);
GLCL_API(glutVisibilityFunc)    void glutVisibilityFunc(void (*func)(int state));
GLCL_API(glutCloseFunc)         void glutCloseFunc(void (*func)(void));

/* ---------------- State ---------------- */
GLCL_API(glutGet)          int glutGet(GLenum query);
GLCL_API(glutGetModifiers) int glutGetModifiers(void);
GLCL_API(glutIgnoreKeyRepeat) void glutIgnoreKeyRepeat(int ignore);

/* ---------------- Menus (right-click menus in the Graphics Output panel) --- */
GLCL_API(glutCreateMenu)     int  glutCreateMenu(void (*func)(int value));
GLCL_API(glutSetMenu)        void glutSetMenu(int menu);
GLCL_API(glutGetMenu)        int  glutGetMenu(void);
GLCL_API(glutDestroyMenu)    void glutDestroyMenu(int menu);
GLCL_API(glutAddMenuEntry)   void glutAddMenuEntry(const char *label, int value);
GLCL_API(glutAddSubMenu)     void glutAddSubMenu(const char *label, int submenu);
GLCL_API(glutChangeToMenuEntry) void glutChangeToMenuEntry(int item, const char *label, int value);
GLCL_API(glutRemoveMenuItem) void glutRemoveMenuItem(int item);
GLCL_API(glutAttachMenu)     void glutAttachMenu(int button);
GLCL_API(glutDetachMenu)     void glutDetachMenu(int button);

/* ---------------- Text ---------------- */
GLCL_API(glutBitmapCharacter) void glutBitmapCharacter(void *font, int character);
GLCL_API(glutBitmapWidth)     int  glutBitmapWidth(void *font, int character);
GLCL_API(glutBitmapLength)    int  glutBitmapLength(void *font, const unsigned char *string);
GLCL_API(glutBitmapHeight)    int  glutBitmapHeight(void *font);
GLCL_API(glutBitmapString)    void glutBitmapString(void *font, const unsigned char *string);
GLCL_API(glutStrokeCharacter) void glutStrokeCharacter(void *font, int character);
GLCL_API(glutStrokeWidth)     int  glutStrokeWidth(void *font, int character);
GLCL_API(glutStrokeString)    void glutStrokeString(void *font, const unsigned char *string);

/* ---------------- Ready-made shapes ---------------- */
GLCL_API(glutWireCube)   void glutWireCube(GLdouble size);
GLCL_API(glutSolidCube)  void glutSolidCube(GLdouble size);
GLCL_API(glutWireSphere) void glutWireSphere(GLdouble radius, GLint slices, GLint stacks);
GLCL_API(glutSolidSphere) void glutSolidSphere(GLdouble radius, GLint slices, GLint stacks);
GLCL_API(glutWireCone)   void glutWireCone(GLdouble base, GLdouble height, GLint slices, GLint stacks);
GLCL_API(glutSolidCone)  void glutSolidCone(GLdouble base, GLdouble height, GLint slices, GLint stacks);
GLCL_API(glutWireTorus)  void glutWireTorus(GLdouble innerRadius, GLdouble outerRadius, GLint sides, GLint rings);
GLCL_API(glutSolidTorus) void glutSolidTorus(GLdouble innerRadius, GLdouble outerRadius, GLint sides, GLint rings);
GLCL_API(glutWireTeapot) void glutWireTeapot(GLdouble size);
GLCL_API(glutSolidTeapot) void glutSolidTeapot(GLdouble size);
GLCL_API(glutWireTetrahedron)  void glutWireTetrahedron(void);
GLCL_API(glutSolidTetrahedron) void glutSolidTetrahedron(void);
GLCL_API(glutWireOctahedron)   void glutWireOctahedron(void);
GLCL_API(glutSolidOctahedron)  void glutSolidOctahedron(void);
GLCL_API(glutWireIcosahedron)  void glutWireIcosahedron(void);
GLCL_API(glutSolidIcosahedron) void glutSolidIcosahedron(void);
GLCL_API(glutWireCylinder)  void glutWireCylinder(GLdouble radius, GLdouble height, GLint slices, GLint stacks);
GLCL_API(glutSolidCylinder) void glutSolidCylinder(GLdouble radius, GLdouble height, GLint slices, GLint stacks);

#ifdef __cplusplus
}
#endif
#endif /* __FREEGLUT_STD_H__ */
