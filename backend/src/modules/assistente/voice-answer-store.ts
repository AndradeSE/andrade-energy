import { randomUUID } from "node:crypto";
import { redactConversationText } from "./conversation-text";

export class VoiceAnswerStore {
  private entries = new Map<string, { owner: string; text: string; expires: number }>();
  put(owner: string, text: string, now = Date.now()) {
    for (const [id, entry] of this.entries) if (entry.expires <= now) this.entries.delete(id);
    if (this.entries.size >= 100) this.entries.delete(this.entries.keys().next().value!);
    const id = randomUUID();
    this.entries.set(id, { owner, text: redactConversationText(text), expires: now + 120_000 });
    return id;
  }
  get(owner: string, id: string, now = Date.now()) {
    const entry = this.entries.get(id);
    if (!entry || entry.owner !== owner || entry.expires <= now) return undefined;
    return entry.text;
  }
}
