"use client";
import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ChatBox() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Add a welcome message on first load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "ai",
          answer: "👋 Hi! I'm <b>MiniMind</b>, your friendly AI. Ask me anything and I'll do my best to help, with easy-to-understand explanations!",
          explanation: {
            steps: ["Say hello"],
            features_used: ["Greeting"],
            model_logic: "Welcome the user."
          },
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    }
    // eslint-disable-next-line
  }, []);

  async function send() {
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setLoading(true);

    const now = new Date().toLocaleTimeString();
    setMessages(m => [...m, { role: "user", text: userMessage, timestamp: now }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setMessages(m => [
        ...m,
        {
          role: "ai",
          answer: data.answer,
          explanation: data.explanation,
          timestamp: new Date().toLocaleTimeString()
        },
      ]);
    } catch (error) {
      setMessages(m => [
        ...m,
        {
          role: "ai",
          answer: "Sorry, I encountered an error. Please try again.",
          explanation: { error: String(error) },
          timestamp: new Date().toLocaleTimeString()
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center min-h-screen w-full z-50 animate-fade-in">
      <Card className="w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl rounded-2xl border bg-background">
        <CardHeader className="bg-primary rounded-t-2xl px-8 py-6 flex items-center gap-4">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarImage src="/minimind-avatar.png" alt="MiniMind" />
            <AvatarFallback>MM</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl text-primary-foreground font-bold tracking-tight">MiniMind Chat</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 px-0 py-6 bg-background rounded-b-2xl" style={{ minHeight: 384 }}>
          <div ref={scrollRef} className="flex flex-col gap-3 px-8 pb-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'} group`}
            >
              <div className={`flex items-end max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <Avatar className="w-8 h-8">
                  {m.role === 'user' ? (
                    <AvatarFallback>U</AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src="/minimind-avatar.png" alt="MiniMind" />
                      <AvatarFallback>MM</AvatarFallback>
                    </>
                  )}
                </Avatar>
                <div className={`ml-2 mr-2 flex flex-col items-${m.role === 'user' ? 'end' : 'start'} w-full`}>
                  <div className={`text-xs text-muted-foreground mb-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>{m.timestamp}</div>
                  <div
                    className={`rounded-xl px-4 py-2 text-base shadow-sm whitespace-pre-line break-words ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-foreground rounded-bl-md'
                    } animate-fade-in`}
                  >
                    {m.role === 'user' ? (
                      m.text
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: m.answer?.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&') || m.answer }} />
                    )}
                  </div>
                  {m.role === 'ai' && m.explanation && (
                    <details className="mt-2 w-full">
                      <summary className="cursor-pointer text-xs text-muted-foreground">How I decided</summary>
                      <pre className="text-xs mt-1 bg-white dark:bg-gray-900 p-2 rounded border whitespace-pre-wrap overflow-x-auto">
                        {typeof m.explanation === 'string' ? m.explanation : JSON.stringify(m.explanation, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
        <Separator />
        <form
          className="flex gap-2 items-end p-8 border-t bg-background sticky bottom-0 z-10"
          onSubmit={e => {
            e.preventDefault();
            send();
          }}
        >
          <Textarea
            className="flex-1 resize-none border-2 border-primary focus:border-primary focus:ring-2 focus:ring-primary rounded-xl px-4 py-4 text-lg bg-white dark:bg-gray-900 shadow-sm"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={loading ? "MiniMind is thinking..." : "Ask MiniMind anything in plain English..."}
            disabled={loading}
            rows={2}
            autoFocus
          />
          <Button type="submit" disabled={loading || !input.trim()} size="lg" className="min-w-[120px] rounded-xl text-lg shadow-md">
            {loading ? 'Thinking...' : 'Send'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
