import { initLlama, LlamaContext } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';

// Qwen 2.5 0.5B Instruct Q4_K_M (~400MB)
const MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf';
const MODEL_FILENAME = 'qwen2.5-0.5b-instruct-q4_k_m.gguf';

export type DownloadProgressCallback = (progress: number) => void;

export interface RunContext {
  distanceKm: number;
  elapsedSeconds: number;
  currentSpeedMs: number;
  avgPaceSecPerKm: number;
  targetPaceSecPerKm: number;
  targetDistanceKm: number;
  language: string;
}

function buildSystemPrompt(lang: string): string {
  switch (lang) {
    case 'ko':
      return '당신은 러닝 앱에 내장된 전문 러닝 코치입니다. 달리는 사람의 현재 상태를 바탕으로 짧고 구체적인 격려 메시지를 제공하세요. 반드시 2문장 이내로 답하세요. 한국어로만 답하세요.';
    case 'zh':
      return '你是一个内置于跑步应用的专业跑步教练。根据跑者当前状态提供简短具体的鼓励信息。请用2句话以内回答，并只用中文回答。';
    case 'ja':
      return 'あなたはランニングアプリに組み込まれたプロのランニングコーチです。ランナーの現在の状態に基づいて、短く具体的な励ましのメッセージを提供してください。2文以内で日本語のみで答えてください。';
    default:
      return 'You are a professional running coach embedded in a running app. Provide brief, specific encouragement based on the runner\'s current stats. Keep responses under 2 sentences in English.';
  }
}

function buildUserPrompt(userMessage: string, ctx: RunContext): string {
  const avgPaceMin = Math.floor(ctx.avgPaceSecPerKm / 60);
  const avgPaceSec = Math.floor(ctx.avgPaceSecPerKm % 60);
  const targetPaceMin = Math.floor(ctx.targetPaceSecPerKm / 60);
  const targetPaceSec = Math.floor(ctx.targetPaceSecPerKm % 60);
  const elapsedMin = Math.floor(ctx.elapsedSeconds / 60);
  const elapsedSec = ctx.elapsedSeconds % 60;
  const speedKmh = (ctx.currentSpeedMs * 3.6).toFixed(1);

  const stats = `[Run stats: ${ctx.distanceKm.toFixed(2)}km / ${elapsedMin}m${elapsedSec}s elapsed / avg pace ${avgPaceMin}'${avgPaceSec}" / target ${targetPaceMin}'${targetPaceSec}" / speed ${speedKmh}km/h / goal ${ctx.targetDistanceKm}km]`;

  return `${stats}\n${userMessage}`;
}

function buildChatMLPrompt(system: string, history: { role: 'user' | 'assistant'; content: string }[], userMsg: string): string {
  let prompt = `<|im_start|>system\n${system}<|im_end|>\n`;
  for (const turn of history) {
    prompt += `<|im_start|>${turn.role}\n${turn.content}<|im_end|>\n`;
  }
  prompt += `<|im_start|>user\n${userMsg}<|im_end|>\n<|im_start|>assistant\n`;
  return prompt;
}

class LlmCoachService {
  private llamaCtx: LlamaContext | null = null;
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  private isInitializing = false;

  getModelPath(): string {
    return `${FileSystem.documentDirectory}${MODEL_FILENAME}`;
  }

  async isModelDownloaded(): Promise<boolean> {
    const info = await FileSystem.getInfoAsync(this.getModelPath());
    return info.exists;
  }

  async downloadModel(onProgress: DownloadProgressCallback): Promise<void> {
    const dest = this.getModelPath();
    const downloadResumable = FileSystem.createDownloadResumable(
      MODEL_URL,
      dest,
      {},
      (dp) => {
        if (dp.totalBytesExpectedToWrite > 0) {
          onProgress(dp.totalBytesWritten / dp.totalBytesExpectedToWrite);
        }
      }
    );
    const result = await downloadResumable.downloadAsync();
    if (!result || result.status !== 200) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
      throw new Error('모델 다운로드 실패');
    }
  }

  async deleteModel(): Promise<void> {
    await FileSystem.deleteAsync(this.getModelPath(), { idempotent: true });
    await this.unload();
  }

  async load(): Promise<void> {
    if (this.llamaCtx || this.isInitializing) return;
    const modelPath = this.getModelPath();
    const info = await FileSystem.getInfoAsync(modelPath);
    if (!info.exists) throw new Error('모델 파일이 없습니다. 먼저 다운로드해 주세요.');

    this.isInitializing = true;
    try {
      this.llamaCtx = await initLlama({
        model: modelPath,
        use_mlock: true,
        n_ctx: 2048,
        n_batch: 512,
        n_gpu_layers: 1, // Android GPU 가속
      });
      this.conversationHistory = [];
    } finally {
      this.isInitializing = false;
    }
  }

  async unload(): Promise<void> {
    if (this.llamaCtx) {
      await this.llamaCtx.release();
      this.llamaCtx = null;
    }
    this.conversationHistory = [];
  }

  isLoaded(): boolean {
    return this.llamaCtx !== null;
  }

  resetConversation(): void {
    this.conversationHistory = [];
  }

  async chat(userMessage: string, runCtx: RunContext): Promise<string> {
    if (!this.llamaCtx) throw new Error('LLM이 로드되지 않았습니다.');

    const system = buildSystemPrompt(runCtx.language);
    const userWithStats = buildUserPrompt(userMessage, runCtx);
    const prompt = buildChatMLPrompt(system, this.conversationHistory, userWithStats);

    const result = await this.llamaCtx.completion({
      prompt,
      n_predict: 150,
      temperature: 0.7,
      top_k: 40,
      top_p: 0.9,
      stop: ['<|im_end|>', '<|im_start|>'],
    });

    const response = result.text.trim();

    // 대화 히스토리 유지 (최대 6턴)
    this.conversationHistory.push({ role: 'user', content: userWithStats });
    this.conversationHistory.push({ role: 'assistant', content: response });
    if (this.conversationHistory.length > 12) {
      this.conversationHistory = this.conversationHistory.slice(-12);
    }

    return response;
  }

  async generateAutoCoaching(runCtx: RunContext): Promise<string> {
    const prompts: Record<string, string> = {
      ko: '지금 내 페이스와 상태를 보고 짧게 코칭해줘.',
      en: 'Give me a quick coaching tip based on my current pace.',
      zh: '根据我目前的配速给我一个简短的建议。',
      ja: '今のペースを見て短くアドバイスをください。',
      es: 'Dame un consejo rápido basado en mi ritmo actual.',
      hi: 'मेरी वर्तमान गति के आधार पर एक त्वरित सुझाव दें।',
    };
    const msg = prompts[runCtx.language] ?? prompts['en'];
    return this.chat(msg, runCtx);
  }
}

export const llmCoachService = new LlmCoachService();
