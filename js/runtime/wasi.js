// Minimal WASI (preview1) implementation for student programs.
// Provides: stdout/stderr (to the Output panel), stdin (from the optional
// "Program input" box), clocks, random numbers, sleep and exit().
// There is no file system: student programs cannot open files.

export class ExitStatus extends Error {
  constructor(code) {
    super(`exit(${code})`);
    this.name = 'ExitStatus';
    this.code = code;
  }
}

const ESUCCESS = 0, EBADF = 8, EINVAL = 28, ENOSYS = 52, ESPIPE = 70;

export function createWasi({ getMemory, write, stdinText = '', args = ['program'] }) {
  const enc = new TextEncoder();
  const stdin = enc.encode(stdinText);
  let stdinPos = 0;
  const dv = () => new DataView(getMemory().buffer);
  const u8 = () => new Uint8Array(getMemory().buffer);

  const imports = {
    fd_write(fd, iovs, iovsLen, nwrittenPtr) {
      const view = dv();
      const bytes = u8();
      let total = 0;
      for (let i = 0; i < iovsLen; i++) {
        const ptr = view.getUint32(iovs + i * 8, true);
        const len = view.getUint32(iovs + i * 8 + 4, true);
        if (len) write(fd, bytes.slice(ptr, ptr + len));
        total += len;
      }
      view.setUint32(nwrittenPtr, total, true);
      return (fd === 1 || fd === 2) ? ESUCCESS : EBADF;
    },
    fd_read(fd, iovs, iovsLen, nreadPtr) {
      const view = dv();
      if (fd !== 0) return EBADF;
      let total = 0;
      for (let i = 0; i < iovsLen && stdinPos < stdin.length; i++) {
        const ptr = view.getUint32(iovs + i * 8, true);
        const len = view.getUint32(iovs + i * 8 + 4, true);
        const n = Math.min(len, stdin.length - stdinPos);
        u8().set(stdin.subarray(stdinPos, stdinPos + n), ptr);
        stdinPos += n; total += n;
      }
      view.setUint32(nreadPtr, total, true);
      return ESUCCESS;
    },
    fd_fdstat_get(fd, ptr) {
      if (fd > 2) return EBADF;
      const view = dv();
      view.setUint8(ptr, 2);            // filetype: character device (a terminal)
      view.setUint16(ptr + 2, 0, true); // flags
      view.setBigUint64(ptr + 8, 0xFFFFFFFFn, true);
      view.setBigUint64(ptr + 16, 0xFFFFFFFFn, true);
      return ESUCCESS;
    },
    fd_fdstat_set_flags() { return ESUCCESS; },
    fd_close() { return ESUCCESS; },
    fd_seek() { return ESPIPE; },
    fd_sync() { return ESUCCESS; },
    fd_prestat_get() { return EBADF; },        // no pre-opened directories
    fd_prestat_dir_name() { return EBADF; },
    path_open() { return ENOSYS; },
    environ_sizes_get(countPtr, sizePtr) {
      const view = dv();
      view.setUint32(countPtr, 0, true);
      view.setUint32(sizePtr, 0, true);
      return ESUCCESS;
    },
    environ_get() { return ESUCCESS; },
    args_sizes_get(countPtr, sizePtr) {
      const view = dv();
      view.setUint32(countPtr, args.length, true);
      view.setUint32(sizePtr, args.reduce((n, a) => n + enc.encode(a).length + 1, 0), true);
      return ESUCCESS;
    },
    args_get(argvPtr, bufPtr) {
      const view = dv();
      let p = bufPtr;
      args.forEach((a, i) => {
        const b = enc.encode(a);
        view.setUint32(argvPtr + i * 4, p, true);
        u8().set(b, p);
        u8()[p + b.length] = 0;
        p += b.length + 1;
      });
      return ESUCCESS;
    },
    clock_res_get(id, resPtr) {
      dv().setBigUint64(resPtr, 1000n, true);
      return ESUCCESS;
    },
    clock_time_get(id, precision, timePtr) {
      const ns = id === 0
        ? BigInt(Date.now()) * 1000000n
        : BigInt(Math.round(performance.now() * 1e6));
      dv().setBigUint64(timePtr, ns, true);
      return ESUCCESS;
    },
    random_get(buf, len) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i += 65536) crypto.getRandomValues(bytes.subarray(i, Math.min(len, i + 65536)));
      u8().set(bytes, buf);
      return ESUCCESS;
    },
    sched_yield() { return ESUCCESS; },
    poll_oneoff(inPtr, outPtr, nsubs, neventsPtr) {
      // Used by sleep()/usleep(). We busy-wait, capped at 2 seconds per call,
      // because a browser worker cannot block without SharedArrayBuffer.
      const view = dv();
      let waitNs = 0n;
      for (let i = 0; i < nsubs; i++) {
        const s = inPtr + i * 48;
        if (view.getUint8(s + 8) === 0) { // clock subscription
          let t = view.getBigUint64(s + 24, true);
          const abs = view.getUint16(s + 40, true) & 1;
          if (abs) t -= BigInt(Math.round(performance.now() * 1e6));
          if (t > waitNs) waitNs = t;
        }
      }
      const ms = Math.min(2000, Number(waitNs) / 1e6);
      const end = performance.now() + ms;
      while (performance.now() < end) { /* wait */ }
      for (let i = 0; i < nsubs; i++) {
        const s = inPtr + i * 48, e = outPtr + i * 32;
        view.setBigUint64(e, view.getBigUint64(s, true), true);
        view.setUint16(e + 8, 0, true);
        view.setUint8(e + 10, view.getUint8(s + 8));
      }
      view.setUint32(neventsPtr, nsubs, true);
      return ESUCCESS;
    },
    proc_exit(code) { throw new ExitStatus(code); },
    proc_raise() { return ENOSYS; },
  };

  // Anything not implemented returns ENOSYS ("function not supported").
  return new Proxy(imports, {
    get(target, name) {
      if (name in target) return target[name];
      return () => ENOSYS;
    },
  });
}

export { EINVAL };
