import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/chatStore";

interface UseMessageScrollProps {
  conversationId: string;
  latestMessageId?: string;
  oldestMessageId?: string;
  isLatestMessageMine?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
}

export function useMessageScroll({
  conversationId,
  latestMessageId,
  oldestMessageId,
  isLatestMessageMine,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: UseMessageScrollProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const isProgrammaticScroll = useRef(false);
  const prevConversationId = useRef(conversationId);
  const isAtBottomRef = useRef(true);
  const hasInitialScrolled = useRef(false);

  const previousScrollHeight = useRef(0);
  const prevOldestMessageId = useRef(oldestMessageId);
  const lastSavedScrollTop = useRef(0);
  const scrollRestoreAttempted = useRef(false);

  const [isAtBottom, setIsAtBottom] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (prevConversationId.current === conversationId && prevOldestMessageId.current !== oldestMessageId) {
      const heightDiff = container.scrollHeight - previousScrollHeight.current;

      if (heightDiff > 0 && previousScrollHeight.current > 0) {
        container.scrollTop = container.scrollTop + heightDiff;
      }
      prevOldestMessageId.current = oldestMessageId;
    }

    previousScrollHeight.current = container.scrollHeight;
  });

  const scrollToBottom = useCallback((behavior: "auto" | "smooth" = "smooth") => {
    isProgrammaticScroll.current = true;
    bottomRef.current?.scrollIntoView({ behavior });
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setHasNewMessages(false);

    requestAnimationFrame(() => {
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 100);
    });
  }, []);

  const isTicking = useRef(false);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;

    if (!isTicking.current) {
      requestAnimationFrame(() => {
        const container = scrollContainerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const atBottom = scrollHeight - scrollTop - clientHeight < 100;

          setIsAtBottom(atBottom);
          isAtBottomRef.current = atBottom;
          if (atBottom) {
            setHasNewMessages(false);
          }

          // Persist scroll position to store (avoid redundant saves)
          if (Math.abs(scrollTop - lastSavedScrollTop.current) > 10) {
            lastSavedScrollTop.current = scrollTop;
            useChatStore.getState().setScrollPosition(conversationId, scrollTop);
          }
        }
        isTicking.current = false;
      });
      isTicking.current = true;
    }
  }, [conversationId]);

  useEffect(() => {
    if (prevConversationId.current !== conversationId) {
      prevConversationId.current = conversationId;
      hasInitialScrolled.current = false;
      scrollRestoreAttempted.current = false;
    }

    if (!latestMessageId) return;

    if (!hasInitialScrolled.current) {
      hasInitialScrolled.current = true;

      // Try to restore saved scroll position
      const savedScrollTop = useChatStore.getState().scrollPositions[conversationId];
      if (savedScrollTop !== undefined && !scrollRestoreAttempted.current) {
        scrollRestoreAttempted.current = true;
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = savedScrollTop;
          }
        });
        return;
      }

      // No saved position — scroll to bottom
      scrollToBottom("auto");
      return;
    }

    if (isLatestMessageMine) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      scrollToBottom("smooth");
      return;
    }

    if (isAtBottomRef.current) {
      scrollToBottom("smooth");
    } else {
      setHasNewMessages(true);
    }
  }, [latestMessageId, conversationId, isLatestMessageMine, scrollToBottom]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    scrollContainerRef,
    bottomRef,
    observerTarget,
    isAtBottom,
    hasNewMessages,
    scrollToBottom,
    handleScroll,
  };
}
