export type UserRole = "USER";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  role: UserRole;
  age: number;
  avatarUrl: string; // Generated deterministic avatar
  location?: string;
  blockedUserIds?: string[];
  restrictedUserIds?: string[];
  hideEmail?: boolean; // Deprecated in favor of emailVisibility
  emailVisibility?: "everyone" | "contacts" | "nobody";
  avatarVisibility?: "everyone" | "contacts" | "nobody";
  muteAllNotifications?: boolean;
  createdAt: number;
}

export interface UsernameReservation {
  uid: string;
  username: string;
  createdAt: number;
}

export type ConversationType = "DIRECT" | "GROUP";

export interface Conversation {
  id: string;
  type: ConversationType;
  members: string[]; // array of uids
  createdAt: number;
  // Group specific
  name?: string;
  avatarUrl?: string;
  creatorId?: string;
  admins?: string[]; // array of uids
  // Advanced features
  pinnedMessageIds?: string[];
  lastRead?: Record<string, number>; // uid -> timestamp
  lastDelivered?: Record<string, number>; // uid -> timestamp
}

export type MessageStatus = "pending" | "sent" | "delivered" | "read" | "failed";
export type MessageType = "text" | "image_normal" | "image_hd" | "image_hd_plus";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  ciphertext?: string; // Encrypted text content or metadata
  attachmentUrl?: string;
  attachmentMetadata?: {
    filename?: string;
    size?: number;
    width?: number;
    height?: number;
  };
  createdAt: number;
  edited: boolean;
  showEditedLabel: boolean;
  deleted: boolean;
  deletedBy?: string[]; // array of uids who deleted this message for themselves
  replyTo?: {
    id: string;
    text: string;
    senderId: string;
  } | null;
  status?: MessageStatus; // Client-side tracking
  isPending?: boolean; // local-only UI state for offline tracking
}

export interface ChatSummary {
  conversationId: string;
  title: string;
  avatarUrl: string;
  lastMessagePreview: string;
  lastMessageAt: number;
  unreadCount: number;
  clearedAt?: number;
}
