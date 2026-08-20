'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Conversation, Message, ConversationAIAnalysis, ConversationIntent } from '@/lib/types'
import {
  MessageSquare,
  Search,
  RefreshCw,
  Send,
  User,
  Bot,
  Phone,
  Building2,
  ExternalLink,
  CheckCheck,
  Lock,
  Sparkles,
  Zap,
  Flame,
  Snowflake,
  AlertTriangle,
  CheckCircle2,
  Check,
  XCircle,
  Clock,
  Ban,
  Edit3,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WAITING' | 'CLOSED'>('ALL')

  // AI Intelligence state
  const [aiAnalysis, setAiAnalysis] = useState<ConversationAIAnalysis | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)

  // Reply box state
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const reloadConversations = async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const res = await fetch(`/api/conversations?${params.toString()}`)
      const data = await res.json()
      if (data.conversations) {
        setConversations(data.conversations)
        if (!selectedId && data.conversations.length > 0) {
          setSelectedId(data.conversations[0].id)
        }
      }
    } catch {
      toast.error('Failed to load conversations')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    let active = true
    async function loadList() {
      try {
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        if (statusFilter !== 'ALL') params.set('status', statusFilter)

        const res = await fetch(`/api/conversations?${params.toString()}`)
        const data = await res.json()
        if (!active) return
        if (data.conversations) {
          setConversations(data.conversations)
          if (!selectedId && data.conversations.length > 0) {
            setSelectedId(data.conversations[0].id)
          }
        }
      } catch {
        // Fallback
      } finally {
        if (active) setLoadingList(false)
      }
    }
    loadList()
    return () => {
      active = false
    }
  }, [search, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages and AI analysis for selected conversation
  useEffect(() => {
    if (!selectedId) {
      return
    }
    let active = true

    async function loadMessagesAndAI() {
      setLoadingMessages(true)
      setLoadingAI(true)
      try {
        // Fetch messages
        const msgRes = await fetch(`/api/conversations/${selectedId}/messages`)
        const msgData = await msgRes.json()
        if (!active) return
        if (msgData.messages) {
          setMessages(msgData.messages)
        }

        // Fetch AI Analysis
        const aiRes = await fetch(`/api/conversations/${selectedId}/ai-analysis`)
        const aiData = await aiRes.json()
        if (!active) return
        if (aiData.analysis) {
          setAiAnalysis(aiData.analysis)
        } else {
          setAiAnalysis(null)
        }
      } catch {
        // Fallback
      } finally {
        if (active) {
          setLoadingMessages(false)
          setLoadingAI(false)
        }
      }
    }

    loadMessagesAndAI()

    // Add polling interval for delivery status updates (every 5 seconds)
    const interval = setInterval(async () => {
      if (!active || !selectedId) return
      try {
        const msgRes = await fetch(`/api/conversations/${selectedId}/messages`)
        const msgData = await msgRes.json()
        if (active && msgData.messages) {
          setMessages(msgData.messages)
        }
      } catch {
        // Silent catch for background polling
      }
    }, 5000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [selectedId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selectedConv = conversations.find((c) => c.id === selectedId)

  // Trigger on-demand AI analysis
  const handleReAnalyze = async () => {
    if (!selectedId) return
    setLoadingAI(true)
    try {
      const res = await fetch(`/api/conversations/${selectedId}/ai-analysis`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.analysis) {
        setAiAnalysis(data.analysis)
        toast.success('AI Conversation Intelligence updated!')
        reloadConversations()
      } else {
        toast.error(data.error || 'Failed to analyze conversation')
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoadingAI(false)
    }
  }

  // Send reply (manual or AI approved)
  const handleSendReply = async (customText?: string) => {
    if (!selectedId) return
    const textToSend = (customText || replyText).trim()
    if (!textToSend) return

    setSendingReply(true)
    try {
      const res = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageText: textToSend,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setMessages(data.messages || [])
        setReplyText('')
        toast.success('Reply dispatched safely via Meta WhatsApp API!')
        reloadConversations()
        // Re-analyze conversation after reply
        handleReAnalyze()
      } else {
        toast.error(data.error || 'Failed to dispatch reply')
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSendingReply(false)
    }
  }

  const getIntentBadge = (intent: ConversationIntent) => {
    switch (intent) {
      case 'PRICING':
        return { label: 'Pricing Inquiry', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' }
      case 'REQUEST_DEMO':
        return { label: 'Demo / Portfolio Request', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
      case 'REQUEST_CALLBACK':
        return { label: 'Call / Meeting Request', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' }
      case 'INTERESTED':
        return { label: 'High Interest', color: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40' }
      case 'NOT_INTERESTED':
        return { label: 'Not Interested (Opt-Out)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
      case 'NEED_MORE_INFORMATION':
        return { label: 'Info Request', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
      case 'POSITIVE':
        return { label: 'Positive Tone', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' }
      case 'NEGATIVE':
        return { label: 'Negative Sentiment', color: 'bg-red-500/20 text-red-300 border-red-500/40' }
      default:
        return { label: 'General Message', color: 'bg-gray-700/30 text-gray-300 border-gray-600/30' }
    }
  }

  const getDeliveryBadge = (status: string) => {
    const s = status.toUpperCase()
    if (s.startsWith('FAILED')) {
      return { icon: <XCircle className="w-3 h-3 text-red-500" />, text: 'FAILED', color: 'text-red-400' }
    }
    switch (s) {
      case 'QUEUED':
      case 'PROCESSING':
        return { icon: <Clock className="w-3 h-3 text-gray-500" />, text: s, color: 'text-gray-400' }
      case 'ACCEPTED':
        return { icon: <Check className="w-3 h-3 text-gray-400" />, text: 'ACCEPTED', color: 'text-gray-400' }
      case 'SENT':
        return { icon: <Check className="w-3 h-3 text-emerald-500" />, text: 'SENT', color: 'text-emerald-400' }
      case 'DELIVERED':
        return { icon: <CheckCheck className="w-3 h-3 text-emerald-500" />, text: 'DELIVERED', color: 'text-emerald-400' }
      case 'READ':
        return { icon: <CheckCheck className="w-3 h-3 text-blue-400" />, text: 'READ', color: 'text-blue-400' }
      case 'BLOCKED_TEST_MODE':
        return { icon: <Ban className="w-3 h-3 text-amber-500" />, text: 'BLOCKED (TEST MODE)', color: 'text-amber-400' }
      default:
        return { icon: <Check className="w-3 h-3 text-gray-500" />, text: s, color: 'text-gray-400' }
    }
  }

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Header
        title="Conversations"
        subtitle={`${conversations.length} active WhatsApp chat thread${conversations.length === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2">

            <Button
              variant="ghost"
              size="sm"
              onClick={reloadConversations}
              disabled={loadingList}
              icon={<RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Main 2-Panel Split View */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-gray-950">
        {/* Left Panel: Conversation Threads List */}
        <div className="md:col-span-4 lg:col-span-4 border-r border-gray-800/80 flex flex-col h-full bg-gray-900/60 overflow-hidden">
          {/* Search & Filter Bar */}
          <div className="p-3.5 border-b border-gray-800/80 space-y-2.5">
            <Input
              placeholder="Search chats by name, phone, message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />

            <div className="flex items-center gap-1">
              {(['ALL', 'ACTIVE', 'WAITING', 'CLOSED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`
                    px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors
                    ${
                      statusFilter === st
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    }
                  `}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-800/50">
            {loadingList ? (
              <div className="p-8 text-center text-xs text-gray-500 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
                <p>Loading conversation threads...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="font-semibold text-gray-400">No conversations found</p>
                <p className="text-[11px] text-gray-600 max-w-[200px] mx-auto">
                  Send a test message from the Automation tab or simulate an inbound customer reply.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedId
                const leadName = conv.lead?.name || 'Unknown Contact'
                const business = conv.lead?.business
                const phone = conv.lead?.phone || '—'
                const latestMsg = conv.messages?.[0]

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`
                      p-3.5 transition-colors cursor-pointer flex items-start gap-3
                      ${
                        isSelected
                          ? 'bg-indigo-600/15 border-l-4 border-indigo-500'
                          : 'hover:bg-gray-800/40 border-l-4 border-transparent'
                      }
                    `}
                  >
                    {/* Avatar Initials */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 shadow-md shadow-indigo-600/20">
                      {leadName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-gray-200 truncate" title={leadName}>
                          {leadName}
                        </h4>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {conv.last_message_at
                            ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })
                            : 'New'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="truncate max-w-[140px] text-gray-400" title={business || phone}>
                          {business || phone}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          conv.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          conv.status === 'WAITING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {conv.status}
                        </span>
                      </div>

                      {/* Latest Message Preview */}
                      {latestMsg ? (
                        <p className="text-[11px] text-gray-400 truncate line-clamp-1">
                          <span className="font-semibold text-gray-500">
                            {latestMsg.direction === 'OUTBOUND' ? 'You: ' : ''}
                          </span>
                          {latestMsg.message_text}
                        </p>
                      ) : (
                        <p className="text-[10px] text-gray-600 italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Panel: Selected Chat Thread & AI Intelligence */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col h-full bg-gray-950 overflow-hidden">
          {selectedConv ? (
            <>
              {/* Chat Thread Header */}
              <div className="p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md">
                    {(selectedConv.lead?.name || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">
                        {selectedConv.lead?.name || 'Unknown Contact'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {selectedConv.status}
                      </span>
                      {selectedConv.lead?.opted_out && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Opted Out
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 flex items-center gap-3 mt-0.5">
                      {selectedConv.lead?.business && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 text-gray-500" />
                          {selectedConv.lead.business}
                        </span>
                      )}
                      <span className="flex items-center gap-1 font-mono text-gray-400">
                        <Phone className="w-3 h-3 text-gray-500" />
                        {selectedConv.lead?.phone || '—'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedConv.lead && (
                    <Link href={`/leads/${selectedConv.lead.id}`}>
                      <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                        <span>Lead Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              {/* Message Timeline Area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-950">
                {loadingMessages ? (
                  <div className="p-12 text-center text-xs text-gray-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                    <p>Loading message history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-gray-800 rounded-2xl max-w-md mx-auto space-y-2 my-auto">
                    <MessageSquare className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-sm font-semibold text-gray-300">No messages in this conversation yet</p>
                    <p className="text-xs text-gray-500">
                      Send a message below to initiate dialogue with this contact.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isInbound = msg.direction === 'INBOUND'
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                      >
                        {/* Sender Label */}
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-1 px-1">
                          {isInbound ? (
                            <>
                              <User className="w-3 h-3 text-purple-400" />
                              <span className="font-semibold text-purple-300">Customer (Inbound)</span>
                            </>
                          ) : (
                            <>
                              <Bot className="w-3 h-3 text-emerald-400" />
                              <span className="font-semibold text-emerald-300">
                                {msg.sender_type === 'AI' ? 'AI Outreach (Outbound)' : 'Agency Agent'}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>{format(new Date(msg.created_at), 'MMM d, h:mm a')}</span>
                        </div>

                        {/* Bubble */}
                        <div
                          className={`
                            max-w-lg p-4 rounded-2xl text-xs leading-relaxed shadow-md
                            ${
                              isInbound
                                ? 'bg-gray-800/90 text-gray-100 border border-gray-700/80 rounded-tl-sm'
                                : 'bg-emerald-950/40 text-emerald-100 border border-emerald-500/30 rounded-tr-sm'
                            }
                          `}
                        >
                          <p className="whitespace-pre-wrap font-sans">{msg.message_text}</p>
                        </div>

                        {/* Delivery Meta */}
                        {!isInbound && msg.delivery_status && (
                          <div className={`flex items-center gap-1 text-[10px] mt-1 px-1 ${getDeliveryBadge(msg.delivery_status).color}`}>
                            {getDeliveryBadge(msg.delivery_status).icon}
                            <span title={msg.delivery_status}>{getDeliveryBadge(msg.delivery_status).text}</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Conversation Intelligence Panel */}
              <div className="p-3.5 bg-gray-900/95 border-t border-indigo-500/30 shrink-0 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-200">AI Conversation Intelligence</h4>

                    {aiAnalysis && (
                      <>
                        {/* Intent Badge */}
                        {(() => {
                          const badge = getIntentBadge(aiAnalysis.intent)
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}>
                              {badge.label}
                            </span>
                          )
                        })()}

                        {/* Temperature Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          aiAnalysis.temperature === 'HOT' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          aiAnalysis.temperature === 'WARM' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                          'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {aiAnalysis.temperature === 'HOT' && <Flame className="w-2.5 h-2.5 text-rose-400" />}
                          {aiAnalysis.temperature === 'WARM' && <Zap className="w-2.5 h-2.5 text-amber-400" />}
                          {aiAnalysis.temperature === 'COLD' && <Snowflake className="w-2.5 h-2.5 text-blue-400" />}
                          {aiAnalysis.temperature} ({aiAnalysis.confidence}%)
                        </span>
                      </>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReAnalyze}
                    disabled={loadingAI}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 h-7"
                    icon={<RefreshCw className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />}
                  >
                    Re-Analyze
                  </Button>
                </div>

                {loadingAI ? (
                  <div className="py-2 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Gemini AI is analyzing customer intent and crafting strategy...</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-2">
                    {/* Opt-Out Alert Banner if Not Interested */}
                    {(!aiAnalysis.should_continue_followup || selectedConv.lead?.opted_out) && (
                      <div className="px-3 py-2 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                        <p className="leading-snug">
                          <strong>Automated Follow-up Paused:</strong> Customer declined services or opted out.
                        </p>
                      </div>
                    )}

                    {/* Reasoning & Action */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2.5 bg-gray-950/60 border border-gray-800 rounded-xl">
                        <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px] block mb-0.5">
                          AI Reasoning:
                        </span>
                        <p className="text-gray-300 leading-relaxed">{aiAnalysis.reasoning}</p>
                      </div>

                      <div className="p-2.5 bg-gray-950/60 border border-gray-800 rounded-xl">
                        <span className="text-gray-400 font-semibold uppercase tracking-wider text-[9px] block mb-0.5">
                          Recommended Action:
                        </span>
                        <p className="text-indigo-300 font-medium leading-relaxed">{aiAnalysis.recommended_action}</p>
                      </div>
                    </div>

                    {/* AI Suggested Reply & 1-Click Approve */}
                    <div className="p-3 bg-gradient-to-r from-emerald-950/40 to-indigo-950/30 border border-emerald-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Suggested WhatsApp Reply (Human Review Gate):
                        </span>
                        <span className="text-[10px] text-gray-400">Under 250 chars</span>
                      </div>

                      <p className="text-xs text-emerald-100 font-sans leading-relaxed bg-gray-950/70 p-2.5 rounded-lg border border-emerald-500/20">
                        {aiAnalysis.suggested_reply}
                      </p>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplyText(aiAnalysis.suggested_reply)}
                          className="text-xs border-gray-700 text-gray-300 hover:text-white h-7 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit in Composer</span>
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSendReply(aiAnalysis.suggested_reply)}
                          loading={sendingReply}
                          disabled={!aiAnalysis.should_continue_followup && !selectedConv.lead?.opted_out}
                          className="bg-emerald-600 hover:bg-emerald-500 border-none text-xs h-7 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Approve & Send (WhatsApp)</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-gray-500">
                    <p>No AI analysis generated yet.</p>
                  </div>
                )}
              </div>

              {/* Quick Reply Composer */}
              <div className="p-3.5 border-t border-gray-800 bg-gray-900/90 space-y-2 shrink-0">
                <div className="flex items-center justify-between text-[11px] text-gray-400">

                  <span className="text-gray-500">Meta WhatsApp Cloud API</span>
                </div>

                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a custom WhatsApp reply or edit suggested pitch above..."
                    className="flex-1 px-3.5 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-sans"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendReply()
                      }
                    }}
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => handleSendReply()}
                    loading={sendingReply}
                    disabled={!replyText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 border-none px-4 flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="space-y-3 max-w-sm">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-gray-200">No Conversation Selected</h3>
                <p className="text-xs text-gray-500">
                  Select a chat thread from the left list to view message history and AI conversation intelligence.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
