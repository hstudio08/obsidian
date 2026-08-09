import { useState, useRef, useEffect } from "react";
import { sendMessage, setTypingStatus } from "@/lib/chat";
import { Message } from "@/types";

interface MessageInputProps {
  conversationId: string;
  user: any;
  displayNameToUse: string;
  replyingToMessage: Message | null;
  setReplyingToMessage: (msg: Message | null) => void;
  memberIds: string[];
}

const QUICK_EMOJIS = [
  "😀", "😂", "😊", "😍", "🥰", "😘", "😜", "😎", "🤩", "🥳",
  "😏", "😒", "😔", "😢", "😭", "😤", "😡", "🤯", "😳", "😱",
  "👍", "👎", "🙏", "🤝", "👏", "🔥", "💯", "✨", "❤️", "💔"
];

export function MessageInput({
  conversationId,
  user,
  displayNameToUse,
  replyingToMessage,
  setReplyingToMessage,
  memberIds
}: MessageInputProps) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateTyping = (typing: boolean) => {
    if (!user) return;
    setTypingStatus(conversationId, user.uid, typing).catch(console.error);
  };

  const handleInputTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px"; // reset to recalculate
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + "px"; // Max height before scrolling
    }
    
    if (!isTyping) {
      setIsTyping(true);
      updateTyping(true);
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateTyping(false);
    }, 2000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    setShowEmojiPicker(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user || isSending) return;
    
    const text = inputText.trim();
    
    // Strict Input Validation
    const words = text.split(/\s+/);
    if (words.length > 500) {
      alert("Message exceeds the maximum limit of 500 words.");
      return;
    }
    if (words.some(word => word.length > 500)) {
      alert("A single continuous word cannot exceed 500 characters.");
      return;
    }
    
    setInputText(""); 
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px"; // reset input UI
    }
    setIsSending(true);
    setShowEmojiPicker(false);
    
    setIsTyping(false);
    updateTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    try {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
      } catch(e) {}
      
      await sendMessage(
        conversationId, 
        user.uid, 
        text, 
        memberIds, 
        user.displayName || "User",
        replyingToMessage ? { id: replyingToMessage.id, text: replyingToMessage.ciphertext || "", senderId: replyingToMessage.senderId } : undefined
      );
      setReplyingToMessage(null);
    } catch (err) {
      console.error("Error sending message", err);
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md px-4 py-3 pb-safe border-t border-border z-20 flex flex-col">
      {replyingToMessage && (
        <div className="mb-2 bg-surface border-l-4 border-primary-500 rounded-lg p-2.5 flex items-start justify-between shadow-sm self-stretch mx-1">
          <div className="overflow-hidden">
            <div className="font-semibold text-xs text-primary-500 mb-0.5">{replyingToMessage.senderId === user?.uid ? "You" : displayNameToUse}</div>
            <div className="text-sm text-foreground truncate">{replyingToMessage.ciphertext}</div>
          </div>
          <button onClick={() => setReplyingToMessage(null)} className="text-text-muted hover:text-foreground ml-2 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
      )}
      
      {showEmojiPicker && (
        <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 bg-surface border border-border rounded-2xl shadow-xl p-3 z-30 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Quick Emojis</span>
            <button type="button" onClick={() => setShowEmojiPicker(false)} className="text-text-muted hover:text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-[160px] overflow-y-auto p-1 custom-scrollbar">
            {QUICK_EMOJIS.map((emoji, idx) => (
              <button 
                key={idx}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                className="text-2xl hover:bg-surface-hover rounded-lg p-1 transition-colors flex items-center justify-center active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-end gap-2 bg-surface rounded-2xl p-1.5 shadow-sm border border-border transition-shadow focus-within:ring-1 focus-within:ring-primary-500/50">
        <button 
          type="button" 
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${showEmojiPicker ? 'bg-primary-50 text-primary-600' : 'text-text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
        </button>
        
        <div className="flex-1 flex items-center py-2 px-1">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="w-full bg-transparent resize-none outline-none text-[15px] placeholder:text-text-muted"
            rows={1}
            style={{ height: "24px", maxHeight: "120px" }}
            autoFocus
          />
        </div>
        
        <button 
          type="submit" 
          disabled={!inputText.trim() || isSending}
          className="w-10 h-10 flex-shrink-0 rounded-full bg-primary-600 disabled:bg-surface-hover disabled:text-text-muted flex items-center justify-center text-white hover:bg-primary-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </form>
    </div>
  );
}
