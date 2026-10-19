// Beginner-friendly explanations for common Clang error messages.
const GL_NAME = /^(gl|glu|glut)[A-Z]|^(GL|GLU|GLUT)_/;

const RULES = [
  [/expected ';'/, () => 'A semicolon <code>;</code> is missing. In C++ every statement ends with <code>;</code> — look at the end of this line or the line just before it.'],
  [/use of undeclared identifier '([^']+)'/, (m) => GL_NAME.test(m[1])
    ? `<code>${m[1]}</code> is not a known OpenGL/GLUT name. Check the spelling and the capital letters (for example <code>glVertex2f</code>, <code>GL_TRIANGLES</code>), and that <code>#include &lt;GL/glut.h&gt;</code> is at the top.`
    : `<code>${m[1]}</code> has not been declared. Check the spelling (C++ is case-sensitive), or declare the variable / function before this line.`],
  [/unknown type name '([^']+)'/, (m) => `<code>${m[1]}</code> is not a type C++ knows. Check the spelling, or a missing <code>#include</code>.`],
  [/'([^']+)' file not found/, (m) => `The header <code>${m[1]}</code> is not available here. You can use <code>&lt;GL/glut.h&gt;</code>, <code>&lt;GL/gl.h&gt;</code>, <code>&lt;GL/glu.h&gt;</code>, <code>&lt;GL/freeglut.h&gt;</code> and the standard C++ headers (<code>&lt;cmath&gt;</code>, <code>&lt;cstdio&gt;</code>, <code>&lt;iostream&gt;</code>, …). Windows-only headers such as <code>&lt;conio.h&gt;</code> do not exist in the browser.`],
  [/no matching function for call to '([^']+)'/, (m) => `<code>${m[1]}</code> was called with the wrong number or wrong types of values. Compare your call with the function's definition.`],
  [/too (few|many) arguments to function call/, (m) => `You gave ${m[1] === 'few' ? 'too few' : 'too many'} values to this function. For example <code>glVertex2f</code> needs 2 numbers, <code>glVertex3f</code> needs 3, <code>glColor3f</code> needs 3.`],
  [/expected '\}'|extraneous closing brace|expected unqualified-id/, () => 'The curly braces <code>{ }</code> do not match. Every <code>{</code> needs a matching <code>}</code>. Tip: the editor highlights the matching brace when the cursor is next to one.'],
  [/expected '\)'/, () => 'A closing bracket <code>)</code> is missing.'],
  [/expected expression/, () => 'Something is missing or extra here — often an extra comma, a missing value, or a bracket in the wrong place.'],
  [/'main' must return 'int'/, () => 'Use <code>int main()</code> instead of <code>void main()</code>, and end it with <code>return 0;</code>.'],
  [/redefinition of '([^']+)'/, (m) => `<code>${m[1]}</code> is defined twice. Rename one of them or delete the copy.`],
  [/non-void function does not return a value|control reaches end of non-void function/, () => 'This function promises to return a value but can reach its end without <code>return</code>. Add a <code>return</code> statement (or make the function <code>void</code>).'],
  [/missing terminating '?"'? character|missing terminating/, () => 'A text string is not closed. Every <code>"</code> needs a matching <code>"</code> on the same line.'],
  [/undefined symbol: (.+)$/, (m) => `<code>${m[1].trim()}</code> is declared but its code was never written (or the name is misspelled where it is defined). If it is an OpenGL function, it may not be supported here — see COMPATIBILITY.md.`],
  [/cannot initialize|cannot convert|incompatible/, () => 'The value has the wrong type for where it is used (for example a text string where a number is expected).'],
  [/implicit conversion .* changes value/, () => 'A decimal number is being stored in a whole-number type, so the part after the decimal point is lost. Use <code>float</code> instead of <code>int</code>.'],
  [/variable '([^']+)' is uninitialized|is used uninitialized/, (m) => `<code>${m[1] || 'This variable'}</code> is used before it is given a value. Give it a starting value, e.g. <code>float x = 0;</code>`],
  [/using the result of an assignment as a condition/, () => 'Did you mean <code>==</code> (compare) instead of <code>=</code> (assign)?'],
  [/format specifies type/, () => 'The <code>printf</code> format does not match the value: use <code>%d</code> for <code>int</code> and <code>%f</code> for <code>float</code>/<code>double</code>.'],
];

export function hintFor(diag) {
  for (const [re, fn] of RULES) {
    const m = diag.msg.match(re);
    if (m) return fn(m);
  }
  return '';
}
