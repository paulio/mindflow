/**
 * Internal representation of an undoable change entry.
 * Each entry captures two pure(ish) directional operations:
 *  - undo(): transitions state to the previous observable form
 *  - redo(): reapplies the forward change exactly once relative to that previous form
 * The logical public model = two stacks: Undo (applied) & Redo (revertable forwards).
 * Implementation optimization: single array + pointer index.
 *   stack[0..pointer]   => applied entries (canUndo if pointer >=0)
 *   stack[pointer+1..]  => redoable entries (canRedo if pointer < stack.length-1)
 * Pushing when pointer < last prunes the redo tail (branch invalidation per FR-034).
 */
interface Entry<T = any> { undo: () => void; redo: () => void; type: string; data?: T; }

export class UndoStack {
  private stack: Entry[] = [];
  private pointer = -1; // points to last applied
  constructor(private readonly max = 10) {}
  push(entry: Entry) {
    // drop redo segment
    if (this.pointer < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.pointer + 1);
    }
    this.stack.push(entry);
    if (this.stack.length > this.max) {
      // remove oldest; pointer shifts left implicitly by one
      this.stack.shift();
      if (this.pointer > -1) this.pointer = this.stack.length - 1; // point to last entry
    } else {
      this.pointer++;
    }
  }
  canUndo() { return this.pointer >= 0; }
  canRedo() { return this.pointer < this.stack.length - 1; }
  undo() {
    if (!this.canUndo()) return false;
    const entry = this.stack[this.pointer];
    entry.undo();
    this.pointer--;
    return true;
  }
  redo() {
    if (!this.canRedo()) return false;
    const entry = this.stack[this.pointer + 1];
    entry.redo();
    this.pointer++;
    return true;
  }
  size() { return this.stack.length; }
  clear() { this.stack = []; this.pointer = -1; }

  /**
   * Development/test helper: peek next undo & redo entry types without mutating state.
   * Not part of public stable API (can change). Used for richer event metadata emission.
   */
  __peekTypes(): { undoType: string | null; redoType: string | null } {
    const undoType = this.pointer >= 0 ? this.stack[this.pointer].type : null;
    const redoType = this.pointer < this.stack.length - 1 ? this.stack[this.pointer + 1].type : null;
    return { undoType, redoType };
  }
}
