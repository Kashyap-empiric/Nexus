export const OVERLAY_Z_INDEX = {
  tooltip: 1000,
  hoverCard: 1100,
  dialog: 1400,
  dropdown: 1450,
  contextMenu: 1450,
  popover: 1460,
  alertDialog: 1500,
  toast: 1600,
} as const;

export const OVERLAY_ANIMATIONS = {
  dialog: "duration-[180ms] data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-2 data-closed:animate-out data-closed:fade-out-0",
  dropdown: "duration-[120ms] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-98 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-98",
  hover: "duration-[150ms] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
} as const;
