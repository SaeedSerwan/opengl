/* dos.h — stub for old Turbo C style code: delay(ms) and sleep(s). */
#ifndef _DOS_H_STUB
#define _DOS_H_STUB
#include <unistd.h>
static inline void delay(unsigned int ms) { usleep((useconds_t)ms * 1000u); }
#endif
