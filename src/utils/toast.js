import Swal from 'sweetalert2';

const _Toast = Swal.mixin({
  toast:             true,
  position:          'top-start',
  showConfirmButton: false,
  timerProgressBar:  true,
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

function fire(icon, message, duration = 4000) {
  return _Toast.fire({ icon, title: message, timer: duration });
}

export const toast = {
  success: (message, opts = {}) => fire('success', message, opts.duration ?? 5000),
  error:   (message, opts = {}) => fire('error',   message, opts.duration ?? 4000),
  warning: (message, opts = {}) => fire('warning', message, opts.duration ?? 4000),
  info:    (message, opts = {}) => fire('info',    message, opts.duration ?? 4000),
};
