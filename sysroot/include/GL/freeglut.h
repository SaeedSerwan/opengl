/* GL/freeglut.h — OpenGL Classroom: FreeGLUT API */
#ifndef __FREEGLUT_H__
#define __FREEGLUT_H__
#include <GL/freeglut_std.h>
#define GLUT_ACTION_EXIT 0
#define GLUT_ACTION_GLUTMAINLOOP_RETURNS 1
#define GLUT_ACTION_CONTINUE_EXECUTION 2
#define GLUT_ACTION_ON_WINDOW_CLOSE 0x01F9
static inline void glutSetOption(GLenum what, int value) { (void)what; (void)value; }
#endif
