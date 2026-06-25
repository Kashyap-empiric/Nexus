"use client";

import { MessageInput } from "./MessageInput";

interface EditMessageFormProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function EditMessageForm({ initialContent, onSave, onCancel }: EditMessageFormProps) {
  return (
    <MessageInput
      conversationId=""
      initialContent={initialContent}
      onSubmit={onSave}
      onCancel={onCancel}
      hideSendButton
      placeholder="Edit message..."
      compact
    />
  );
}
