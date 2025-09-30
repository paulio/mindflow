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
}
