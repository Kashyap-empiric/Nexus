"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSendMessageMutation } from "@/modules/messages/hooks/useMessages";
import { useChatStore } from "@/modules/chat/store/chatStore";
import { SendHorizontal, Smile, X, Reply, List, ListOrdered } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { useTheme } from "next-themes";
import { Theme as EmojiPickerTheme } from 'emoji-picker-react';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
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
  placeholder?: string;
  initialContent?: string;
  onSubmit?: (content: string) => void;
  onCancel?: () => void;
  children?: ReactNode;
  hideSendButton?: boolean;
  threadRootId?: string;
  compact?: boolean;
}

export function MessageInput({
  conversationId,
  currentUser,
  disabled,
  replyingTo,
  onClearReply,
  placeholder = "Message...",
  initialContent,
  onSubmit,
  onCancel,
  children,
  hideSendButton,
  threadRootId,
  compact,
}: MessageInputProps) {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [emojiPickerWidth, setEmojiPickerWidth] = useState(300);
  const { theme } = useTheme();
  const { mutate: sendMessage } = useSendMessageMutation(conversationId, currentUser);

  // Draft persistence
  const { setDraft, clearDraft } = useChatStore();
  const _draftKey = threadRootId ? `${conversationId}:thread:${threadRootId}` : conversationId;
  // Subscribe only to the draft for this specific key to avoid re-renders on other drafts
  const savedDraft = useChatStore((s) => s.drafts.get(_draftKey));
  // Refs to avoid stale closures inside the TipTap useEditor callback
  const draftKeyRef = useRef(_draftKey);
  const onSubmitRef = useRef(onSubmit);
  const compactRef = useRef(compact);
  const latestContentRef = useRef('');

  useEffect(() => {
    draftKeyRef.current = _draftKey;
    onSubmitRef.current = onSubmit;
    compactRef.current = compact;
  }, [_draftKey, onSubmit, compact]);

  useEffect(() => {
    const handleResize = () => setEmojiPickerWidth(Math.min(300, window.innerWidth - 32));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tempIdCounterRef = useRef(0);
  const TYPING_STOP_TIMEOUT_MS = 1500;

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
    if (!isTypingRef.current) {
      emitTypingStart();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop();
    }, TYPING_STOP_TIMEOUT_MS);
  }, [emitTypingStart, emitTypingStop]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitTypingStop();

      // Save draft on unmount if user had typed something
      if (latestContentRef.current) {
        setDraft(draftKeyRef.current, latestContentRef.current);
      }
    };
  }, [emitTypingStop, setDraft]);

  const submitMessage = () => {
    if (!editor) return;

    const markdownStorage = (editor.storage as unknown) as { markdown: { getMarkdown: () => string } };
    const markdownContent = markdownStorage.markdown.getMarkdown();

    if (!markdownContent.trim()) return;

    if (onSubmit) {
      clearDraft(_draftKey);
      onSubmit(markdownContent.trim());
      editor.commands.clearContent(false);
      return;
    }

    emitTypingStop();

    tempIdCounterRef.current += 1;

    const tempId = `temp-${crypto.randomUUID()}-${tempIdCounterRef.current}`;
    sendMessage({ conversationId, content: markdownContent.trim(), tempId, replyToId: replyingTo?.id || null, threadRootId });

    clearDraft(_draftKey);
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
            class: 'bg-muted text-foreground border border-border/50 rounded-md p-3 my-2 overflow-x-auto text-[13px] font-mono',
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
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContent || '',
    editable: !disabled,
    onUpdate: () => {
      if (!onSubmitRef.current) {
        handleTypingActivity();
      }

      // Save draft (skip in compact/edit mode)
      if (!compactRef.current && !onSubmitRef.current) {
        const markdownStorage = (editor.storage as unknown) as { markdown: { getMarkdown: () => string } };
        const content = markdownStorage.markdown.getMarkdown();
        latestContentRef.current = content;
        setDraft(draftKeyRef.current, content);
      }
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
        class: 'w-full min-h-[24px] max-h-[140px] px-1 py-1 bg-transparent border-0 focus:ring-0 text-base outline-none prose-p:my-0 prose-p:whitespace-pre-wrap overflow-y-auto disabled:opacity-50 break-words',
      },
      handleKeyDown: (view, event) => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

        if (event.key === 'Enter') {
          if (isMobile) {
            return false;
          }

          if (!event.shiftKey) {
            if (editor?.isActive('bulletList') || editor?.isActive('orderedList')) {
              return false;
            }
            event.preventDefault();
            submitMessage();
            return true;
          }
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel?.();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable === disabled) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (editor && initialContent) {
      editor.commands.focus("end");
    }
  }, [editor, initialContent]);

  // Load draft on mount or when draftKey changes (conversation/thread switch)
  const draftLoadedRef = useRef(_draftKey);
  useEffect(() => {
    if (!editor || compact || onSubmit) return;
    if (draftLoadedRef.current === _draftKey && !editor.isEmpty) return;
    draftLoadedRef.current = _draftKey;
    if (savedDraft && editor.isEmpty) {
      editor.commands.setContent(savedDraft);
      editor.commands.focus("end");
    }
  }, [editor, _draftKey, savedDraft, compact, onSubmit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const onEmojiClick = (emojiData: { emoji: string }) => {
    if (editor) {
      editor.chain().focus().insertContent(emojiData.emoji).run();
    }
  };

  if (!editor) {
    return null;
  }

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
  const activeClass = "bg-primary/20 text-primary ring-1 ring-primary/30";

  return (
    <form onSubmit={handleSubmit} className={compact ? "w-full" : "px-4 md:px-6 xl:px-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6 pt-2 bg-background shrink-0 w-full"}>
      {!compact && replyingTo && (
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

      <div className={`w-full flex flex-col border border-border/80 shadow-sm rounded-lg transition-all focus-within:ring-1 focus-within:ring-primary/20 focus-within:border-primary/40 overflow-hidden ${compact ? "bg-background" : "bg-card"}`}>

        <div className="flex items-center gap-2 px-3 pt-2 pb-2 border-b border-border/60 text-muted-foreground bg-muted/50">
          <button type="button" onClick={toggleBold} className={`p-1 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.bold ? activeClass : ''}`} title="Bold">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 12a4 4 0 0 0 0-8H6v8" /><path d="M15 20a4 4 0 0 0 0-8H6v8Z" /></svg>
          </button>
          <button type="button" onClick={toggleItalic} className={`p-1 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.italic ? activeClass : ''}`} title="Italic">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="10" y1="4" y2="4" /><line x1="14" x2="5" y1="20" y2="20" /><line x1="15" x2="9" y1="4" y2="20" /></svg>
          </button>
          <button type="button" onClick={toggleCode} className={`p-1 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.code ? activeClass : ''}`} title="Code">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
          </button>
          <button type="button" onClick={toggleStrike} className={`p-1 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.strike ? activeClass : ''}`} title="Strikethrough">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><line x1="4" x2="20" y1="12" y2="12" /></svg>
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <button type="button" onClick={toggleBulletList} className={`p-1 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.bulletList ? activeClass : ''}`} title="Bullet List">
            <List className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={toggleOrderedList} className={`p-1 hover:bg-muted hover:text-foreground rounded-md transition-colors ${activeMarks.orderedList ? activeClass : ''}`} title="Numbered List">
            <ListOrdered className="h-3.5 w-3.5" />
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
            <PopoverTrigger
              type="button"
              className="p-1 hover:bg-muted hover:text-foreground rounded-md transition-colors flex items-center justify-center"
              title="Emoji"
            >
              <Smile className="h-3.5 w-3.5" />
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-auto p-0 border-none shadow-xl"
              sideOffset={8}
            >
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme={theme === 'dark' ? EmojiPickerTheme.DARK : EmojiPickerTheme.LIGHT}
                lazyLoadEmojis={true}
                searchPlaceHolder="Search emojis..."
                width={emojiPickerWidth}
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
        </div>

        <div className="flex items-end w-full pl-3 pr-3 py-2 gap-2">
          <div className="flex-1 min-w-0 relative cursor-text" onClick={() => editor.commands.focus()}>
            <EditorContent editor={editor} className="w-full" />
          </div>

          {!hideSendButton && (
            <Button
              type="submit"
              disabled={isEmpty || disabled}
              size="icon"
              className="shrink-0 h-8 w-8 rounded-lg"
              title="Send message"
            >
              <SendHorizontal className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </div>

        {(children || onCancel) && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-background">
            {onCancel && (
              <Button size="sm" variant="ghost" className="h-7 text-xs px-3" onClick={onCancel} type="button">
                Cancel
              </Button>
            )}
            {onSubmit && onCancel && (
              <Button size="sm" variant="default" className="h-7 text-xs px-3" onClick={(e) => { e.preventDefault(); submitMessage(); }} type="button">
                Save
              </Button>
            )}
            {children}
          </div>
        )}
      </div>
    </form>
  );
}
