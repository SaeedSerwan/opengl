/* GL/glew.h — stub. GLEW is not needed in OpenGL Classroom; glewInit() always succeeds. */
#ifndef __glew_h__
#define __glew_h__
#include <GL/gl.h>
#define GLEW_OK 0
#define GLEW_VERSION_1_1 1
static unsigned char glewExperimental = 0;
static inline unsigned int glewInit(void) { return GLEW_OK; }
static inline const unsigned char *glewGetErrorString(unsigned int e) { (void)e; return (const unsigned char *)"No error"; }
#endif
