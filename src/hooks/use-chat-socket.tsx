import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getOrCreateSocket } from "@/lib/socket";

type DirectTypingPayload = { fromUserId?: number; isTyping?: boolean };
type GroupTypingPayload = {
  conversationUuid?: string;
  fromUserId?: number;
  fromUserName?: string;
  isTyping?: boolean;
};

export type GroupTypingUser = {
  conversationUuid: string;
  userId: number;
  userName: string;
};

type ChatSocketState = {
  typingUserIds: number[];
  typingConversationIds: string[];
  groupTypingUsers: GroupTypingUser[];
  onlineUserIds: number[];
};

const ChatSocketContext = createContext<ChatSocketState>({
  typingUserIds: [],
  typingConversationIds: [],
  groupTypingUsers: [],
  onlineUserIds: [],
});

/**
 * Connects once at the top of the authenticated tab tree (mirrors the web
 * app's single socket connection in ChatLayout) and keeps the chats list
 * live: invalidates direct-chats on message/read/group events, and tracks
 * who's currently typing so rows/conversations can show a live indicator.
 */
export function ChatSocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [typingUserIds, setTypingUserIds] = useState<number[]>([]);
  const [groupTypingUsers, setGroupTypingUsers] = useState<GroupTypingUser[]>(
    []
  );
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([]);

  useEffect(() => {
    if (!token) return;

    const socket = getOrCreateSocket(token);

    function invalidateChats() {
      void queryClient.invalidateQueries({ queryKey: ["direct-chats"] });
      void queryClient.invalidateQueries({ queryKey: ["direct-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["group-messages"] });
    }

    function handleDirectTyping(payload: DirectTypingPayload) {
      if (typeof payload.fromUserId !== "number") return;
      const fromUserId = payload.fromUserId;

      setTypingUserIds((prev) => {
        const has = prev.includes(fromUserId);
        const isTyping = payload.isTyping ?? false;
        if (isTyping === has) return prev;
        return isTyping
          ? [...prev, fromUserId]
          : prev.filter((id) => id !== fromUserId);
      });
    }

    function handleGroupTyping(payload: GroupTypingPayload) {
      if (
        typeof payload.conversationUuid !== "string" ||
        typeof payload.fromUserId !== "number" ||
        typeof payload.fromUserName !== "string"
      ) {
        return;
      }

      const conversationUuid = payload.conversationUuid;
      const userId = payload.fromUserId;
      const userName = payload.fromUserName;

      setGroupTypingUsers((prev) => {
        const filtered = prev.filter(
          (entry) =>
            !(
              entry.conversationUuid === conversationUuid &&
              entry.userId === userId
            )
        );

        if (!payload.isTyping) return filtered;

        return [...filtered, { conversationUuid, userId, userName }];
      });
    }

    function handlePresenceSnapshot(payload: { onlineUserIds?: number[] }) {
      setOnlineUserIds(
        Array.isArray(payload.onlineUserIds) ? payload.onlineUserIds : []
      );
    }

    function handlePresenceChanged(payload: {
      userId?: number;
      isOnline?: boolean;
    }) {
      if (typeof payload.userId !== "number") return;
      const userId = payload.userId;

      setOnlineUserIds((prev) => {
        const has = prev.includes(userId);
        const isOnline = payload.isOnline ?? false;
        if (isOnline === has) return prev;
        return isOnline
          ? [...prev, userId]
          : prev.filter((id) => id !== userId);
      });
    }

    socket.on("direct_message:new", invalidateChats);
    socket.on("direct_message:updated", invalidateChats);
    socket.on("direct_message:read", invalidateChats);
    socket.on("group_chat:created", invalidateChats);
    socket.on("group_message:new", invalidateChats);
    socket.on("group_message:updated", invalidateChats);
    socket.on("direct_message:typing", handleDirectTyping);
    socket.on("group_message:typing", handleGroupTyping);
    socket.on("presence:snapshot", handlePresenceSnapshot);
    socket.on("presence:changed", handlePresenceChanged);

    return () => {
      socket.off("direct_message:new", invalidateChats);
      socket.off("direct_message:updated", invalidateChats);
      socket.off("direct_message:read", invalidateChats);
      socket.off("group_chat:created", invalidateChats);
      socket.off("group_message:new", invalidateChats);
      socket.off("group_message:updated", invalidateChats);
      socket.off("direct_message:typing", handleDirectTyping);
      socket.off("group_message:typing", handleGroupTyping);
      socket.off("presence:snapshot", handlePresenceSnapshot);
      socket.off("presence:changed", handlePresenceChanged);
    };
  }, [token, queryClient]);

  const typingConversationIds = useMemo(
    () => Array.from(new Set(groupTypingUsers.map((u) => u.conversationUuid))),
    [groupTypingUsers]
  );

  return (
    <ChatSocketContext.Provider
      value={{
        typingUserIds,
        typingConversationIds,
        groupTypingUsers,
        onlineUserIds,
      }}
    >
      {children}
    </ChatSocketContext.Provider>
  );
}

export function useChatSocketState(): ChatSocketState {
  return useContext(ChatSocketContext);
}
