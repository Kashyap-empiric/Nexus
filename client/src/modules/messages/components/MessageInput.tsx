"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSendMessageMutation } from "@/modules/messages/hooks/useMessages";
import { SendHorizontal, Smile, X, Reply, List, ListOrdered } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { useTheme } from "next-themes";
import type { User } from "@/modules/conversations/types/conversation";
import { SOCKET_EVENTS } from "@/socket/socket-events";
import { socket } from "@/socket/socketClient";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';

interface MessageInputProps {
  conversationId: string;
  currentUser?: User;
  disabled?: boolean;
  replyingTo?: { id: string; username: string; content: string } | null;
  onClearReply?: () => void;
}

export function MessageInput({ conversationId, currentUser, disabled, replyingTo, onClearReply }: MessageInputProps) {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const { theme } = useTheme();
  const { mutate: sendMessage } = useSendMessageMutation(conversationId, currentUser);

  // Typing indicator state
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTypingStart = useCallback(() => {
    if (!socket.connected || isTypingRef.current) return;
    isTypingRef.current = true;
    socket.emit(SOCKET_EVENTS.TYPING_START, {
      conversationId,
      username: currentUser?.username || "Unknown",
    });
  }, [conversationId, currentUser?.username]);

  const emitTypingStop = useCallback(() => {
    if (!socket.connected || !isTypingRef.current) return;
    isTypingRef.current = false;
    socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
  }, [conversationId]);

  const handleTypingActivity = useCallback(() => {
    // Emit typing:start on first keystroke after inactivity
    if (!isTypingRef.current) {
      emitTypingStart();
    }

    // Debounce typing:stop — reset timer on every keystroke
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, 1500);
  }, [emitTypingStart, emitTypingStop]);

  // Clean up typing state on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitTypingStop();
    };
  }, [emitTypingStop]);

  const submitMessage = () => {
    if (!editor) return;
    
    // We get standard Markdown back from TipTap!
    // @ts-ignore - tiptap-markdown doesn't provide strong types for storage by default
    const markdownContent = editor.storage.markdown.getMarkdown();
    
    if (!markdownContent.trim()) return;

    // Stop typing on send
    emitTypingStop();

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sendMessage({ conversationId, content: markdownContent.trim(), tempId, replyToId: replyingTo?.id || null });
    
    editor.commands.clearContent(false);
    onClearReply?.();
  };

  const [activeMarks, setActiveMarks] = useState({
    bold: false,
    italic: false,
    code: false,
    strike: false,
    bulletList: false,
    orderedList: false,
  });

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit.configure({
        heading: false,
        bold: { HTMLAttributes: { class: 'font-bold text-foreground' } },
        italic: { HTMLAttributes: { class: 'italic' } },
        strike: { HTMLAttributes: { class: 'line-through' } },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-outside ml-4 my-1 space-y-1',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-outside ml-4 my-1 space-y-1',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-zinc-950 dark:bg-zinc-900/50 text-zinc-50 border border-border/50 rounded-md p-3 my-2 overflow-x-auto text-[13px] font-mono',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-muted text-foreground px-1.5 py-0.5 rounded text-[13px] font-mono border border-border/50',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-primary/50 pl-3 my-2 italic text-muted-foreground',
          },
        },
      }),
      Placeholder.configure({
        placeholder: "Message...",
        emptyEditorClass: 'is-editor-empty',
      }),
      Markdown.configure({
        html: false, // only parse/serialize standard markdown, not raw HTML
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: '',
    editable: !disabled,
    onUpdate: () => {
      handleTypingActivity();
    },
    onTransaction: ({ editor }) => {
      setActiveMarks({
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        code: editor.isActive('code'),
        strike: editor.isActive('strike'),
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
      });
    },
    editorProps: {
      attributes: {
        class: 'w-full min-h-[24px] max-h-[140px] px-3 py-1 bg-transparent border-0 focus:ring-0 text-base outline-none prose-p:my-0 prose-p:whitespace-pre-wrap overflow-y-auto disabled:opacity-50 break-words',
      },
      handleKeyDown: (view, event) => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        if (event.key === 'Enter') {
          if (isMobile) {
            // On mobile, Enter adds a newline (let TipTap handle it)
            return false;
          }

          // On desktop, Enter sends, Shift+Enter adds newline
          if (!event.shiftKey) {
            // Don't send on Enter inside lists — let TipTap create new list items
            if (editor?.isActive('bulletList') || editor?.isActive('orderedList')) {
              return false;
            }
            event.preventDefault();
            submitMessage();
            return true;
          }
        }
        return false;
      },
    },
  });

  // Keep editor's editable state synced with disabled prop
  useEffect(() => {
    if (editor && editor.isEditable === disabled) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const onEmojiClick = (emojiData: any) => {
    if (editor) {
      editor.chain().focus().insertContent(emojiData.emoji).run();
    }
  };

  if (!editor) {
    return null; // Or a loading skeleton
  }

  // To toggle states efficiently and prevent getting "stuck" due to schema exclusions (code excludes bold/italic)
  const toggleBold = () => {
    if (editor.isActive('code')) {
      editor.chain().focus().unsetCode().toggleBold().run();
    } else {
      editor.chain().focus().toggleBold().run();
    }
  };

  const toggleItalic = () => {
    if (editor.isActive('code')) {
      editor.chain().focus().unsetCode().toggleItalic().run();
    } else {
      editor.chain().focus().toggleItalic().run();
    }
  };

  const toggleStrike = () => {
    if (editor.isActive('code')) {
      editor.chain().focus().unsetCode().toggleStrike().run();
    } else {
      editor.chain().focus().toggleStrike().run();
    }
  };

  const toggleCode = () => {
    // Code excludes other marks, so if we're turning it ON, we clear the others
    if (!editor.isActive('code')) {
      editor.chain().focus().unsetBold().unsetItalic().unsetStrike().toggleCode().run();
    } else {
      editor.chain().focus().toggleCode().run();
    }
  };

  const toggleBulletList = () => {
    editor.chain().focus().toggleBulletList().run();
  };

  const toggleOrderedList = () => {
    editor.chain().focus().toggleOrderedList().run();
  };

  const isEmpty = editor.isEmpty;
  const activeClass = "bg-primary/15 text-primary dark:bg-zinc-800 dark:text-zinc-100";

  return (
    <form onSubmit={handleSubmit} className="px-[15px] md:px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 bg-background shrink-0 w-full">
      {/* Reply banner */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 mb-1 bg-muted/50 border border-border rounded-t-lg text-sm">
          <Reply className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            Replying to <span className="font-semibold text-foreground">@{replyingTo.username}</span>
          </span>
          <span className="truncate text-muted-foreground/70 flex-1 min-w-0">
            {replyingTo.content}
          </span>
          <button
            type="button"
            onClick={onClearReply}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="w-full flex flex-col bg-card dark:bg-card border border-border/60 rounded-xl shadow-sm transition-colors focus-within:ring-1 focus-within:ring-brand/30 focus-within:border-brand/40 overflow-hidden">
        
        {/* Toolbar Row */}
        <div className="flex items-center gap-1 px-2 pt-2 text-muted-foreground">
          <button type="button" onClick={toggleBold} className={`p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.bold ? activeClass : ''}`} title="Bold">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8"/><path d="M15 20a4 4 0 0 0 0-8H6v8Z"/></svg>
          </button>
          <button type="button" onClick={toggleItalic} className={`p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.italic ? activeClass : ''}`} title="Italic">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>
          </button>
          <button type="button" onClick={toggleCode} className={`p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.code ? activeClass : ''}`} title="Code">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </button>
          <button type="button" onClick={toggleStrike} className={`p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.strike ? activeClass : ''}`} title="Strikethrough">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          <button type="button" onClick={toggleBulletList} className={`p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.bulletList ? activeClass : ''}`} title="Bullet List">
            <List className="h-4 w-4" />
          </button>
          <button type="button" onClick={toggleOrderedList} className={`p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.orderedList ? activeClass : ''}`} title="Numbered List">
            <ListOrdered className="h-4 w-4" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
            <PopoverTrigger
              type="button"
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-md transition-colors flex items-center justify-center"
              title="Emoji"
            >
              <Smile className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-auto p-0 border-none shadow-xl"
              sideOffset={8}
            >
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                lazyLoadEmojis={true}
                searchPlaceHolder="Search emojis..."
                width={300}
                previewConfig={{ showPreview: true }}
                style={{
                  '--epr-emoji-size': '20px',
                  '--epr-preview-height': '40px',
                  '--epr-preview-emoji-size': '18px',
                  '--epr-preview-text-size': '12px'
                } as React.CSSProperties}
              />
            </PopoverContent>
          </Popover>
          {/* Attachment icon removed per request */}
        </div>

        {/* TipTap Editor and Send Button */}
        <div className="flex items-end w-full pl-[2px] pr-3 py-1.5 gap-2">
          <div className="flex-1 min-w-0 relative cursor-text" onClick={() => editor.commands.focus()}>
            <EditorContent editor={editor} className="w-full" />
          </div>

          <Button
            type="submit"
            disabled={isEmpty || disabled}
            size="icon"
            variant="ghost"
            className={`shrink-0 h-8 w-8 mb-[2px] rounded-md transition-all flex items-center justify-center hover:bg-muted ${!isEmpty ? "text-primary" : "text-muted-foreground opacity-50"}`}
            title="Send message"
          >
            <SendHorizontal className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
