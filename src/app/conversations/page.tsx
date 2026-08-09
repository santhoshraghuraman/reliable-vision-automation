'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { MOCK_CONVERSATIONS } from '@/lib/mockData';
import { Conversation, Message } from '@/types';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { BUSINESS_INFO } from '@/lib/constants';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>(MOCK_CONVERSATIONS[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  const [newReplyText, setNewReplyText] = useState('');

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];

  const filteredConversations = conversations.filter(
    (c) =>
      c.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.leadBusiness.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.leadPhone.includes(searchTerm)
  );

  const handleSendManualReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyText.trim()) return;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      leadId: activeConv.leadId,
      conversationId: activeConv.id,
      direction: 'outbound',
      message: newReplyText.trim(),
      createdAt: new Date().toISOString(),
      isAiGenerated: false,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConv.id) {
          return {
            ...c,
            lastMessage: newReplyText.trim(),
            lastMessageTime: new Date().toISOString(),
            messages: [...c.messages, newMsg],
          };
        }
        return c;
      })
    );

    setNewReplyText('');
  };

  const toggleHumanTakeover = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convId) {
          return { ...c, needsHuman: !c.needsHuman };
        }
        return c;
      })
    );
  };

  return (
    <DashboardLayout
      title="WhatsApp Conversations & AI Log"
      subtitle="Live chat simulation, AI auto-replies, and human takeover control"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
        {/* Left Column (4 cols): Search & Conversations List */}
        <Card className="lg:col-span-4 flex flex-col h-full overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-base">Conversations ({conversations.length})</CardTitle>

              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                AI Agent Active
              </span>
            </div>
            <Input
              placeholder="Search chat or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
              className="text-xs"
            />
          </CardHeader>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2">
            {filteredConversations.map((conv) => {
              const isSelected = conv.id === activeConvId;

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-brand-600/20 border border-brand-500/50 shadow-md'
                      : 'hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{conv.leadName}</span>
                    <span className="text-[10px] text-slate-400">
                      {formatTimeAgo(conv.lastMessageTime)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">{conv.leadBusiness}</span>
                    <Badge variant="temperature" temperature={conv.temperature} />
                  </div>

                  <p className="text-xs text-slate-400 truncate italic">"{conv.lastMessage}"</p>

                  {conv.needsHuman && (
                    <div className="flex items-center gap-1 text-[10px] text-rose-400 font-semibold pt-1">
                      <PhoneCall className="h-3 w-3" /> Human Handoff Requested
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right Column (8 cols): Chat Window & Timeline */}
        <Card className="lg:col-span-8 flex flex-col h-full overflow-hidden border-slate-800">
          {/* Chat Window Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-brand-400 font-bold text-sm border border-slate-700">
                {activeConv.leadName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{activeConv.leadName}</h3>
                  <Badge variant="temperature" temperature={activeConv.temperature} />
                </div>
                <p className="text-xs text-slate-400">
                  {activeConv.leadBusiness} • {activeConv.leadPhone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 px-3 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Human Takeover</span>
                <Toggle
                  checked={activeConv.needsHuman || false}
                  onChange={() => toggleHumanTakeover(activeConv.id)}
                />
              </div>
            </div>
          </div>

          {/* Chat Messages Timeline Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/40">
            {activeConv.messages.map((msg) => {
              const isInbound = msg.direction === 'inbound';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                    {isInbound ? (
                      <span className="font-semibold text-slate-300">{activeConv.leadName}</span>
                    ) : msg.isAiGenerated ? (
                      <span className="flex items-center gap-1 text-brand-400 font-semibold">
                        <Bot className="h-3 w-3" /> Reliable Vision AI Assistant
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-400">Santhosh (Human Admin)</span>
                    )}
                    <span>• {formatDate(msg.createdAt)}</span>
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm ${
                      isInbound
                        ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                        : msg.isAiGenerated
                        ? 'bg-brand-600 text-white rounded-tr-none shadow-brand-600/20'
                        : 'bg-emerald-600 text-white rounded-tr-none shadow-emerald-600/20'
                    }`}
                  >
                    <p>{msg.message}</p>
                    {msg.intent && (
                      <span className="mt-2 inline-block text-[9px] bg-slate-950/50 text-brand-200 px-2 py-0.5 rounded font-mono uppercase">
                        Intent: {msg.intent}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Send Message Input Box */}
          <form
            onSubmit={handleSendManualReply}
            className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                activeConv.needsHuman
                  ? 'Type human admin reply to take over conversation...'
                  : 'Type manual override message or let AI respond...'
              }
              value={newReplyText}
              onChange={(e) => setNewReplyText(e.target.value)}
              className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Send className="h-4 w-4" />}
            >
              Send
            </Button>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
