#include <GL/glut.h>
#include <cstdio>
#include <cstring>
GLuint list;
GLUquadric* q;
void menu(int v) { printf("menu %d\n", v); }
void display() {
    glClearColor(0.1f, 0.1f, 0.1f, 1);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_PROJECTION); glLoadIdentity(); glOrtho(-2, 2, -2, 2, -5, 5);
    glMatrixMode(GL_MODELVIEW); glLoadIdentity();
    glPushAttrib(GL_ALL_ATTRIB_BITS);
    glLineWidth(5); glEnable(GL_LINE_STIPPLE); glLineStipple(2, 0x00FF);
    glColor3f(1, 1, 0);
    glBegin(GL_LINES); glVertex2f(-1.8f, 1.8f); glVertex2f(1.8f, 1.8f); glEnd();
    glPopAttrib();
    glCallList(list);
    glPushMatrix(); glTranslatef(1, -1, 0); gluQuadricDrawStyle(q, GLU_LINE); gluSphere(q, 0.5, 12, 8); glPopMatrix();
    glPushMatrix(); glTranslatef(-1, -1, 0); gluDisk(q, 0.2, 0.5, 20, 2); glPopMatrix();
    GLfloat m[16]; glGetFloatv(GL_MODELVIEW_MATRIX, m);
    glLoadMatrixf(m);
    glColor3f(1, 1, 1);
    glRasterPos2f(-1.9f, 1.5f);
    glutBitmapString(GLUT_BITMAP_HELVETICA_12, (const unsigned char*)"bitmap string\nsecond line");
    glPushMatrix(); glTranslatef(-1.5f, 0.6f, 0); glScalef(0.003f, 0.003f, 1); glutStrokeString(GLUT_STROKE_ROMAN, (const unsigned char*)"Stroke"); glPopMatrix();
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE); glRectf(0.5f, 0.5f, 1.5f, 1.2f); glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);
    glEnable(GL_POINT_SMOOTH); glPointSize(15); glBegin(GL_POINTS); glColor3f(0, 1, 1); glVertex2f(0, 0); glEnd();
    glEnable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glColor4f(1, 0, 0, 0.5f); glRectf(-0.3f, -0.3f, 0.3f, 0.3f); glDisable(GL_BLEND);
    glShadeModel(GL_FLAT);
    glBegin(GL_QUAD_STRIP); glColor3f(1,0,0); glVertex2f(-1.9f,-1.9f); glVertex2f(-1.9f,-1.6f); glColor3f(0,1,0); glVertex2f(-1.5f,-1.9f); glVertex2f(-1.5f,-1.6f); glColor3f(0,0,1); glVertex2f(-1.1f,-1.9f); glVertex2f(-1.1f,-1.6f); glEnd();
    glShadeModel(GL_SMOOTH);
    if (glGetError() != GL_NO_ERROR) printf("gl error\n");
    printf("w=%d h=%d t>=0:%d\n", glutGet(GLUT_WINDOW_WIDTH), glutGet(GLUT_WINDOW_HEIGHT), glutGet(GLUT_ELAPSED_TIME) >= 0);
    glutSwapBuffers();
}
void reshape(int w, int h) { glViewport(0, 0, w, h); printf("reshape %d %d\n", w, h); }
int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH);
    glutInitWindowSize(600, 400);
    glutCreateWindow("Kitchen sink");
    list = glGenLists(1);
    glNewList(list, GL_COMPILE);
      glColor3f(0.2f, 0.8f, 0.2f);
      glBegin(GL_TRIANGLES); glVertex2f(-1.5f, 0); glVertex2f(-0.5f, 0); glVertex2f(-1, 1); glEnd();
      glPushMatrix(); glTranslatef(1, 0.2f, 0); glColor3f(0.9f, 0.4f, 0.1f); glutWireTorus(0.1, 0.3, 8, 16); glPopMatrix();
    glEndList();
    q = gluNewQuadric();
    int sub = glutCreateMenu(menu); glutAddMenuEntry("Sub A", 11);
    glutCreateMenu(menu); glutAddMenuEntry("Red", 1); glutAddMenuEntry("Green", 2); glutAddSubMenu("More", sub);
    glutAttachMenu(GLUT_RIGHT_BUTTON);
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutMainLoop();
    return 0;
}
