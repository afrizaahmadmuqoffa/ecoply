'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getChatMessages, sendMessage } from '@/lib/supabase/actions/chat'
import { AlertTriangle, Check, Circle, Loader2, MessageCircle, Send } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeletons'

type ChatMessage = {
  id: string
  thread_id: string
  sender_id: string
  content: string
  created_at: string
  read_at: string | null
}

interface ChatPanelProps {
  threadId: string
  currentUserId: string
  height?: string
  fullscreen?: boolean
}

export default function ChatPanel({
  threadId,
  currentUserId,
  height = 'h-[500px]',
  fullscreen = false,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getChatMessages(threadId)
      if (result.error) {
        setError(result.error as string)
      } else {
        setMessages((result.data || []) as ChatMessage[])
      }
      setLoading(false)
    }
    load()
  }, [threadId])

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`chat_messages_${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(async () => {
    const content = inputValue.trim()
    if (!content || sending) return

    setSending(true)
    setError(null)

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      thread_id: threadId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setInputValue('')

    const formData = new FormData()
    formData.append('thread_id', threadId)
    formData.append('content', content)

    const result = await sendMessage(formData)
    setSending(false)

    if (result.error) {
      setError(result.error as string)
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setInputValue(content)
    } else if (result.data) {
      const real = result.data as ChatMessage
      setMessages((prev) => {
        if (prev.some((m) => m.id === real.id)) {
          return prev.filter((m) => m.id !== optimisticMsg.id)
        }
        return prev.map((m) => (m.id === optimisticMsg.id ? real : m))
      })
    }
  }, [inputValue, sending, threadId, currentUserId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className={`flex flex-col ${fullscreen ? 'h-full' : height} bg-surface ${fullscreen ? '' : 'border border-border rounded-[22px] border-b-0 shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)]'} overflow-hidden animate-fade-in`}>
        <div className="flex-1 overflow-hidden p-5 flex flex-col justify-end gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <Skeleton
                className={`h-11 ${
                  i % 2 === 0 ? 'w-3/5 rounded-[18px] rounded-br-md' : 'w-2/5 rounded-[18px] rounded-bl-md'
                }`}
              />
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 flex-1 rounded-full" />
            <Skeleton className="w-11 h-11 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col ${fullscreen ? 'h-full' : height} bg-surface ${fullscreen ? '' : 'border border-border rounded-[22px]'} overflow-hidden ${fullscreen ? '' : 'shadow-[0_12px_24px_-16px_rgba(11,31,22,0.08)]'}`}>
      {/* Messages area */}
      <div className={`flex-1 overflow-y-auto ${fullscreen ? 'px-4 sm:px-8 lg:px-16 xl:px-24 py-6' : 'p-5'} space-y-3 bg-canvas/40`}>
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-mint flex items-center justify-center mx-auto mb-3 shadow-[0_8px_16px_-8px_rgba(85,158,123,0.3)]">
              <MessageCircle className="w-7 h-7 text-sage-dark" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-bold text-ink tracking-tight">Mulai percakapan</p>
            <p className="text-xs text-muted mt-1">Kirim pesan pertama di bawah</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId
          const isTemp = msg.id.startsWith('temp-')

          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] px-4 py-2.5 text-sm relative group ${
                  isMine
                    ? 'bg-gradient-to-br from-sage to-sage-dark text-white rounded-[18px] rounded-br-md shadow-[0_4px_8px_-4px_rgba(85,158,123,0.4)]'
                    : 'bg-surface text-ink border border-border rounded-[18px] rounded-bl-md shadow-[0_4px_8px_-8px_rgba(11,31,22,0.06)]'
                } ${isTemp ? 'opacity-70' : ''}`}
              >
                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1.5 font-medium tabular-nums flex items-center gap-1 ${
                  isMine ? 'text-white/70' : 'text-muted'
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {isTemp && (
                    <>
                      <Circle className="w-2.5 h-2.5 animate-pulse" fill="currentColor" />
                      mengirim...
                    </>
                  )}
                  {isMine && !isTemp && (
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                  )}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className={`px-4 ${fullscreen ? 'sm:px-8 lg:px-16 xl:px-24' : ''} py-2.5 bg-red-50 border-t border-red-200 flex items-center gap-2`}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-700 flex-shrink-0" strokeWidth={2} />
          <p className="text-xs text-red-700 truncate">{error}</p>
        </div>
      )}

      {/* Input area */}
      <div className={`border-t border-border ${fullscreen ? 'px-4 sm:px-8 lg:px-16 xl:px-24 py-4 sm:py-5' : 'p-4'} bg-surface`}>
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
            rows={1}
            className="flex-1 px-4 py-2.5 bg-canvas border border-border rounded-2xl text-sm text-ink focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 resize-none max-h-32 transition-all"
            style={{ minHeight: '44px' }}
          />
          <button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            className="group w-11 h-11 bg-sage hover:bg-sage-dark text-white rounded-2xl hover:-translate-y-0.5 hover:shadow-[0_8px_16px_-4px_rgba(85,158,123,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex-shrink-0 flex items-center justify-center"
          >
            {sending ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={2} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-muted mt-2 text-center font-medium tracking-wide">
          Enter untuk kirim · Shift+Enter untuk baris baru
        </p>
      </div>
    </div>
  )
}