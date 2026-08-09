import { db } from "./firebase";
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot, 
  limit, 
  getDoc,
  setDoc,
  increment
} from "firebase/firestore";
import { Message, Conversation, ChatSummary } from "@/types";

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  text: string,
  memberIds: string[],
  title: string = "Chat", // the display name of the other user/group
  replyTo?: { id: string; text: string; senderId: string }
) => {
  const batch = writeBatch(db);
  
  const messageRef = doc(collection(db, "conversations", conversationId, "messages"));
  
  // Create the message document
  const messageData: Partial<Message> = {
    id: messageRef.id,
    conversationId,
    senderId,
    type: "text",
    ciphertext: text, // Storing plaintext for now until Step 15 E2E Encryption
    createdAt: Date.now(), // Use client timestamp for optimistic UI, server will override or we just use serverTimestamp()
    edited: false,
    showEditedLabel: false,
    deleted: false,
    replyTo: replyTo || null,
  };
  
  // We use serverTimestamp in Firestore, but returning Date.now() for local optimstic UI
  batch.set(messageRef, {
    ...messageData,
    createdAt: serverTimestamp()
  });

  // Update conversation doc
  const convRef = doc(db, "conversations", conversationId);
  batch.set(convRef, {
    lastMessageAt: serverTimestamp(),
  }, { merge: true });

  // Update Chat Summary for all members
  memberIds.forEach(uid => {
    const summaryRef = doc(db, "userChats", uid, "chats", conversationId);
    
    // In a real production app, title/avatar should probably not be hardcoded like this here,
    // but rather fetched or handled via Cloud Functions or denormalized carefully.
    // For now, we update it simply.
    batch.set(summaryRef, {
      conversationId,
      lastMessagePreview: text.substring(0, 50),
      lastMessageAt: serverTimestamp(),
      unreadCount: uid === senderId ? 0 : increment(1),
    // We only set these if they don't exist
    }, { merge: true });
    
    // Auto-add to contacts for direct chats
    if (conversationId.startsWith("direct_") && memberIds.length === 2) {
      const otherUid = memberIds.find(id => id !== uid);
      if (otherUid) {
        const contactRef = doc(db, "users", uid, "contacts", otherUid);
        batch.set(contactRef, { uid: otherUid, addedAt: serverTimestamp() }, { merge: true });
      }
    }
  });

  // Trigger Push Notification in background
  if (typeof window !== 'undefined') {
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        messageId: messageRef.id,
        text,
        senderId,
        receiverIds: memberIds.filter(id => id !== senderId),
        senderName: title
      })
    }).catch(console.error);
  }

  await batch.commit();
  return messageData;
};

// Create a new direct conversation
export const createDirectConversation = async (user1Id: string, user2Id: string) => {
  // Sort IDs to ensure conversation ID is consistent regardless of who creates it
  const members = [user1Id, user2Id].sort();
  const conversationId = `direct_${members[0]}_${members[1]}`;
  
  const convRef = doc(db, "conversations", conversationId);
  const convSnap = await getDoc(convRef);
  
  if (!convSnap.exists()) {
    const batch = writeBatch(db);
    batch.set(convRef, {
      id: conversationId,
      type: "DIRECT",
      members,
      createdAt: serverTimestamp(),
    });
    
    // Add to each other's contacts
    const contactRef1 = doc(db, "users", user1Id, "contacts", user2Id);
    const contactRef2 = doc(db, "users", user2Id, "contacts", user1Id);
    
    batch.set(contactRef1, { uid: user2Id, addedAt: serverTimestamp() }, { merge: true });
    batch.set(contactRef2, { uid: user1Id, addedAt: serverTimestamp() }, { merge: true });
    
    await batch.commit();
  }
  
  return conversationId;
};

// Create a new group conversation
export const createGroupConversation = async (groupName: string, members: string[], creatorId: string) => {
  const conversationId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const convRef = doc(db, "conversations", conversationId);
  await setDoc(convRef, {
    id: conversationId,
    type: "GROUP",
    name: groupName,
    members,
    admins: [creatorId],
    createdAt: serverTimestamp(),
  });
  
  // Add chat summary for all members
  const batch = writeBatch(db);
  members.forEach(uid => {
    const summaryRef = doc(db, "userChats", uid, "chats", conversationId);
    batch.set(summaryRef, {
      conversationId,
      title: groupName,
      lastMessagePreview: "Group created",
      lastMessageAt: serverTimestamp(),
      unreadCount: uid === creatorId ? 0 : 1,
    });
  });
  
  await batch.commit();
  return conversationId;
};

// Update typing status
export const setTypingStatus = async (conversationId: string, uid: string, isTyping: boolean) => {
  const typingRef = doc(db, "conversations", conversationId, "typing", uid);
  if (isTyping) {
    await setDoc(typingRef, {
      uid,
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(typingRef, {
      uid,
      isTyping: false,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
};

// Advanced features
export const markChatAsRead = async (conversationId: string, uid: string) => {
  const batch = writeBatch(db);
  
  // 1. Reset unread count in summary
  const summaryRef = doc(db, "userChats", uid, "chats", conversationId);
  batch.set(summaryRef, { unreadCount: 0 }, { merge: true });

  // 2. Update lastRead for status tracking
  const convRef = doc(db, "conversations", conversationId);
  batch.set(convRef, {
    lastRead: {
      [uid]: Date.now() // using client time to avoid timestamp sync complexity for simple reads
    }
  }, { merge: true });

  await batch.commit();
};

export const deleteMessage = async (conversationId: string, messageId: string, forEveryone: boolean, uid: string) => {
  const messageRef = doc(collection(db, "conversations", conversationId, "messages"), messageId);
  if (forEveryone) {
    await setDoc(messageRef, { deleted: true, ciphertext: "This message was deleted." }, { merge: true });
  } else {
    // Delete for me
    const msgSnap = await getDoc(messageRef);
    if (msgSnap.exists()) {
      const data = msgSnap.data();
      const deletedBy = data.deletedBy || [];
      if (!deletedBy.includes(uid)) {
        await setDoc(messageRef, { deletedBy: [...deletedBy, uid] }, { merge: true });
      }
    }
  }
};

export const togglePinMessage = async (conversationId: string, messageId: string, isPinned: boolean) => {
  const convRef = doc(db, "conversations", conversationId);
  const convSnap = await getDoc(convRef);
  
  if (convSnap.exists()) {
    const currentPins = convSnap.data().pinnedMessageIds || [];
    let newPins = [...currentPins];
    
    if (isPinned && !newPins.includes(messageId)) {
      newPins.push(messageId);
    } else if (!isPinned) {
      newPins = newPins.filter((id: string) => id !== messageId);
    }
    
    await setDoc(convRef, { pinnedMessageIds: newPins }, { merge: true });
  }
};
