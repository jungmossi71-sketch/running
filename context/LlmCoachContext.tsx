import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { llmCoachService, RunContext } from './LlmCoachService';

export type LlmStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface LlmCoachContextType {
  status: LlmStatus;
  downloadProgress: number;
  errorMessage: string | null;
  messages: ChatMessage[];
  isGenerating: boolean;
  isModelDownloaded: boolean;
  checkModelExists: () => Promise<void>;
  downloadAndLoad: () => Promise<void>;
  unload: () => Promise<void>;
  deleteModel: () => Promise<void>;
  sendMessage: (text: string, runCtx: RunContext) => Promise<void>;
  triggerAutoCoaching: (runCtx: RunContext) => Promise<string | null>;
  clearMessages: () => void;
}

const LlmCoachContext = createContext<LlmCoachContextType | null>(null);

export function LlmCoachProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LlmStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const generatingRef = useRef(false);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const checkModelExists = useCallback(async () => {
    const exists = await llmCoachService.isModelDownloaded();
    setIsModelDownloaded(exists);
    if (exists && status === 'idle') {
      setStatus('idle');
    }
  }, [status]);

  const downloadAndLoad = useCallback(async () => {
    try {
      setErrorMessage(null);
      const alreadyDownloaded = await llmCoachService.isModelDownloaded();

      if (!alreadyDownloaded) {
        setStatus('downloading');
        setDownloadProgress(0);
        await llmCoachService.downloadModel((p) => setDownloadProgress(p));
        setIsModelDownloaded(true);
      }

      setStatus('loading');
      await llmCoachService.load();
      setStatus('ready');
    } catch (e: any) {
      setErrorMessage(e.message ?? '알 수 없는 오류');
      setStatus('error');
    }
  }, []);

  const unload = useCallback(async () => {
    await llmCoachService.unload();
    setStatus('idle');
    setMessages([]);
  }, []);

  const deleteModel = useCallback(async () => {
    await llmCoachService.deleteModel();
    setIsModelDownloaded(false);
    setStatus('idle');
    setMessages([]);
  }, []);

  const sendMessage = useCallback(async (text: string, runCtx: RunContext) => {
    if (generatingRef.current || status !== 'ready') return;
    generatingRef.current = true;
    setIsGenerating(true);
    addMessage('user', text);
    try {
      const response = await llmCoachService.chat(text, runCtx);
      addMessage('assistant', response);
    } catch (e: any) {
      addMessage('assistant', `⚠ ${e.message}`);
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
    }
  }, [status, addMessage]);

  const triggerAutoCoaching = useCallback(async (runCtx: RunContext): Promise<string | null> => {
    if (!llmCoachService.isLoaded()) return null;
    try {
      const response = await llmCoachService.generateAutoCoaching(runCtx);
      addMessage('assistant', response);
      return response;
    } catch {
      return null;
    }
  }, [addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    llmCoachService.resetConversation();
  }, []);

  return (
    <LlmCoachContext.Provider value={{
      status,
      downloadProgress,
      errorMessage,
      messages,
      isGenerating,
      isModelDownloaded,
      checkModelExists,
      downloadAndLoad,
      unload,
      deleteModel,
      sendMessage,
      triggerAutoCoaching,
      clearMessages,
    }}>
      {children}
    </LlmCoachContext.Provider>
  );
}

export function useLlmCoach() {
  const ctx = useContext(LlmCoachContext);
  if (!ctx) throw new Error('useLlmCoach must be used within LlmCoachProvider');
  return ctx;
}
