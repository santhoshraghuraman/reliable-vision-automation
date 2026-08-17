'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Sparkles,
  PhoneCall,
  User,
  Building,
  CheckCircle2,
  Bot,
  Clock,
  Flame,
  Zap,
  Snowflake,
  RefreshCw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Conversation, Message } from '@/types';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Fetch conversations joined with leads and messages
      const { data: convsData, error: convErr } = await supabase
        .from('conversations')
        .select(`
          *,
          leads (
            id, name, phone, business, category, status
          ),
          messages (
            id, lead_id, conversation_id, direction, message, created_at, message_type
          )
        `)
        .order('last_message_at', { ascending: false });

      if (!convErr && convsData && convsData.length > 0) {
        const mappedConvs: Conversation[] = convsData.map((item: any) => {
          const lead = item.leads || {};
          const msgList: Message[] = (item.messages || []).map((m: any) => ({
            id: m.id,
            leadId: m.lead_id,
            conversationId: m.conversation_id,
            direction: m.direction,
            message: m.message,
            createdAt: m.created_at,
            isAiGenerated: m.message_type === 'template' || m.message_type === 'system',
          }));

          const lastMsg = msgList.length > 0 ? msgList[msgList.length - 1].message : 'No messages yet';

          return {
            id: item.id,
            leadId: item.lead_id,
            leadName: lead.name || 'Client Lead',
            leadPhone: lead.phone || '',
            leadBusiness: lead.business || 'Local Business',
            category: lead.category || 'General',
            temperature: lead.status || 'cold',
            status: item.status === 'handoff' ? 'human_handoff' : 'active',
            lastMessage: lastMsg,
            lastMessageTime: item.last_message_at || item.created_at,
            unreadCount: 0,
            messages: msgList,
            needsHuman: item.status === 'handoff',
          };
        });

        setConversations(mappedConvs);
        if (!activeConvId || !mappedConvs.some((c) => c.id === activeConvId)) {
          setActiveConvId(mappedConvs[0].id);
        }
      } else {
        setConversations([]);
        setActiveConvId(null);
      }
    } catch (_) {
      setConversations([]);
      setActiveConvId(null);
    } finally {
      setLoading(false);
    }
  }, [activeConvId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const filteredConversations = conversations.filter(
    (c) =>
      c.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.leadBusiness.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.leadPhone.includes(searchTerm)
  );

  const handleSendManualReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyText.trim() || !activeConv) return;

    const messageText = newReplyText.trim();
    setNewReplyText('');

    try {
      // Try sending via WhatsApp API first (will save to DB automatically)
      const sendResponse = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activeConv.leadPhone,
          message: messageText,
          lead_id: activeConv.leadId,
          conversation_id: activeConv.id,
          is_ai_generated: false,
        }),
      });

      const sendResult = await sendResponse.json();

      if (sendResult.success) {
        // WhatsApp sent + DB saved — refresh conversations
        fetchConversations();
      } else if (sendResult.config_required) {
        // WhatsApp not configured: fall back to DB-only save (local testing mode)
        const supabase = createClient();
        await supabase.from('messages').insert({
          conversation_id: activeConv.id,
          lead_id: activeConv.leadId,
          direction: 'outbound',
          message: messageText,
          message_type: 'text',
          is_ai_generated: false,
        });
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', activeConv.id);
        fetchConversations();
      } else {
        console.error('[Send] WhatsApp send failed:', sendResult.error);
        // Still refresh to show any partial saves
        fetchConversations();
      }
    } catch (_) {
      // Full local fallback
      const localMsg: Message = {
        id: `msg-${Date.now()}`,
        leadId: activeConv.leadId,
        conversationId: activeConv.id,
        direction: 'outbound',
        message: messageText,
        createdAt: new Date().toISOString(),
        isAiGenerated: false,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConv.id) {
            return {
              ...c,
              lastMessage: messageText,
              lastMessageTime: new Date().toISOString(),
              messages: [...c.messages, localMsg],
            };
          }
          return c;
        })
      );
    }
  };

  const toggleHumanTakeover = async (convId: string) => {
    const target = conversations.find((c) => c.id === convId);
    if (!target) return;

    const newNeedsHuman = !target.needsHuman;
    const newStatus = newNeedsHuman ? 'handoff' : 'active';

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          return { ...c, needsHuman: newNeedsHuman };
        }
        return c;
      })
    );

    try {
      const supabase = createClient();
      // Persist BOTH status and human_takeover boolean so the webhook
      // and Gemini AI correctly suppress auto-replies
      await supabase
        .from('conversations')
        .update({
          status: newStatus,
          human_takeover: newNeedsHuman,
        })
        .eq('id', convId);
    } catch (_) {}
  };

  return (
    <DashboardLayout
      title="WhatsApp Conversations & AI Log"
      subtitle="100% Real-time Conversations from Supabase Database"
      onImportSuccess={fetchConversations}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
        {/* Left Column (4 cols): Search & Conversations List */}
        <Card className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <CardHeader className="p-4 border-b border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-base font-extrabold tracking-tight">
                Conversations ({conversations.length})
              </CardTitle>

              <Button
                variant="ghost"
                size="sm"
                onClick={fetchConversations}
                leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
                className="text-xs text-zinc-400 p-1"
              >
                Refresh
              </Button>
            </div>
            <Input
              placeholder="Search chat or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-zinc-500" />}
              className="text-xs"
            />
          </CardHeader>

          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading database conversations...</div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'bg-[#151520] border border-purple-500/40 shadow-lg shadow-purple-500/10'
                        : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-white tracking-tight">{conv.leadName}</span>
                      <span className="text-[10px] text-zinc-500 font-medium">
                        {formatTimeAgo(conv.lastMessageTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300 font-semibold">{conv.leadBusiness}</span>
                      <Badge variant="temperature" temperature={conv.temperature} />
                    </div>

                    <p className="text-xs text-zinc-400 truncate italic font-medium">"{conv.lastMessage}"</p>

                    {conv.needsHuman && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-400 font-bold pt-1">
                        <PhoneCall className="h-3 w-3" /> Human Handoff Requested
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-white/10 rounded-2xl bg-[#0B0B12] mt-4">
                No active conversations found in database.
              </div>
            )}
          </div>
        </Card>

        {/* Right Column (8 cols): Chat Window & Timeline */}
        <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden border-white/[0.08] bg-[#101018]">
          {activeConv ? (
            <>
              {/* Chat Window Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-[#0B0B12]/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="p-[2px] rounded-full bg-gradient-to-tr from-[#833AB4] via-[#E1306C] to-[#F77737] shadow-md shadow-pink-500/20">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#101018] text-white font-extrabold text-xs">
                      {activeConv.leadName.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white tracking-tight">{activeConv.leadName}</h3>
                      <Badge variant="temperature" temperature={activeConv.temperature} />
                    </div>
                    <p className="text-xs text-zinc-400 font-medium">
                      {activeConv.leadBusiness} • {activeConv.leadPhone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-[#151520] p-1.5 px-3 rounded-2xl border border-white/[0.08] shadow-sm">
                    <span className="text-xs font-bold text-zinc-200">Human Takeover</span>
                    <Toggle
                      checked={activeConv.needsHuman || false}
                      onChange={() => toggleHumanTakeover(activeConv.id)}
                    />
                  </div>
                </div>
              </div>

              {/* Chat Messages Timeline Feed */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#07070B]/50">
                {activeConv.messages.length > 0 ? (
                  activeConv.messages.map((msg) => {
                    const isInbound = msg.direction === 'inbound';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-1 px-1 font-medium">
                          {isInbound ? (
                            <span className="font-bold text-zinc-200">{activeConv.leadName}</span>
                          ) : msg.isAiGenerated ? (
                            <span className="flex items-center gap-1 text-purple-300 font-bold bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                              <Bot className="h-3 w-3 text-purple-400" /> Reliable Vision AI Assistant
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-400">Santhosh (Human Admin)</span>
                          )}
                          <span>• {formatDate(msg.createdAt)}</span>
                        </div>

                        <div
                          className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-lg ${
                            isInbound
                              ? 'bg-[#151520] text-zinc-100 rounded-tl-none border border-white/[0.08]'
                              : msg.isAiGenerated
                              ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white rounded-tr-none shadow-pink-500/20 font-medium'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none shadow-emerald-600/20 font-medium'
                          }`}
                        >
                          <p>{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-400">No message history yet.</div>
                )}
              </div>

              {/* Send Message Input Box */}
              <form
                onSubmit={handleSendManualReply}
                className="p-3.5 border-t border-white/[0.08] bg-[#0B0B12] flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={
                    activeConv.needsHuman
                      ? 'Type human admin reply to take over conversation...'
                      : 'Type manual message to reply...'
                  }
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value)}
                  className="flex-1 rounded-full border border-white/[0.08] bg-[#101018] px-4 py-2.5 text-xs text-white placeholder-zinc-500 transition-all focus:border-purple-500/60 focus:bg-[#151520] focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<Send className="h-4 w-4" />}
                  className="rounded-full shadow-lg shadow-pink-500/20"
                >
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-zinc-500">
              <MessageSquare className="h-12 w-12 text-zinc-600 mb-3" />
              <p className="text-sm font-bold text-zinc-300">No Conversation Selected</p>
              <p className="text-xs text-zinc-500 mt-1">Import leads or start an outreach campaign to trigger conversations.</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
