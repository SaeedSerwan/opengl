/* windows.h — stub so that lab code written for Windows (Code::Blocks / Visual Studio)
 * compiles unchanged. Nothing from the Windows API is available in the browser. */
#ifndef _WINDOWS_H_STUB
#define _WINDOWS_H_STUB
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
static inline void Sleep(DWORD ms) { (void)ms; }
#endif
