import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import Button from './ui/Button';
import MeituanCard from './ui/MeituanCard';
import { askRecipeQuestionStream } from '../api/recipe';
import { useRecipeChatStatus } from '../hooks/queries/useRecipeQueries';
import type { RecipeChatHistoryItem } from '../types/api';

interface ChatMessage extends RecipeChatHistoryItem {
  id: string;
}

interface RecipeAiChatProps {
  recipeId: number;
  recipeName: string;
}

const QUICK_QUESTIONS = [
  '这一步为什么要这样做？',
  '可以用其他食材代替吗？',
  '火候和时间怎么掌握？',
  '有什么常见问题需要注意？',
];

const RecipeAiChat = ({ recipeId, recipeName }: RecipeAiChatProps) => {
  const [expanded, setExpanded] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: chatStatus } = useRecipeChatStatus();

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  const sendQuestion = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const assistantId = `assistant-${Date.now()}`;
    const history = messages.map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setIsStreaming(true);

    try {
      await askRecipeQuestionStream(
        {
          recipe_id: recipeId,
          question: trimmed,
          history,
        },
        (delta) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: msg.content + delta } : msg
            )
          );
        }
      );
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : 'AI 回答失败，请稍后重试';
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: msg.content
                  ? `${msg.content}\n\n⚠️ ${errorText}`
                  : `⚠️ ${errorText}`,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    sendQuestion(input);
  };

  const isConfigured = chatStatus?.configured ?? false;

  return (
    <MeituanCard className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-mt-text">AI 做菜助手</h2>
            <p className="text-xs text-mt-text-secondary">
              DeepSeek · 做饭过程中随时提问
            </p>
          </div>
        </div>
        <MessageCircle
          className={`h-5 w-5 text-mt-text-muted transition-transform ${expanded ? 'rotate-0' : ''}`}
        />
      </button>

      {expanded && (
        <div className="border-t border-mt-border">
          {!isConfigured && (
            <div className="mx-4 mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
              后端尚未配置 DeepSeek API Key。请在{' '}
              <code className="rounded bg-white/80 px-1">backend/.env</code>{' '}
              中设置 <code className="rounded bg-white/80 px-1">DEEPSEEK_API_KEY</code>{' '}
              后重启后端服务。
            </div>
          )}

          <div
            ref={listRef}
            className="scrollbar-hide max-h-72 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 ? (
              <div className="rounded-xl bg-mt-gray-50 px-3 py-4 text-center">
                <Bot className="mx-auto mb-2 h-8 w-8 text-indigo-400" />
                <p className="text-sm text-mt-text-secondary">
                  正在做「{recipeName}」？有不懂的步骤随时问我
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'rounded-br-md bg-mt-yellow text-mt-text'
                        : 'rounded-bl-md bg-mt-gray-100 text-mt-text'
                    }`}
                  >
                    {msg.content ||
                      (isStreaming && msg.role === 'assistant' ? (
                        <span className="inline-block h-4 w-0.5 animate-pulse bg-indigo-400" />
                      ) : null)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendQuestion(q)}
                disabled={!isConfigured || isStreaming}
                className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-mt-border p-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：第二步需要大火还是小火？"
              disabled={!isConfigured || isStreaming}
              className="mt-input flex-1 disabled:opacity-60"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!isConfigured || !input.trim() || isStreaming}
              className="shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </MeituanCard>
  );
};

export default RecipeAiChat;
