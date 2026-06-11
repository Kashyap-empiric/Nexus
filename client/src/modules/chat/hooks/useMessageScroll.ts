import { useEffect, useRef, useState, useCallback } from "react";

interface UseMessageScrollProps {
  conversationId: string;
  latestMessageId?: string;
  isLatestMessageMine?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage: () => void;
}

export function useMessageScroll({
  conversationId,
  latestMessageId,
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

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const scrollToBottom = useCallback((behavior: "auto" | "smooth" = "smooth") => {
    isProgrammaticScroll.current = true;
    bottomRef.current?.scrollIntoView({ behavior });
    setIsAtBottom(true);
    isAtBottomRef.current = true;
    setHasNewMessages(false);

    requestAnimationFrame(() => {
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 100);
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;

    setIsAtBottom(atBottom);
    isAtBottomRef.current = atBottom;
    if (atBottom) {
      setHasNewMessages(false);
    }
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (prevConversationId.current !== conversationId) {
      prevConversationId.current = conversationId;
      hasInitialScrolled.current = false;
    }

    if (!latestMessageId) return;

    if (!hasInitialScrolled.current) {
      hasInitialScrolled.current = true;
      scrollToBottom("auto");
      return;
    }

    if (isLatestMessageMine) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      scrollToBottom("smooth");
      return;
    }

    if (isAtBottomRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      scrollToBottom("smooth");
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasNewMessages(true);
    }
  }, [latestMessageId, conversationId, isLatestMessageMine, scrollToBottom]);

  // Intersection observer for infinite scroll
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
