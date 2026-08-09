import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    if (!adminDb || !adminMessaging) {
      return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });
    }

    const { conversationId, messageId, text, senderId, receiverIds, senderName } = await req.json();

    if (!conversationId || !senderId || !receiverIds || receiverIds.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tokens: string[] = [];
    const userTokensMap = new Map<string, string[]>();

    // Fetch FCM tokens for all receivers
    for (const uid of receiverIds) {
      const userSnap = await adminDb.collection("users").doc(uid).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
          tokens.push(...userData.fcmTokens);
          userTokensMap.set(uid, userData.fcmTokens);
        }
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json({ success: true, message: "No FCM tokens found for receivers" });
    }

    const payload = {
      notification: {
        title: senderName || 'New Message',
        body: text || 'You received a new message',
      },
      data: {
        conversationId,
        messageId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        url: `/chats/${conversationId}`
      },
      tokens: tokens,
    };

    // Send notifications
    const response = await adminMessaging.sendEachForMulticast(payload);
    
    // Update lastDelivered for successful deliveries
    if (response.successCount > 0) {
      const deliveredTo: Record<string, number> = {};
      const now = Date.now();
      
      // We assume if it succeeded for at least one token of a user, it's delivered
      for (const uid of receiverIds) {
        const userTokens = userTokensMap.get(uid) || [];
        // Check if any of this user's tokens were successful
        const isDelivered = userTokens.some((token) => {
          const tokenIndex = tokens.indexOf(token);
          if (tokenIndex !== -1 && response.responses[tokenIndex].success) {
            return true;
          }
          return false;
        });

        if (isDelivered) {
          deliveredTo[uid] = now;
        }
      }

      if (Object.keys(deliveredTo).length > 0) {
        // Update conversation lastDelivered
        const updateData: any = {};
        for (const [uid, timestamp] of Object.entries(deliveredTo)) {
          updateData[`lastDelivered.${uid}`] = timestamp;
        }
        await adminDb.collection("conversations").doc(conversationId).update(updateData);
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent: response.successCount, 
      failed: response.failureCount 
    });

  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
