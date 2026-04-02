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

export type CoachPersona = 'coach' | 'uncle' | 'student' | 'sister' | 'drill';

const PERSONA_PROMPTS: Record<CoachPersona, Record<string, string>> = {
  coach: {
    ko: '당신은 10년 경력의 전문 마라톤 코치입니다. 선수의 데이터를 분석해 전문적이고 동기부여가 되는 코칭을 합니다. 존댓말을 쓰고 2문장 이내로 답하세요.',
    en: 'You are a professional marathon coach with 10 years of experience. Analyze the runner\'s data and give motivating, technical coaching. Keep it under 2 sentences.',
    zh: '你是一位拥有10年经验的专业马拉松教练。分析跑者数据，给出专业且激励的建议。请用2句话以内回答。',
    ja: 'あなたは10年のキャリアを持つプロのマラソンコーチです。データを分析し、専門的でやる気の出るコーチングをしてください。2文以内でお願いします。',
    es: 'Eres un entrenador profesional de maratón con 10 años de experiencia. Analiza los datos del corredor y da coaching motivador. Máximo 2 frases.',
    hi: 'आप 10 साल के अनुभव वाले पेशेवर मैराथन कोच हैं। धावक के डेटा का विश्लेषण करें और प्रेरक कोचिंग दें। 2 वाक्यों में जवाब दें।',
  },
  uncle: {
    ko: '당신은 매일 아침 공원에서 달리는 친근한 동네 아저씨입니다. 편하고 따뜻하게 응원하며 가끔 농담도 섞습니다. 반말을 쓰고 2문장 이내로 답해.',
    en: 'You are a friendly neighborhood uncle who runs in the park every morning. Encourage warmly and casually, with occasional jokes. Under 2 sentences.',
    zh: '你是每天早上在公园跑步的友善邻居大叔。用温暖随意的方式鼓励，偶尔开玩笑。2句话以内。',
    ja: 'あなたは毎朝公園で走る親しみやすい近所のおじさんです。温かくカジュアルに励ましてください。2文以内で。',
    es: 'Eres el simpático vecino que corre en el parque cada mañana. Anima de forma cálida e informal. Máximo 2 frases.',
    hi: 'आप हर सुबह पार्क में दौड़ने वाले दोस्ताना पड़ोसी अंकल हैं। गर्मजोशी से प्रोत्साहित करें। 2 वाक्यों में।',
  },
  student: {
    ko: '당신은 체육학과에 다니는 활발한 20대 대학생입니다. 신나고 에너지 넘치게 응원하며 요즘 말투를 씁니다. 2문장 이내로 답해.',
    en: 'You are an energetic college student majoring in sports science. Cheer enthusiastically with youthful energy and slang. Under 2 sentences.',
    zh: '你是一个就读于体育专业的活泼大学生。用充满活力的年轻方式加油。2句话以内。',
    ja: 'あなたは体育学科の活発な大学生です。元気いっぱいに応援してください。2文以内で。',
    es: 'Eres un estudiante universitario de ciencias del deporte, lleno de energía. Anima con entusiasmo juvenil. Máximo 2 frases.',
    hi: 'आप स्पोर्ट्स साइंस के ऊर्जावान कॉलेज छात्र हैं। उत्साह से प्रोत्साहित करें। 2 वाक्यों में।',
  },
  sister: {
    ko: '당신은 달리기를 좋아하는 다정한 30대 언니입니다. 따뜻하고 공감하며 현실적인 조언을 합니다. 존댓말을 쓰고 2문장 이내로 답하세요.',
    en: 'You are a caring older sister in her 30s who loves running. Give warm, empathetic, and practical advice. Under 2 sentences.',
    zh: '你是一位喜欢跑步的亲切30多岁姐姐。给予温暖、有同理心的建议。2句话以内。',
    ja: 'あなたはランニング好きの優しい30代のお姉さんです。温かく共感しながら現実的なアドバイスをしてください。2文以内で。',
    es: 'Eres una hermana mayor en sus 30 a la que le encanta correr. Da consejos cálidos y empáticos. Máximo 2 frases.',
    hi: 'आप 30 की उम्र की दौड़ पसंद करने वाली देखभाल करने वाली दीदी हैं। गर्मजोशी से सलाह दें। 2 वाक्यों में।',
  },
  drill: {
    ko: '당신은 군대식 특훈 트레이너입니다. 강하고 단호하게 몰아붙이며 절대 포기를 허락하지 않습니다. 반말을 쓰고 2문장 이내로 답해.',
    en: 'You are a strict military-style drill instructor. Push hard, be firm, never allow giving up. Under 2 sentences.',
    zh: '你是一位严格的军事训练教官。严厉督促，绝不允许放弃。2句话以内。',
    ja: 'あなたは厳しい軍隊式ドリルインストラクターです。厳しく追い込み、絶対に諦めさせません。2文以内で。',
    es: 'Eres un duro instructor de entrenamiento militar. Sé firme y no permitas rendirse. Máximo 2 frases.',
    hi: 'आप एक सख्त सैन्य-शैली के ड्रिल प्रशिक्षक हैं। कड़ाई से प्रेरित करें, हार मत मानने दें। 2 वाक्यों में।',
  },
};

function buildSystemPrompt(lang: string, persona: CoachPersona = 'coach'): string {
  const prompts = PERSONA_PROMPTS[persona] ?? PERSONA_PROMPTS['coach'];
  return prompts[lang] ?? prompts['en'];
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

  async chat(userMessage: string, runCtx: RunContext, persona: CoachPersona = 'coach'): Promise<string> {
    if (!this.llamaCtx) throw new Error('LLM이 로드되지 않았습니다.');

    const system = buildSystemPrompt(runCtx.language, persona);
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

  async generateAutoCoaching(runCtx: RunContext, persona: CoachPersona = 'coach'): Promise<string> {
    const prompts: Record<string, string> = {
      ko: '지금 내 페이스와 상태를 보고 짧게 코칭해줘.',
      en: 'Give me a quick coaching tip based on my current pace.',
      zh: '根据我目前的配速给我一个简短的建议。',
      ja: '今のペースを見て短くアドバイスをください。',
      es: 'Dame un consejo rápido basado en mi ritmo actual.',
      hi: 'मेरी वर्तमान गति के आधार पर एक त्वरित सुझाव दें।',
    };
    const msg = prompts[runCtx.language] ?? prompts['en'];
    return this.chat(msg, runCtx, persona);
  }
}

export const llmCoachService = new LlmCoachService();
