import { vi } from 'vitest';

/**
 * SweetAlert2 renders into document.body outside React's tree and drives its own
 * animation timers, which makes asserting on it in jsdom slow and flaky. The
 * module is replaced wholesale so tests can assert on *what was asked* and
 * script the answer, rather than driving a real modal.
 *
 * `Swal.fire` resolves to a dismissal by default — a test that wants the user to
 * click through must say so explicitly via `confirmNext()`.
 */
export const swalFire = vi.fn(async () => ({ isConfirmed: false, isDismissed: true, isDenied: false }));

/** Toast calls funnel through the mixin returned to utils/toast.js. */
export const toastFire = vi.fn(async () => ({}));

const SwalMock = {
  fire:        swalFire,
  mixin:       vi.fn(() => ({ fire: toastFire })),
  stopTimer:   vi.fn(),
  resumeTimer: vi.fn(),
  close:       vi.fn(),
  isVisible:   vi.fn(() => false),
};

/** Make the next Swal.fire resolve as if the user hit the confirm button. */
export function confirmNext() {
  swalFire.mockResolvedValueOnce({ isConfirmed: true, isDismissed: false, isDenied: false });
}

/** The options object passed to the Nth (default: first) Swal.fire call. */
export function swalCall(n = 0) {
  return swalFire.mock.calls[n]?.[0];
}

/** Restores both fakes to their default, non-confirming behaviour. */
export function resetSwalMock() {
  swalFire.mockReset().mockResolvedValue({ isConfirmed: false, isDismissed: true, isDenied: false });
  toastFire.mockReset().mockResolvedValue({});
}

export default SwalMock;
