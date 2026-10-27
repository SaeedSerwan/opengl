/* windows.h — stub so that lab code written for Windows (Code::Blocks / Visual Studio)
 * compiles unchanged. Only Sleep() is provided; nothing else from the Windows API
 * exists in the browser. */
#ifndef _WINDOWS_H_STUB
#define _WINDOWS_H_STUB
#include <unistd.h>
typedef unsigned long DWORD;
typedef int BOOL;
typedef void *HANDLE;
typedef void *HWND;
typedef void *HDC;
#ifndef TRUE
#define TRUE 1
#define FALSE 0
#endif
#define WINAPI
/* Sleep(ms): waits and shows what has been drawn so far, like on Windows. */
static inline void Sleep(DWORD ms) { usleep((useconds_t)ms * 1000u); }
#endif
