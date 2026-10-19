/*
 * GL/glu.h — OpenGL Classroom compatibility header (GLU subset)
 */
#ifndef __glu_h__
#define __glu_h__
#include <GL/gl.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct GLUquadric GLUquadric;
typedef GLUquadric GLUquadricObj;

#define GLU_FALSE 0
#define GLU_TRUE  1
#define GLU_POINT      100010
#define GLU_LINE       100011
#define GLU_FILL       100012
#define GLU_SILHOUETTE 100013
#define GLU_SMOOTH     100000
#define GLU_FLAT       100001
#define GLU_NONE       100002
#define GLU_OUTSIDE    100020
#define GLU_INSIDE     100021

GLCL_API(gluOrtho2D)     void gluOrtho2D(GLdouble left, GLdouble right, GLdouble bottom, GLdouble top);
GLCL_API(gluPerspective) void gluPerspective(GLdouble fovy, GLdouble aspect, GLdouble zNear, GLdouble zFar);
GLCL_API(gluLookAt)      void gluLookAt(GLdouble eyeX, GLdouble eyeY, GLdouble eyeZ,
                                        GLdouble centerX, GLdouble centerY, GLdouble centerZ,
                                        GLdouble upX, GLdouble upY, GLdouble upZ);

GLCL_API(gluNewQuadric)        GLUquadric *gluNewQuadric(void);
GLCL_API(gluDeleteQuadric)     void gluDeleteQuadric(GLUquadric *q);
GLCL_API(gluQuadricDrawStyle)  void gluQuadricDrawStyle(GLUquadric *q, GLenum style);
GLCL_API(gluQuadricNormals)    void gluQuadricNormals(GLUquadric *q, GLenum normals);
GLCL_API(gluQuadricOrientation) void gluQuadricOrientation(GLUquadric *q, GLenum orientation);
GLCL_API(gluQuadricTexture)    void gluQuadricTexture(GLUquadric *q, GLboolean texture);
GLCL_API(gluSphere)   void gluSphere(GLUquadric *q, GLdouble radius, GLint slices, GLint stacks);
GLCL_API(gluCylinder) void gluCylinder(GLUquadric *q, GLdouble base, GLdouble top, GLdouble height, GLint slices, GLint stacks);
GLCL_API(gluDisk)     void gluDisk(GLUquadric *q, GLdouble inner, GLdouble outer, GLint slices, GLint loops);
GLCL_API(gluPartialDisk) void gluPartialDisk(GLUquadric *q, GLdouble inner, GLdouble outer, GLint slices, GLint loops, GLdouble start, GLdouble sweep);

static inline const GLubyte *gluErrorString(GLenum error) {
    return (const GLubyte *)(error == 0 ? "no error" : "OpenGL error");
}

#ifdef __cplusplus
}
#endif
#endif /* __glu_h__ */
