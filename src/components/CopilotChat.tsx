import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, X, Sparkles, User, FileText, Minimize2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function CopilotChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Meu nome é **Stark**, a inteligência artificial da plataforma SGC. Como posso te auxiliar?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) throw new Error('Usuário não autenticado');

      // We only send the last 4 messages to save context limit
      const historyContext = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('copilot', {
        body: { message: userMessage, historyContext },
      });

      if (error) throw error;
      
      if (data?.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
      } else if (data?.error) {
         setMessages(prev => [...prev, { role: 'assistant', content: `Erro interno: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, não consegui processar a resposta no momento.' }]);
      }
    } catch (error: any) {
      console.error('Copilot Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Houve um erro de comunicação com os servidores da IA. Verifique sua conexão ou tente novamente mais tarde.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPageSuggestions = () => {
    const path = location.pathname;
    if (path.includes('/crm')) return ["Como mudo a etapa de um lead?", "O que acontece ao clicar em Aprovar Venda?"];
    if (path.includes('/inventario')) return ["Como adicionar um novo produto?", "O que significa 'Quantidade de Vidas'?"];
    if (path.includes('/configuracoes')) return ["Como crio um perfil de segurança?", "Onde configuro as notificações?"];
    if (path.includes('/aprovacoes')) return ["Como aprovar acesso de novos usuários?", "Como recusar uma cotação?"];
    return ["Como funciona o registro de atividades?", "Qual meu nível de acesso?", "O que é o módulo CRM?"];
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto bg-card border border-border/50 shadow-brand rounded-2xl w-[360px] h-[520px] mb-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 zoom-in-95 duration-200" style={{ transformOrigin: 'bottom right' }}>
          
          {/* Header */}
          <div className="bg-primary/90 backdrop-blur text-primary-foreground p-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display leading-tight">Stark</h3>
                <p className="text-[10px] text-primary-foreground/70 font-medium">IA Especialista SGC</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-white/20 hover:text-white" onClick={() => setIsOpen(false)}>
              <Minimize2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-end gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-primary text-primary-foreground shadow-sm'}`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble */}
                  <div className={`p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground rounded-br-none shadow-sm' 
                      : 'bg-card border border-border/50 text-foreground rounded-bl-none shadow-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug prose-p:my-1 prose-a:text-primary">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-snug">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-end gap-1.5 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-sm flex items-center justify-center shrink-0 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="p-3 bg-card border border-border/50 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1 text-muted-foreground h-10 px-4">
                   <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                   <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-card border-t border-border/50 shrink-0">
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {getPageSuggestions().map(sug => (
                  <button 
                    key={sug} 
                    onClick={() => { setInput(sug); }}
                    className="text-[10px] bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 py-1 px-2.5 rounded-full transition-colors truncate max-w-[90%]"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pergunte algo sobre o sistema..." 
                className="h-9 text-sm rounded-xl border-border/50 shadow-sm pr-10 focus-visible:ring-primary/20"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="h-9 w-9 shrink-0 shadow-sm rounded-xl">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <div className="pointer-events-auto group">
        <Button 
          onClick={() => setIsOpen(!isOpen)} 
          className="h-[52px] w-[52px] rounded-full shadow-brand relative p-0 overflow-hidden transform transition-all active:scale-95 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shrink-0"
        >
          {/* Subtle pulse effect */}
          <div className="absolute inset-0 bg-white/20 animate-ping opacity-0 group-hover:opacity-100 rounded-full" style={{ animationDuration: '3s' }} />
          
          {isOpen ? (
            <X className="w-5 h-5 transition-transform duration-300 rotate-0" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-0.5 tracking-tight transition-transform duration-300">
              <Bot className="w-6 h-6 mb-0.5" />
            </div>
          )}
        </Button>
      </div>

    </div>
  );
}
