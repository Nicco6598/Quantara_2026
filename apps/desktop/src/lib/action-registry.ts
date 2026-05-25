export type AppAction =
  | { type: "project.create" }
  | { type: "project.submit" }
  | { type: "project.gotoStep"; step: number }
  | { type: "sal.create" }
  | { type: "sal.saveDraft" }
  | { type: "sal.confirm" }
  | { type: "sal.gotoStep"; step: number }
  | { type: "tariff.import" }
  | { type: "tariff.preview.select"; index: number }
  | { type: "tariff.draft.save" }
  | { type: "tariff.draft.confirm" }
  | { type: "tariff.draft.toggleReviewed" }
  | { type: "tariff.draft.deleteFile" }
  | { type: "update.check" };

export type ActionHandler = (action: AppAction) => void;

class ActionRegistry {
  private handlers: Map<string, Set<ActionHandler>> = new Map();

  subscribe(type: AppAction["type"], handler: ActionHandler): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler);
    this.handlers.set(type, set);
    return () => this.unsubscribe(type, handler);
  }

  unsubscribe(type: AppAction["type"], handler: ActionHandler): void {
    const set = this.handlers.get(type);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this.handlers.delete(type);
    }
  }

  dispatch(action: AppAction): void {
    const set = this.handlers.get(action.type);
    if (!set) return;
    set.forEach((handler) => {
      handler(action);
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const actionRegistry = new ActionRegistry();
