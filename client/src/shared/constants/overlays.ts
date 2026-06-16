export const OVERLAY_Z_INDEX = {
  tooltip: 1000,
  hoverCard: 1100,
  dropdown: 1200,
  contextMenu: 1250,
  popover: 1300,
  dialog: 1400,
  alertDialog: 1500,
  toast: 1600,
} as const;

export const OVERLAY_ANIMATIONS = {
  dialog: "duration-[180ms] data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-2 data-closed:animate-out data-closed:fade-out-0",
  dropdown: "duration-[120ms] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-98 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-98",
  hover: "duration-[150ms] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
} as const;
