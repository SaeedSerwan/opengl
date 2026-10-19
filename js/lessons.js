// Lessons for OpenGL Classroom.
// Each lesson: id, title, sub (one-line summary), objective, explain (HTML),
// exercise (HTML), mods (list of HTML strings), expected (text), code (C++).

const MAIN = (title, extraInit = '', display = 'display') => `int main(int argc, char** argv)
{
    glutInit(&argc, argv);                        // start GLUT
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);  // one colour buffer, RGB colours
    glutInitWindowSize(500, 500);                 // window size in pixels
    glutCreateWindow("${title}");                 // open the window
${extraInit}    glutDisplayFunc(${display});                    // which function draws the picture
    glutMainLoop();                               // start the program (it keeps running)
    return 0;
}`;

export const LESSONS = [
  {
    id: 'l01', group: 'Basics',
    title: 'Your First Triangle',
    sub: 'glBegin, glVertex2f, glEnd',
    objective: 'Draw a filled triangle and understand the basic structure of every OpenGL/GLUT program.',
    explain: `
<p>Every program in this course has two important parts:</p>
<ul>
  <li><code>main()</code> opens a window and tells GLUT which function draws the picture.</li>
  <li><code>display()</code> does the drawing. GLUT calls it whenever the window must be drawn.</li>
</ul>
<p>To draw a shape, write its corners (<b>vertices</b>) between <code>glBegin()</code> and <code>glEnd()</code>.
<code>GL_TRIANGLES</code> means “every 3 vertices make one triangle”.</p>
<p>By default the window goes from <b>-1</b> to <b>+1</b> in both directions, with <b>(0, 0)</b> in the centre. Turn on <b>Grid</b> and <b>Axes</b> above the picture to see this.</p>`,
    exercise: `Change the colour to <b>green</b>: <code>glColor3f(0.0f, 1.0f, 0.0f);</code> then press <b>Run</b>.`,
    mods: [
      'Move the top corner to <code>glVertex2f(0.0f, 0.9f)</code> to make the triangle taller.',
      'Make the triangle upside down by changing the y values.',
      'Remove the semicolon after <code>glEnd()</code> and press Run to see what a compiler error looks like. Then put it back.',
    ],
    expected: 'A red triangle in the middle of a black window.',
    code: `// Lesson 1: Your First Triangle
#include <GL/glut.h>

// display() draws the picture. GLUT calls it for us.
void display()
{
    glClear(GL_COLOR_BUFFER_BIT);      // clear the window (black)

    glColor3f(1.0f, 0.0f, 0.0f);       // drawing colour: red (Red, Green, Blue)

    glBegin(GL_TRIANGLES);             // start a triangle
        glVertex2f(-0.5f, -0.5f);      // bottom-left corner  (x, y)
        glVertex2f( 0.5f, -0.5f);      // bottom-right corner
        glVertex2f( 0.0f,  0.5f);      // top corner
    glEnd();                           // finish the triangle

    glFlush();                         // show the result on the screen
}

${MAIN('Lesson 1: Your First Triangle')}
`,
  },
  {
    id: 'l02', group: 'Basics',
    title: 'Drawing Points and Lines',
    sub: 'GL_POINTS, GL_LINES, GL_LINE_STRIP, GL_LINE_LOOP',
    objective: 'Draw points and the three kinds of lines, and change their size and thickness.',
    explain: `
<p>The word inside <code>glBegin(...)</code> decides what the vertices become:</p>
<ul>
  <li><code>GL_POINTS</code> — every vertex is a dot.</li>
  <li><code>GL_LINES</code> — every <b>2</b> vertices make a separate line.</li>
  <li><code>GL_LINE_STRIP</code> — the vertices are joined one after another.</li>
  <li><code>GL_LINE_LOOP</code> — like a strip, but the last vertex joins back to the first.</li>
</ul>
<p><code>glPointSize()</code> sets the dot size and <code>glLineWidth()</code> the line thickness, in pixels. Call them <i>before</i> <code>glBegin()</code>.</p>`,
    exercise: 'Add a fourth yellow point at <code>(0.0, 0.0)</code>.',
    mods: [
      'Change <code>glPointSize(10.0f)</code> to <code>20.0f</code>.',
      'Change <code>GL_LINE_LOOP</code> to <code>GL_LINE_STRIP</code> and see which side disappears.',
      'Make the green lines thicker with <code>glLineWidth(6.0f)</code>.',
    ],
    expected: 'Three white dots at the top, two green lines in the middle, a blue zig-zag and an orange closed shape at the bottom.',
    code: `// Lesson 2: Drawing Points and Lines
#include <GL/glut.h>

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    // ---- Points ----
    glPointSize(10.0f);                 // dots 10 pixels wide
    glColor3f(1.0f, 1.0f, 1.0f);        // white
    glBegin(GL_POINTS);
        glVertex2f(-0.6f, 0.7f);
        glVertex2f( 0.0f, 0.7f);
        glVertex2f( 0.6f, 0.7f);
    glEnd();

    // ---- Separate lines: every 2 vertices = 1 line ----
    glLineWidth(3.0f);                  // lines 3 pixels thick
    glColor3f(0.0f, 1.0f, 0.0f);        // green
    glBegin(GL_LINES);
        glVertex2f(-0.8f, 0.4f);  glVertex2f(-0.1f, 0.4f);   // line 1
        glVertex2f( 0.1f, 0.4f);  glVertex2f( 0.8f, 0.1f);   // line 2
    glEnd();

    // ---- Line strip: vertices joined one after another ----
    glColor3f(0.2f, 0.6f, 1.0f);        // blue
    glBegin(GL_LINE_STRIP);
        glVertex2f(-0.8f, -0.1f);
        glVertex2f(-0.6f, -0.4f);
        glVertex2f(-0.4f, -0.1f);
        glVertex2f(-0.2f, -0.4f);
    glEnd();

    // ---- Line loop: like a strip, but closed ----
    glColor3f(1.0f, 0.6f, 0.0f);        // orange
    glBegin(GL_LINE_LOOP);
        glVertex2f(0.2f, -0.2f);
        glVertex2f(0.8f, -0.2f);
        glVertex2f(0.7f, -0.7f);
        glVertex2f(0.3f, -0.7f);
    glEnd();

    glFlush();
}

${MAIN('Lesson 2: Points and Lines')}
`,
  },
  {
    id: 'l03', group: 'Basics',
    title: 'Drawing Triangles',
    sub: 'Several triangles and colour blending',
    objective: 'Draw several triangles in one glBegin/glEnd block and give each corner its own colour.',
    explain: `
<p>With <code>GL_TRIANGLES</code>, vertices 1–3 make the first triangle, 4–6 the second, and so on.</p>
<p>OpenGL remembers the <b>current colour</b>. If you call <code>glColor3f()</code> before <i>each</i> vertex, every corner gets its own colour and OpenGL smoothly blends the colours across the triangle.</p>`,
    exercise: 'Change the colour of the top corner of the rainbow triangle to white <code>(1, 1, 1)</code>.',
    mods: [
      'Add a third triangle anywhere you like (3 more <code>glVertex2f</code> lines).',
      'Add <code>glShadeModel(GL_FLAT);</code> at the start of <code>display()</code>: the blending stops and each triangle gets one colour.',
    ],
    expected: 'Two yellow triangles on the left and a large triangle on the right that blends from red to green to blue.',
    code: `// Lesson 3: Drawing Triangles
#include <GL/glut.h>

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    // Two triangles in one block: vertices 1-3 and 4-6
    glColor3f(1.0f, 0.85f, 0.0f);          // yellow
    glBegin(GL_TRIANGLES);
        glVertex2f(-0.9f, 0.1f);           // triangle 1
        glVertex2f(-0.3f, 0.1f);
        glVertex2f(-0.6f, 0.7f);

        glVertex2f(-0.9f, -0.7f);          // triangle 2
        glVertex2f(-0.3f, -0.7f);
        glVertex2f(-0.6f, -0.1f);
    glEnd();

    // One colour per corner: OpenGL blends them
    glBegin(GL_TRIANGLES);
        glColor3f(1.0f, 0.0f, 0.0f);  glVertex2f(-0.1f, -0.6f);   // red
        glColor3f(0.0f, 1.0f, 0.0f);  glVertex2f( 0.9f, -0.6f);   // green
        glColor3f(0.0f, 0.0f, 1.0f);  glVertex2f( 0.4f,  0.6f);   // blue
    glEnd();

    glFlush();
}

${MAIN('Lesson 3: Triangles')}
`,
  },
  {
    id: 'l04', group: 'Basics',
    title: 'Drawing Rectangles and Polygons',
    sub: 'glRectf, GL_QUADS, GL_POLYGON',
    objective: 'Draw rectangles and many-sided shapes, and build a simple picture (a house) from them.',
    explain: `
<p>Three ways to draw shapes with more than 3 corners:</p>
<ul>
  <li><code>glRectf(x1, y1, x2, y2)</code> — a rectangle from one corner to the opposite corner.</li>
  <li><code>GL_QUADS</code> — every <b>4</b> vertices make a four-sided shape.</li>
  <li><code>GL_POLYGON</code> — all vertices make one shape (it must be convex: no “dents”).</li>
</ul>
<p>List the corners <b>in order around the shape</b> (all clockwise or all anticlockwise), never criss-cross.</p>`,
    exercise: 'Add a yellow window: <code>glRectf(0.1f, -0.2f, 0.35f, 0.05f);</code> (set the colour first).',
    mods: [
      'Swap the order of two vertices in the GL_QUADS wall and see the shape break.',
      'Change the roof to <code>GL_POLYGON</code> with 5 vertices to make a different roof.',
    ],
    expected: 'A house: a light wall, a red triangular roof, a brown door, and a purple hexagon (sun) in the top-right corner.',
    code: `// Lesson 4: Drawing Rectangles and Polygons
#include <GL/glut.h>

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    // Wall: GL_QUADS uses 4 vertices, in order around the shape
    glColor3f(0.9f, 0.85f, 0.7f);
    glBegin(GL_QUADS);
        glVertex2f(-0.5f, -0.6f);   // bottom-left
        glVertex2f( 0.5f, -0.6f);   // bottom-right
        glVertex2f( 0.5f,  0.2f);   // top-right
        glVertex2f(-0.5f,  0.2f);   // top-left
    glEnd();

    // Roof: a triangle
    glColor3f(0.8f, 0.1f, 0.1f);
    glBegin(GL_TRIANGLES);
        glVertex2f(-0.6f, 0.2f);
        glVertex2f( 0.6f, 0.2f);
        glVertex2f( 0.0f, 0.6f);
    glEnd();

    // Door: glRectf(left, bottom, right, top)
    glColor3f(0.45f, 0.25f, 0.1f);
    glRectf(-0.15f, -0.6f, 0.05f, -0.15f);

    // Hexagon: GL_POLYGON joins all the vertices into one shape
    glColor3f(0.6f, 0.3f, 0.9f);
    glBegin(GL_POLYGON);
        glVertex2f(0.70f, 0.95f);
        glVertex2f(0.85f, 0.87f);
        glVertex2f(0.85f, 0.70f);
        glVertex2f(0.70f, 0.62f);
        glVertex2f(0.55f, 0.70f);
        glVertex2f(0.55f, 0.87f);
    glEnd();

    glFlush();
}

${MAIN('Lesson 4: Rectangles and Polygons')}
`,
  },
  {
    id: 'l05', group: 'Basics',
    title: 'Changing Colours',
    sub: 'glColor3f, glColor3ub, glClearColor',
    objective: 'Mix colours from red, green and blue, and change the background colour.',
    explain: `
<p>Screens make every colour by mixing <b>R</b>ed, <b>G</b>reen and <b>B</b>lue light.</p>
<ul>
  <li><code>glColor3f(r, g, b)</code> uses numbers from <b>0.0</b> (none) to <b>1.0</b> (full).</li>
  <li><code>glColor3ub(r, g, b)</code> uses whole numbers from <b>0</b> to <b>255</b> (like in paint programs).</li>
  <li><code>glClearColor(r, g, b, 1.0f)</code> sets the background colour used by <code>glClear()</code>.</li>
</ul>
<p>Examples: red + green = yellow, red + blue = magenta, green + blue = cyan, all three = white.</p>
<p>This program puts the background colour in an <code>init()</code> function that runs once, before drawing.</p>`,
    exercise: 'Change the background to dark blue: <code>glClearColor(0.0f, 0.0f, 0.3f, 1.0f);</code>',
    mods: [
      'Make the last square grey with <code>glColor3f(0.5f, 0.5f, 0.5f)</code>.',
      'Use <code>glColor3ub(255, 105, 180)</code> to draw a pink square.',
    ],
    expected: 'A dark grey background with eight coloured squares: red, green, blue, yellow, magenta, cyan, white and orange.',
    code: `// Lesson 5: Changing Colours
#include <GL/glut.h>

// Draw a square with its bottom-left corner at (x, y)
void square(float x, float y)
{
    glRectf(x, y, x + 0.35f, y + 0.35f);
}

void init()
{
    glClearColor(0.15f, 0.15f, 0.15f, 1.0f);   // background: dark grey
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);              // fill with the background colour

    // Top row: glColor3f uses 0.0 ... 1.0
    glColor3f(1.0f, 0.0f, 0.0f);  square(-0.85f, 0.2f);   // red
    glColor3f(0.0f, 1.0f, 0.0f);  square(-0.40f, 0.2f);   // green
    glColor3f(0.0f, 0.0f, 1.0f);  square( 0.05f, 0.2f);   // blue
    glColor3f(1.0f, 1.0f, 0.0f);  square( 0.50f, 0.2f);   // yellow = red + green

    // Bottom row: glColor3ub uses 0 ... 255
    glColor3ub(255,   0, 255);    square(-0.85f, -0.4f);  // magenta = red + blue
    glColor3ub(  0, 255, 255);    square(-0.40f, -0.4f);  // cyan = green + blue
    glColor3ub(255, 255, 255);    square( 0.05f, -0.4f);  // white = all three
    glColor3ub(255, 140,   0);    square( 0.50f, -0.4f);  // orange

    glFlush();
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(500, 500);
    glutCreateWindow("Lesson 5: Colours");
    init();                                    // our one-time setup
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
  },
  {
    id: 'l06', group: 'Basics',
    title: 'Understanding Coordinates',
    sub: 'gluOrtho2D and the coordinate system',
    objective: 'Choose your own coordinate system with gluOrtho2D and place shapes using it.',
    explain: `
<p>By default, x and y go from -1 to +1. That is awkward for pictures, so we usually choose our own range with:</p>
<p><code>gluOrtho2D(left, right, bottom, top);</code></p>
<p>Here we use <code>gluOrtho2D(0, 500, 0, 500)</code>: now <b>(0, 0)</b> is the <b>bottom-left</b> corner and <b>(500, 500)</b> is the top-right, like pixels on graph paper.</p>
<p>Turn on <b>Grid</b> and move the mouse over the picture: the bar below the picture shows the coordinates. Notice that GLUT mouse positions count y from the <b>top</b>, but OpenGL drawing counts y from the <b>bottom</b>.</p>`,
    exercise: 'Draw a white dot exactly in the centre of the window. What are its coordinates?',
    mods: [
      'Change to <code>gluOrtho2D(-250, 250, -250, 250)</code>: where is (0, 0) now? Where do the shapes go?',
      'Change to <code>gluOrtho2D(0, 1000, 0, 1000)</code>: why does everything become smaller?',
    ],
    expected: 'Four coloured squares in the four corners and a blue triangle in the middle, drawn with coordinates from 0 to 500.',
    code: `// Lesson 6: Understanding Coordinates
#include <GL/glut.h>

void init()
{
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glMatrixMode(GL_PROJECTION);       // we are setting up the "camera"
    glLoadIdentity();
    gluOrtho2D(0, 500, 0, 500);        // x: 0..500 (left->right), y: 0..500 (bottom->top)
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    // A 50 x 50 square in each corner
    glColor3f(1, 0, 0);  glRectf(  0,   0,  50,  50);   // bottom-left  (0, 0)
    glColor3f(0, 1, 0);  glRectf(450,   0, 500,  50);   // bottom-right (500, 0)
    glColor3f(1, 1, 0);  glRectf(  0, 450,  50, 500);   // top-left     (0, 500)
    glColor3f(1, 0, 1);  glRectf(450, 450, 500, 500);   // top-right    (500, 500)

    // A triangle in the middle, using the same coordinates
    glColor3f(0.2f, 0.5f, 1.0f);
    glBegin(GL_TRIANGLES);
        glVertex2i(150, 150);
        glVertex2i(350, 150);
        glVertex2i(250, 350);
    glEnd();

    glFlush();
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(500, 500);
    glutCreateWindow("Lesson 6: Coordinates");
    init();
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
  },
  {
    id: 'l07', group: 'Transformations',
    title: 'Translation',
    sub: 'glTranslatef — moving shapes',
    objective: 'Move a shape to a new position with glTranslatef, without changing its vertices.',
    explain: `
<p><b>Translation</b> means moving. <code>glTranslatef(tx, ty, 0)</code> moves everything drawn <i>after</i> it by <code>tx</code> to the right and <code>ty</code> up.</p>
<p>Transformations add up. To stop one from affecting the next shapes, surround it with <code>glPushMatrix()</code> (“remember the current position”) and <code>glPopMatrix()</code> (“go back to it”).</p>
<p>In 2D, the z value is always <code>0</code>.</p>`,
    exercise: 'Move the green square to the top-left by changing the numbers in <code>glTranslatef</code>.',
    mods: [
      'Use negative numbers to move left and down.',
      'Delete <code>glPushMatrix()</code> and <code>glPopMatrix()</code>: what happens to the blue square, and why?',
    ],
    expected: 'A grey outline square in the centre (the original), a green square moved up-right, and a blue square moved down-left.',
    code: `// Lesson 7: Translation (moving)
#include <GL/glut.h>

// A square of size 0.4 centred at (0, 0)
void drawSquare()
{
    glBegin(GL_QUADS);
        glVertex2f(-0.2f, -0.2f);
        glVertex2f( 0.2f, -0.2f);
        glVertex2f( 0.2f,  0.2f);
        glVertex2f(-0.2f,  0.2f);
    glEnd();
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();                       // start with no transformation

    // Original position (grey outline)
    glColor3f(0.5f, 0.5f, 0.5f);
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);   // draw outlines only
    drawSquare();
    glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);   // back to filled shapes

    // Moved 0.5 right and 0.4 up
    glPushMatrix();                         // remember the current transformation
        glTranslatef(0.5f, 0.4f, 0.0f);
        glColor3f(0.0f, 0.8f, 0.3f);
        drawSquare();
    glPopMatrix();                          // forget the translation

    // Moved 0.5 left and 0.5 down
    glPushMatrix();
        glTranslatef(-0.5f, -0.5f, 0.0f);
        glColor3f(0.2f, 0.4f, 1.0f);
        drawSquare();
    glPopMatrix();

    glFlush();
}

${MAIN('Lesson 7: Translation')}
`,
  },
  {
    id: 'l08', group: 'Transformations',
    title: 'Rotation',
    sub: 'glRotatef — turning shapes',
    objective: 'Rotate a shape around the origin and around its own centre.',
    explain: `
<p><code>glRotatef(angle, 0, 0, 1)</code> turns everything drawn after it by <code>angle</code> <b>degrees</b>, anticlockwise, around the point (0, 0). The <code>0, 0, 1</code> is the z axis, the axis we turn around in 2D.</p>
<p>A shape always rotates around <b>(0, 0)</b>. To spin a shape around its own centre, first move it to where you want it, then rotate (in code: <code>glTranslatef</code> <i>then</i> <code>glRotatef</code>).</p>`,
    exercise: 'Change the angle of the orange triangle to <code>90</code> degrees.',
    mods: [
      'Try a negative angle: which way does it turn now?',
      'Try <code>glRotatef(45, 0, 0, 0)</code> and read the warning in the Output panel.',
    ],
    expected: 'A grey outline triangle in the centre, an orange copy turned 45° around the centre, and a cyan square on the right that is turned around its own centre.',
    code: `// Lesson 8: Rotation (turning)
#include <GL/glut.h>

void drawTriangle()
{
    glBegin(GL_TRIANGLES);
        glVertex2f(0.0f, 0.0f);
        glVertex2f(0.5f, 0.0f);
        glVertex2f(0.0f, 0.3f);
    glEnd();
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    // Original (grey outline)
    glColor3f(0.5f, 0.5f, 0.5f);
    glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
    drawTriangle();
    glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);

    // Rotated 45 degrees anticlockwise around (0, 0)
    glPushMatrix();
        glRotatef(45.0f, 0.0f, 0.0f, 1.0f);    // angle, then the axis (z)
        glColor3f(1.0f, 0.5f, 0.0f);
        drawTriangle();
    glPopMatrix();

    // A square rotated around its OWN centre: move first, then rotate
    glPushMatrix();
        glTranslatef(0.6f, -0.5f, 0.0f);       // 2) ...then put it here
        glRotatef(30.0f, 0.0f, 0.0f, 1.0f);    // 1) turn it while it is at (0, 0)...
        glColor3f(0.0f, 0.8f, 0.9f);
        glRectf(-0.15f, -0.15f, 0.15f, 0.15f);
    glPopMatrix();

    glFlush();
}

${MAIN('Lesson 8: Rotation')}
`,
  },
  {
    id: 'l09', group: 'Transformations',
    title: 'Scaling',
    sub: 'glScalef — resizing shapes',
    objective: 'Make shapes bigger, smaller, stretched or mirrored with glScalef.',
    explain: `
<p><code>glScalef(sx, sy, 1)</code> multiplies every x by <code>sx</code> and every y by <code>sy</code>.</p>
<ul>
  <li><code>2</code> = twice as big, <code>0.5</code> = half size, <code>1</code> = no change.</li>
  <li>Different values for x and y stretch the shape.</li>
  <li>A <b>negative</b> value mirrors (flips) the shape.</li>
</ul>
<p>Scaling also happens around <b>(0, 0)</b>: a shape that is not at the origin also moves when it is scaled.</p>`,
    exercise: 'Make the green copy three times as tall: <code>glScalef(1.0f, 3.0f, 1.0f)</code>.',
    mods: [
      'Use <code>glScalef(-1.0f, 1.0f, 1.0f)</code> to mirror the house left-to-right.',
      'What happens with <code>glScalef(0, 0, 1)</code>?',
    ],
    expected: 'A small white “house” arrow in the centre, a big blue copy (×2), a stretched green copy and a red mirrored copy upside-down.',
    code: `// Lesson 9: Scaling (resizing)
#include <GL/glut.h>

// A small house-shaped arrow pointing up, around (0, 0)
void drawHouse()
{
    glBegin(GL_POLYGON);
        glVertex2f(-0.1f, -0.1f);
        glVertex2f( 0.1f, -0.1f);
        glVertex2f( 0.1f,  0.05f);
        glVertex2f( 0.0f,  0.15f);
        glVertex2f(-0.1f,  0.05f);
    glEnd();
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    glColor3f(1, 1, 1);                       // original size
    drawHouse();

    glPushMatrix();                           // twice as big, on the left
        glTranslatef(-0.55f, 0.4f, 0.0f);
        glScalef(2.0f, 2.0f, 1.0f);
        glColor3f(0.3f, 0.5f, 1.0f);
        drawHouse();
    glPopMatrix();

    glPushMatrix();                           // stretched: 3x wide, 1x tall
        glTranslatef(0.5f, 0.45f, 0.0f);
        glScalef(3.0f, 1.0f, 1.0f);
        glColor3f(0.2f, 0.9f, 0.3f);
        drawHouse();
    glPopMatrix();

    glPushMatrix();                           // mirrored upside-down (negative y)
        glTranslatef(0.0f, -0.55f, 0.0f);
        glScalef(1.5f, -1.5f, 1.0f);
        glColor3f(1.0f, 0.3f, 0.3f);
        drawHouse();
    glPopMatrix();

    glFlush();
}

${MAIN('Lesson 9: Scaling')}
`,
  },
  {
    id: 'l10', group: 'Transformations',
    title: 'Combining Transformations',
    sub: 'Order matters: translate × rotate × scale',
    objective: 'Combine translation, rotation and scaling, and see why the order of the calls matters.',
    explain: `
<p>Transformations can be combined. OpenGL applies them to the shape in the <b>reverse</b> order of the code: the call written <b>closest to the drawing</b> happens <b>first</b>.</p>
<p>So this code:</p>
<pre><code>glTranslatef(0.5, 0, 0);
glRotatef(45, 0, 0, 1);
drawSquare();</code></pre>
<p>first rotates the square (around its centre), then moves it. Swapping the two lines gives a different result: the square is moved first and then swings around (0, 0).</p>
<p>A common recipe is: <b>Translate → Rotate → Scale → draw</b>.</p>`,
    exercise: 'In the red block, swap the <code>glTranslatef</code> and <code>glRotatef</code> lines. Does it now match the green square?',
    mods: [
      'Add <code>glScalef(1.5f, 0.5f, 1.0f)</code> just before <code>drawSquare()</code> in the green block.',
      'Change both angles to 90 and compare the two squares again.',
    ],
    expected: 'A green square tilted 45° on the right of the x axis, and a red square that was moved first and then swung up around (0, 0).',
    code: `// Lesson 10: Combining Transformations
#include <GL/glut.h>

void drawSquare()
{
    glRectf(-0.15f, -0.15f, 0.15f, 0.15f);
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    // Order 1: translate, then rotate  -> rotate the square first, then move it
    glPushMatrix();
        glTranslatef(0.6f, 0.0f, 0.0f);
        glRotatef(45.0f, 0.0f, 0.0f, 1.0f);
        glColor3f(0.2f, 0.85f, 0.3f);          // green
        drawSquare();
    glPopMatrix();

    // Order 2: rotate, then translate  -> move the square first, then swing it around (0, 0)
    glPushMatrix();
        glRotatef(45.0f, 0.0f, 0.0f, 1.0f);
        glTranslatef(0.6f, 0.0f, 0.0f);
        glColor3f(0.95f, 0.25f, 0.25f);        // red
        drawSquare();
    glPopMatrix();

    // The origin (0, 0) as a white dot
    glPointSize(6.0f);
    glColor3f(1, 1, 1);
    glBegin(GL_POINTS);
        glVertex2f(0.0f, 0.0f);
    glEnd();

    glFlush();
}

${MAIN('Lesson 10: Combining Transformations')}
`,
  },
  {
    id: 'l11', group: 'Putting it together',
    title: 'Drawing Multiple Objects',
    sub: 'Functions, loops and a whole scene',
    objective: 'Build a scene from re-usable functions (a circle, a tree) and draw many objects with a loop.',
    explain: `
<p>Real pictures are made of many objects. Write a <b>function</b> for each kind of object, then call it with different positions.</p>
<p>A circle is drawn as a <code>GL_TRIANGLE_FAN</code>: a centre point plus many points around the edge, calculated with <code>cos</code> and <code>sin</code> from <code>&lt;cmath&gt;</code>.</p>
<p>A <code>for</code> loop draws several trees with one piece of code.</p>`,
    exercise: 'Add a fourth tree by changing the loop to <code>i &lt; 4</code>.',
    mods: [
      'Make the sun bigger by changing its radius.',
      'Change <code>segments</code> in <code>drawCircle</code> to 6: what shape do you get?',
      'Write a <code>drawCloud()</code> function made of three white circles.',
    ],
    expected: 'A sky-blue scene with a yellow sun, green ground and three trees with brown trunks and green round tops.',
    code: `// Lesson 11: Drawing Multiple Objects
#include <GL/glut.h>
#include <cmath>

// A filled circle with centre (cx, cy) and radius r
void drawCircle(float cx, float cy, float r)
{
    const int segments = 40;
    glBegin(GL_TRIANGLE_FAN);
        glVertex2f(cx, cy);                              // centre
        for (int i = 0; i <= segments; i++) {
            float angle = 2.0f * 3.14159265f * i / segments;
            glVertex2f(cx + r * cos(angle), cy + r * sin(angle));
        }
    glEnd();
}

// A tree whose trunk starts at (x, y)
void drawTree(float x, float y)
{
    glColor3f(0.45f, 0.28f, 0.1f);          // brown trunk
    glRectf(x - 10, y, x + 10, y + 60);
    glColor3f(0.1f, 0.6f, 0.2f);            // green leaves
    drawCircle(x, y + 85, 40);
}

void init()
{
    glClearColor(0.55f, 0.8f, 1.0f, 1.0f);  // sky blue
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluOrtho2D(0, 500, 0, 500);
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    glColor3f(1.0f, 0.85f, 0.1f);           // sun
    drawCircle(400, 420, 45);

    glColor3f(0.3f, 0.75f, 0.3f);           // ground
    glRectf(0, 0, 500, 150);

    for (int i = 0; i < 3; i++) {           // three trees
        drawTree(90 + i * 140, 120);
    }

    glFlush();
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(500, 500);
    glutCreateWindow("Lesson 11: A Scene");
    init();
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
  },
  {
    id: 'l12', group: 'Putting it together',
    title: 'Simple Animation',
    sub: 'glutTimerFunc, glutPostRedisplay, double buffering',
    objective: 'Animate a scene by changing a variable a little every few milliseconds and redrawing.',
    explain: `
<p>An animation is many pictures shown quickly. The recipe:</p>
<ol>
  <li>Keep the changing value (here <code>angle</code>) in a <b>global variable</b>.</li>
  <li>Use it when drawing, e.g. <code>glRotatef(angle, 0, 0, 1)</code>.</li>
  <li>A <b>timer function</b> changes it a little, asks for a redraw with <code>glutPostRedisplay()</code>, and sets the timer again.</li>
</ol>
<p><code>GLUT_DOUBLE</code> + <code>glutSwapBuffers()</code> (instead of <code>glFlush()</code>) draws each picture off-screen first so the animation does not flicker.</p>
<p>Click the picture, then press <b>space</b> to pause and <b>+</b> / <b>-</b> to change the speed. Use <b>Stop</b> to end the program.</p>`,
    exercise: 'Make the square spin the other way (hint: subtract instead of add).',
    mods: [
      'Change the timer from 16 ms to 100 ms. What happens to the smoothness?',
      'Make the ball bounce higher by changing <code>0.6f</code>.',
      'Add a second square that spins twice as fast.',
    ],
    expected: 'An orange square spinning in the centre and a small white ball bouncing up and down on the left.',
    code: `// Lesson 12: Simple Animation
#include <GL/glut.h>
#include <cmath>

float angle = 0.0f;     // rotation of the square (degrees)
float t     = 0.0f;     // time, used for the bouncing ball
float speed = 2.0f;     // degrees per frame
bool  paused = false;

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    // Spinning square
    glPushMatrix();
        glRotatef(angle, 0.0f, 0.0f, 1.0f);
        glColor3f(1.0f, 0.55f, 0.1f);
        glRectf(-0.25f, -0.25f, 0.25f, 0.25f);
    glPopMatrix();

    // Bouncing ball (a big round point)
    float y = -0.6f + 0.6f * fabs(sin(t));
    glEnable(GL_POINT_SMOOTH);
    glPointSize(24.0f);
    glColor3f(1, 1, 1);
    glBegin(GL_POINTS);
        glVertex2f(-0.7f, y);
    glEnd();

    glutSwapBuffers();          // show the finished picture (double buffering)
}

// Called every 16 ms (about 60 times per second)
void timer(int value)
{
    if (!paused) {
        angle += speed;
        if (angle >= 360.0f) angle -= 360.0f;
        t += 0.05f;
    }
    glutPostRedisplay();        // ask GLUT to call display() again
    glutTimerFunc(16, timer, 0);// run timer() again in 16 ms
}

void keyboard(unsigned char key, int x, int y)
{
    if (key == ' ') paused = !paused;
    if (key == '+') speed += 1.0f;
    if (key == '-') speed -= 1.0f;
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB);   // DOUBLE for smooth animation
    glutInitWindowSize(500, 500);
    glutCreateWindow("Lesson 12: Animation");
    glutDisplayFunc(display);
    glutKeyboardFunc(keyboard);
    glutTimerFunc(16, timer, 0);                   // start the timer
    glutMainLoop();
    return 0;
}
`,
  },
  // ------------------------------------------------------------------ extras
  {
    id: 'x01', group: 'Extra',
    title: 'Keyboard and Mouse',
    sub: 'glutKeyboardFunc, glutSpecialFunc, glutMouseFunc',
    objective: 'React to the keyboard and mouse: move a shape with the arrow keys and add points by clicking.',
    explain: `
<p>GLUT calls your functions when the user does something:</p>
<ul>
  <li><code>glutKeyboardFunc(f)</code> — normal keys (letters, numbers, space…).</li>
  <li><code>glutSpecialFunc(f)</code> — arrow keys and F1–F12.</li>
  <li><code>glutMouseFunc(f)</code> — mouse button pressed or released.</li>
</ul>
<p>GLUT gives mouse positions in <b>window pixels</b> with y counted <b>from the top</b>, so we flip it: <code>500 - y</code>.</p>
<p><b>Click the picture first</b> so that it receives the keyboard.</p>`,
    exercise: 'Make the <b>c</b> key clear all the points (hint: set <code>count = 0</code>).',
    mods: [
      'Make each arrow press move the square 20 pixels instead of 10.',
      'Change the colour of the square when the <b>r</b>, <b>g</b> or <b>b</b> key is pressed.',
    ],
    expected: 'A blue square that moves with the arrow keys; every left-click adds a yellow dot where you clicked.',
    code: `// Extra: Keyboard and Mouse
#include <GL/glut.h>
#include <cstdio>

float sx = 250, sy = 250;          // square position
int   px[100], py[100];            // clicked points
int   count = 0;

void init()
{
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluOrtho2D(0, 500, 0, 500);     // 1 unit = 1 pixel, (0,0) bottom-left
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    glColor3f(0.2f, 0.5f, 1.0f);
    glRectf(sx - 25, sy - 25, sx + 25, sy + 25);

    glPointSize(8.0f);
    glColor3f(1.0f, 0.9f, 0.1f);
    glBegin(GL_POINTS);
        for (int i = 0; i < count; i++) glVertex2i(px[i], py[i]);
    glEnd();

    glFlush();
}

void special(int key, int x, int y)          // arrow keys
{
    if (key == GLUT_KEY_LEFT)  sx -= 10;
    if (key == GLUT_KEY_RIGHT) sx += 10;
    if (key == GLUT_KEY_UP)    sy += 10;
    if (key == GLUT_KEY_DOWN)  sy -= 10;
    glutPostRedisplay();
}

void keyboard(unsigned char key, int x, int y)
{
    printf("You pressed '%c'\\n", key);
}

void mouse(int button, int state, int x, int y)
{
    if (button == GLUT_LEFT_BUTTON && state == GLUT_DOWN && count < 100) {
        px[count] = x;
        py[count] = 500 - y;                 // flip y: GLUT counts from the top
        count++;
        printf("Point %d at (%d, %d)\\n", count, x, 500 - y);
        glutPostRedisplay();
    }
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(500, 500);
    glutCreateWindow("Keyboard and Mouse");
    init();
    glutDisplayFunc(display);
    glutSpecialFunc(special);
    glutKeyboardFunc(keyboard);
    glutMouseFunc(mouse);
    glutMainLoop();
    return 0;
}
`,
  },
  {
    id: 'x02', group: 'Extra',
    title: 'Text on the Screen',
    sub: 'glRasterPos2f, glutBitmapCharacter',
    objective: 'Write text in the graphics window, for labels and scores.',
    explain: `
<p>To write text: set the colour, choose the start position with <code>glRasterPos2f(x, y)</code>, then draw the characters one by one with <code>glutBitmapCharacter(font, c)</code>.</p>
<p>Fonts include <code>GLUT_BITMAP_HELVETICA_18</code>, <code>GLUT_BITMAP_TIMES_ROMAN_24</code> and <code>GLUT_BITMAP_9_BY_15</code>.</p>`,
    exercise: 'Write your own name under the title.',
    mods: [
      'Change the font to <code>GLUT_BITMAP_TIMES_ROMAN_24</code>.',
      'Show a number: use <code>sprintf(buffer, "Score: %d", score)</code> and print the buffer.',
    ],
    expected: 'A white title “Hello, OpenGL!” near the top, a yellow label under a green rectangle, and a small grey line of text at the bottom.',
    code: `// Extra: Text on the Screen
#include <GL/glut.h>

// Write a string starting at (x, y)
void drawText(float x, float y, void* font, const char* text)
{
    glRasterPos2f(x, y);
    for (const char* c = text; *c != '\\0'; c++) {
        glutBitmapCharacter(font, *c);
    }
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    glColor3f(1, 1, 1);
    drawText(-0.45f, 0.7f, GLUT_BITMAP_TIMES_ROMAN_24, "Hello, OpenGL!");

    glColor3f(0.2f, 0.8f, 0.3f);
    glRectf(-0.5f, -0.2f, 0.5f, 0.3f);
    glColor3f(1, 1, 0);
    drawText(-0.25f, -0.35f, GLUT_BITMAP_HELVETICA_18, "A green rectangle");

    glColor3f(0.6f, 0.6f, 0.6f);
    drawText(-0.9f, -0.9f, GLUT_BITMAP_9_BY_15, "glutBitmapCharacter()");

    glFlush();
}

${MAIN('Text on the Screen')}
`,
  },
  {
    id: 'x03', group: 'Extra',
    title: '3D Shapes and Lighting',
    sub: 'gluPerspective, depth test, glutSolidTeapot',
    objective: 'Look at 3D objects through a perspective camera with simple lighting.',
    explain: `
<p>For 3D we need three new things:</p>
<ul>
  <li>A <b>perspective camera</b>: <code>gluPerspective(fov, aspect, near, far)</code> and <code>gluLookAt(eye, centre, up)</code>.</li>
  <li>The <b>depth test</b> (<code>glEnable(GL_DEPTH_TEST)</code>) so that near objects hide far ones. Clear the depth buffer every frame too.</li>
  <li><b>Lighting</b> (<code>GL_LIGHTING</code>, <code>GL_LIGHT0</code>) so solid objects look round.</li>
</ul>
<p>GLUT has ready-made shapes: <code>glutSolidTeapot</code>, <code>glutSolidSphere</code>, <code>glutWireCube</code>, <code>glutSolidTorus</code>…</p>`,
    exercise: 'Replace the teapot with <code>glutSolidTorus(0.3, 0.7, 20, 40);</code>',
    mods: [
      'Change the camera position in <code>gluLookAt</code> (the first three numbers).',
      'Turn off lighting with <code>glDisable(GL_LIGHTING)</code> and see why it is needed.',
    ],
    expected: 'A slowly rotating, lit orange teapot with a white wireframe cube around it.',
    code: `// Extra: 3D Shapes and Lighting
#include <GL/glut.h>

float angle = 0;

void init()
{
    glClearColor(0.08f, 0.09f, 0.12f, 1.0f);
    glEnable(GL_DEPTH_TEST);            // near objects hide far objects
    glEnable(GL_LIGHTING);              // use lights
    glEnable(GL_LIGHT0);                // switch on light number 0
    glEnable(GL_COLOR_MATERIAL);        // glColor sets the material colour

    GLfloat lightPos[] = { 2.0f, 3.0f, 4.0f, 1.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, lightPos);

    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(45.0, 1.0, 0.1, 100.0);   // field of view, aspect, near, far
}

void display()
{
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(0, 1.5, 5,   0, 0, 0,   0, 1, 0);   // eye, look at, up

    glRotatef(angle, 0, 1, 0);          // spin around the y axis

    glColor3f(1.0f, 0.5f, 0.1f);
    glutSolidTeapot(1.0);

    glDisable(GL_LIGHTING);             // the wire cube is not lit
    glColor3f(1, 1, 1);
    glutWireCube(2.6);
    glEnable(GL_LIGHTING);

    glutSwapBuffers();
}

void timer(int v)
{
    angle += 1.0f;
    glutPostRedisplay();
    glutTimerFunc(16, timer, 0);
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH);
    glutInitWindowSize(500, 500);
    glutCreateWindow("3D Shapes and Lighting");
    init();
    glutDisplayFunc(display);
    glutTimerFunc(16, timer, 0);
    glutMainLoop();
    return 0;
}
`,
  },
];

export const BLANK = {
  id: 'blank', group: 'Free play',
  title: 'Blank Program',
  code: `#include <GL/glut.h>

