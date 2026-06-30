// Minimal pointer-based reorder for a small list (the favorites bar).
// Works on touch + mouse via Pointer Events; reorders the DOM live by pointer
// position, then reports the new id order on drop.
// ponytail: no auto-scroll / FLIP animation — swap to SortableJS if you want that.

type Opts = {
  itemSelector: string;
  idAttr: string; // dataset key holding each item's id (e.g. "file" for data-file)
  ignore?: string; // selector whose elements never start a drag (e.g. a remove button)
  onReorder: (ids: string[]) => void;
};

export function enableSortable(container: HTMLElement, opts: Opts): () => void {
  let dragging: HTMLElement | null = null;
  let pointerId = -1;

  const items = () => [...container.querySelectorAll<HTMLElement>(opts.itemSelector)];

  function onDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;
    if (opts.ignore && target.closest(opts.ignore)) return;
    const item = target.closest<HTMLElement>(opts.itemSelector);
    if (!item || !container.contains(item)) return;
    e.preventDefault();
    dragging = item;
    pointerId = e.pointerId;
    try {
      item.setPointerCapture(pointerId);
    } catch {
      /* capture unsupported — pointer still tracked while inside container */
    }
    item.classList.add("dragging");
  }

  function onMove(e: PointerEvent): void {
    if (!dragging || e.pointerId !== pointerId) return;
    e.preventDefault();
    // Insert before the first item whose row/position is past the pointer.
    let ref: HTMLElement | null = null;
    for (const it of items()) {
      if (it === dragging) continue;
      const r = it.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      if (e.clientY < r.top) {
        ref = it;
        break;
      }
      if (e.clientY <= r.bottom && e.clientX < cx) {
        ref = it;
        break;
      }
    }
    container.insertBefore(dragging, ref);
  }

  function onUp(e: PointerEvent): void {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging.classList.remove("dragging");
    try {
      dragging.releasePointerCapture(pointerId);
    } catch {
      /* ignore */
    }
    dragging = null;
    pointerId = -1;
    const ids = items()
      .map((el) => el.dataset[opts.idAttr] ?? "")
      .filter(Boolean);
    opts.onReorder(ids);
  }

  container.addEventListener("pointerdown", onDown);
  container.addEventListener("pointermove", onMove);
  container.addEventListener("pointerup", onUp);
  container.addEventListener("pointercancel", onUp);

  return () => {
    container.removeEventListener("pointerdown", onDown);
    container.removeEventListener("pointermove", onMove);
    container.removeEventListener("pointerup", onUp);
    container.removeEventListener("pointercancel", onUp);
  };
}
