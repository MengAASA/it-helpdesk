/**
 * Rows that wipe in a soft fill from the left on hover, instead of lifting. Pair it with a
 * `before:bg-*` class for the fill colour. Shared by the dashboard tiles and the ticket list.
 */
export const ROW_WIPE =
  "relative isolate before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:rounded-[10px] before:transition-transform before:duration-300 before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:before:scale-x-100 motion-reduce:before:transition-none";