void display()
{
    glClear(GL_COLOR_BUFFER_BIT);

    // Your drawing code here

    glFlush();
}

int main(int argc, char** argv)
{
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(500, 500);
    glutCreateWindow("My Program");
    glutDisplayFunc(display);
    glutMainLoop();
    return 0;
}
`,
};

export const REFERENCE = `
<div class="ref">
<p>Quick reference for the functions used in the lessons. Everything listed here works in OpenGL Classroom.</p>
<h3>Program structure</h3>
<table>
<tr><td>glutInit(&amp;argc, argv)</td><td>Start GLUT (first line of main)</td></tr>
<tr><td>glutInitDisplayMode(m)</td><td>GLUT_SINGLE or GLUT_DOUBLE, | GLUT_RGB, | GLUT_DEPTH</td></tr>
<tr><td>glutInitWindowSize(w, h)</td><td>Window size in pixels</td></tr>
<tr><td>glutCreateWindow("title")</td><td>Open the window</td></tr>
<tr><td>glutDisplayFunc(f)</td><td>f() draws the picture</td></tr>
<tr><td>glutMainLoop()</td><td>Start the program; never returns</td></tr>
</table>
<h3>Drawing</h3>
<table>
<tr><td>glClearColor(r,g,b,a)</td><td>Background colour</td></tr>
<tr><td>glClear(GL_COLOR_BUFFER_BIT)</td><td>Fill the window with the background</td></tr>
<tr><td>glColor3f(r, g, b)</td><td>Drawing colour, 0.0 – 1.0</td></tr>
<tr><td>glColor3ub(r, g, b)</td><td>Drawing colour, 0 – 255</td></tr>
<tr><td>glBegin(mode) … glEnd()</td><td>Draw a shape from vertices</td></tr>
<tr><td>glVertex2f(x, y)</td><td>One corner (vertex)</td></tr>
<tr><td>glRectf(x1,y1,x2,y2)</td><td>Filled rectangle</td></tr>
<tr><td>glPointSize(s)</td><td>Point size (pixels)</td></tr>
<tr><td>glLineWidth(w)</td><td>Line thickness (pixels)</td></tr>
<tr><td>glFlush() / glutSwapBuffers()</td><td>Show the picture (single / double buffering)</td></tr>
</table>
<h3>glBegin modes</h3>
<table>
<tr><td>GL_POINTS</td><td>Each vertex is a dot</td></tr>
<tr><td>GL_LINES</td><td>Each 2 vertices: a line</td></tr>
<tr><td>GL_LINE_STRIP</td><td>Joined lines</td></tr>
<tr><td>GL_LINE_LOOP</td><td>Joined lines, closed</td></tr>
<tr><td>GL_TRIANGLES</td><td>Each 3 vertices: a triangle</td></tr>
<tr><td>GL_TRIANGLE_STRIP / FAN</td><td>Connected triangles</td></tr>
<tr><td>GL_QUADS</td><td>Each 4 vertices: a quad</td></tr>
<tr><td>GL_POLYGON</td><td>All vertices: one convex shape</td></tr>
</table>
<h3>Coordinates &amp; transformations</h3>
<table>
<tr><td>glMatrixMode(GL_PROJECTION)</td><td>Set up the camera</td></tr>
<tr><td>gluOrtho2D(l, r, b, t)</td><td>2D coordinate range</td></tr>
<tr><td>glMatrixMode(GL_MODELVIEW)</td><td>Move/turn/resize objects</td></tr>
<tr><td>glLoadIdentity()</td><td>Reset the current matrix</td></tr>
<tr><td>glTranslatef(x, y, 0)</td><td>Move</td></tr>
<tr><td>glRotatef(deg, 0, 0, 1)</td><td>Turn anticlockwise (2D)</td></tr>
<tr><td>glScalef(sx, sy, 1)</td><td>Resize</td></tr>
<tr><td>glPushMatrix() / glPopMatrix()</td><td>Save / restore the transformation</td></tr>
</table>
<h3>Interaction &amp; animation</h3>
<table>
<tr><td>glutKeyboardFunc(f)</td><td>f(unsigned char key, int x, int y)</td></tr>
<tr><td>glutSpecialFunc(f)</td><td>f(int key, int x, int y) — GLUT_KEY_LEFT …</td></tr>
<tr><td>glutMouseFunc(f)</td><td>f(int button, int state, int x, int y)</td></tr>
<tr><td>glutTimerFunc(ms, f, v)</td><td>Call f(v) after ms milliseconds</td></tr>
<tr><td>glutIdleFunc(f)</td><td>Call f() continuously</td></tr>
<tr><td>glutPostRedisplay()</td><td>Ask for display() to run again</td></tr>
</table>
<h3>Keyboard shortcuts</h3>
<table>
<tr><td>Ctrl+Enter / F5</td><td>Run</td></tr>
<tr><td>Ctrl+S</td><td>Download your code</td></tr>
<tr><td>Ctrl+/</td><td>Comment / uncomment lines</td></tr>
<tr><td>Ctrl+Z</td><td>Undo (also after Reset)</td></tr>
</table>
<p>The full list of supported and unsupported functions is in the project's COMPATIBILITY.md.</p>
</div>`;
