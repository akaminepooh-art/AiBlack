/**
 * Vision Service - GPT-4 Vision API Integration
 * Phase 5: チャート画像分析とAI対話機能 + ATR/ADX標準インジケーター対応
 */

import OpenAI from 'openai';
import logger from '../utils/logger';

// ===== 型定義 =====

interface TechnicalData {
  currentPrice: number;
  priceRange: {
    high: number;
    low: number;
    range: number;
    rangePercent: number;
  };
  candleCount: number;
  timeRange: {
    start: string;
    end: string;
  };
  displayedIndicators: {
    [key: string]: {
      value?: number;
      values?: number[];
      upper?: number;
      middle?: number;
      lower?: number;
      macd?: number;
      signal?: number;
      histogram?: number;
    };
  };
  additionalIndicators: {
    atr?: number;
    adx?: number;
  };
}

interface QuickAnalysisResult {
  disclaimer: string;
  trend: {
    direction: 'uptrend' | 'downtrend' | 'sideways';
    strength: '強い' | '中程度' | '弱い';
    description: string;
  };
  pattern: {
    detected: string[];
    confidence: '高' | '中' | '低';
    description: string;
  };
  levels: {
    support: number[];
    resistance: number[];
  };
  indicators: {
    [key: string]: {
      value?: number;
      upper?: number;
      middle?: number;
      lower?: number;
      macd?: number;
      signal?: number;
      histogram?: number;
      interpretation: string;
    };
  };
  recommendation: {
    action: string;
    reason: string;
    scenarios: Array<{
      case: string;
      conditions: string;
      entry: string;
      target: string;
      stopLoss: string;
      probability: string;
    }>;
    riskFactors: string[];
    conclusion: string;
  };
}

interface ConversationMessage {
  question: string;
  answer: string;
}

// ===== Vision Service クラス =====

class VisionService {
  private client: OpenAI;
  private readonly MODEL = 'gpt-4o';
  private readonly MAX_TOKENS = 2000;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }

    this.client = new OpenAI({
      apiKey: apiKey
    });

    logger.info('Vision Service initialized with ATR/ADX support');
  }

  /**
   * Quick Analysis - ワンクリックでチャート総合分析
   * @param technicalData - テクニカルデータ（価格、インジケーター値など）
   */
  async quickAnalysis(
    imageBase64: string,
    symbol: string,
    interval: string,
    indicators: string[] | Array<{ name: string; params: Record<string, any> }>,
    technicalData: TechnicalData
  ): Promise<QuickAnalysisResult> {
    try {
      logger.info(`Quick Analysis started for ${symbol} ${interval}`);
      logger.info('Technical Data:', JSON.stringify(technicalData, null, 2));

      const prompt = this.createQuickAnalysisPrompt(symbol, interval, indicators, technicalData);
      
      const response = await this.client.chat.completions.create({
        model: this.MODEL,
        max_tokens: this.MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from GPT-4 Vision');
      }

      const result = this.parseQuickAnalysisResponse(content);
      
      logger.info(`Quick Analysis completed for ${symbol}`);
      
      return result;

    } catch (error) {
      logger.error('Quick Analysis error:', error);
      throw error;
    }
  }

  /**
   * Ask AI - 会話形式でチャートについて質問
   */
  async askAI(
    imageBase64: string,
    question: string,
    context: {
      symbol: string;
      interval: string;
      indicators: string[] | Array<{ name: string; params: Record<string, any> }>;
    },
    conversationHistory?: ConversationMessage[]
  ): Promise<string> {
    try {
      logger.info('Ask AI request:', question);

      const prompt = this.createAskAIPrompt(question, context, conversationHistory);
      
      const response = await this.client.chat.completions.create({
        model: this.MODEL,
        max_tokens: this.MAX_TOKENS,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
      });

      const answer = response.choices[0]?.message?.content;
      
      if (!answer) {
        throw new Error('No response from GPT-4 Vision');
      }

      logger.info('Ask AI completed');
      
      return answer;

    } catch (error) {
      logger.error('Ask AI error:', error);
      throw error;
    }
  }

  /**
   * Quick Analysisプロンプト作成（規制対応版 + テクニカルデータ明示）
   */
  private createQuickAnalysisPrompt(
    symbol: string,
    interval: string,
    _indicators: string[] | Array<{ name: string; params: Record<string, any> }>,
    technicalData: TechnicalData
  ): string {
    // テクニカルデータセクション
    const technicalDataSection = `
【📊 チャートデータ（テキスト補足情報）】
通貨ペア: ${symbol}
時間軸: ${interval}
データ範囲: ${technicalData.timeRange.start} ～ ${technicalData.timeRange.end}
ローソク足数: ${technicalData.candleCount}本

【💰 価格情報】
現在価格: ${technicalData.currentPrice.toFixed(2)}
期間高値: ${technicalData.priceRange.high.toFixed(2)}
期間安値: ${technicalData.priceRange.low.toFixed(2)}
価格レンジ: ${technicalData.priceRange.range.toFixed(2)} (約${technicalData.priceRange.rangePercent.toFixed(2)}%)

❗️❗️ **重要**: シナリオ分析では、必ず上記の現在価格 (${technicalData.currentPrice.toFixed(2)}) を基準にして、実際の価格レンジ内（${technicalData.priceRange.low.toFixed(2)}～${technicalData.priceRange.high.toFixed(2)}）で分析を行ってください。

【📈 表示中のインジケーター値】
${this.formatDisplayedIndicators(technicalData.displayedIndicators)}

【📊 追加のテクニカル指標】
${this.formatAdditionalIndicators(technicalData.additionalIndicators)}
`;

    return `【教育目的のチャート分析アシスタント】

**重要な注意事項**:
- これは教育目的のチャート分析例です
- 金融商品取引の推奨ではありません
- 投資判断は自己責任で行ってください
- 過去の分析結果は将来の成果を保証しません

あなたはテクニカル分析の教育用アシスタントです。

${technicalDataSection}

【分析項目】
1. トレンド分析（方向性・強度・説明）
2. チャートパターン検出（パターン名・信頼度・説明）
3. サポート/レジスタンス（現在価格 ${technicalData.currentPrice.toFixed(2)} 付近の複数レベルを特定）
4. インジケーター分析（上記の実際の値を使って解釈）
5. 教育的洞察（3つの可能性シナリオを提示）

【出力フォーマット（厳守）】:
以下のJSON形式で出力してください。必ず有効なJSONとして出力すること。

{
  "disclaimer": "⚠️ 本分析は教育目的の参考情報です。投資助言ではありません。投資判断は自己責任で行ってください。",
  "trend": {
    "direction": "uptrend | downtrend | sideways",
    "strength": "強い | 中程度 | 弱い",
    "description": "トレンドの詳細説明（ATR=${technicalData.additionalIndicators.atr?.toFixed(2) || 'N/A'}, ADX=${technicalData.additionalIndicators.adx?.toFixed(2) || 'N/A'}を考慮）"
  },
  "pattern": {
    "detected": ["パターン名1", "パターン名2"],
    "confidence": "高 | 中 | 低",
    "description": "パターンの説明"
  },
  "levels": {
    "support": [${technicalData.currentPrice * 0.995}, ${technicalData.currentPrice * 0.99}],
    "resistance": [${technicalData.currentPrice * 1.005}, ${technicalData.currentPrice * 1.01}]
  },
  "indicators": {
    "ATR(14)": { "value": ${technicalData.additionalIndicators.atr?.toFixed(2) || 0}, "interpretation": "ボラティリティの状態" },
    "ADX(14)": { "value": ${technicalData.additionalIndicators.adx?.toFixed(2) || 0}, "interpretation": "トレンドの強さ（ADX>25で強いトレンド）" }
  },
  "recommendation": {
    "action": "教育例：上昇可能性 | 教育例：下降可能性 | 教育例：様子見推奨",
    "reason": "判断理由（現在価格 ${technicalData.currentPrice.toFixed(2)} 基準、ATR/ADXを含む）",
    "scenarios": [
      { 
        "case": "強気シナリオ", 
        "conditions": "条件（例：レジスタンス ${(technicalData.currentPrice * 1.005).toFixed(2)} を上抜け）", 
        "entry": "${(technicalData.currentPrice * 1.002).toFixed(2)}", 
        "target": "${(technicalData.currentPrice * 1.01).toFixed(2)}～${(technicalData.currentPrice * 1.015).toFixed(2)}", 
        "stopLoss": "${(technicalData.currentPrice * 0.995).toFixed(2)}",
        "probability": "60%" 
      },
      { 
        "case": "弱気シナリオ", 
        "conditions": "条件（例：サポート ${(technicalData.currentPrice * 0.995).toFixed(2)} を下抜け）", 
        "entry": "${(technicalData.currentPrice * 0.998).toFixed(2)}", 
        "target": "${(technicalData.currentPrice * 0.99).toFixed(2)}～${(technicalData.currentPrice * 0.985).toFixed(2)}", 
        "stopLoss": "${(technicalData.currentPrice * 1.005).toFixed(2)}",
        "probability": "25%" 
      },
      { 
        "case": "中立シナリオ", 
        "conditions": "条件（例：${(technicalData.currentPrice * 0.995).toFixed(2)}～${(technicalData.currentPrice * 1.005).toFixed(2)}のレンジ内で推移）", 
        "entry": "レンジ上限/下限付近", 
        "target": "レンジ反対側", 
        "stopLoss": "レンジブレイク時",
        "probability": "15%" 
      }
    ],
    "riskFactors": ["リスク要因1（ATR=${technicalData.additionalIndicators.atr?.toFixed(2)}でボラティリティを考慮）", "リスク要因2"],
    "conclusion": "総合的な教育的見解（現在価格 ${technicalData.currentPrice.toFixed(2)} 基準、断定表現を避ける）"
  }
}

【重要な制約】:
- 断定表現を避ける（「～すべき」「推奨」は禁止）
- 必ず3つのシナリオ（強気・弱気・中立）を提示
- **各シナリオの確率は必ず%形式で表示（例: "60%", "25%", "15%"）**
- **各シナリオには entry, target, stopLoss を具体的な価格で記載（現在価格 ${technicalData.currentPrice.toFixed(2)} を基準）**
- **確率の合計は100%になるように調整**
- 「教育例：」「可能性」「シナリオ」などの表現を使用
- リスク要因を必ず記載
- **提供されたテクニカルデータの実際の値を使って分析すること**
- **ATR(${technicalData.additionalIndicators.atr?.toFixed(2)})とADX(${technicalData.additionalIndicators.adx?.toFixed(2)})を indicators セクションに必ず含めること**
- **すべての数値は実際の値を返すこと（プレースホルダーは使用禁止）**
- **JSONとして有効な形式で出力すること（コメントは不要）**

【出力形式の厳密な指示】:
1. **JSON以外のテキストを一切含めないこと**
2. **出力は { で始まり } で終わること**
3. **コメント(//や/* */)を絶対に含めないこと**
4. **説明文や補足をJSON外に書かないこと**
5. **純粋なJSONのみを返すこと**
`;
  }

  /**
   * Ask AIプロンプト作成（規制対応版）
   */
  private createAskAIPrompt(
    question: string,
    context: {
      symbol: string;
      interval: string;
      indicators: string[] | Array<{ name: string; params: Record<string, any> }>;
    },
    conversationHistory?: ConversationMessage[]
  ): string {
    let historySection = '';
    
    if (conversationHistory && conversationHistory.length > 0) {
      historySection = '\n【これまでの会話】\n';
      conversationHistory.forEach((msg, index) => {
        historySection += `Q${index + 1}: ${msg.question}\nA${index + 1}: ${msg.answer}\n\n`;
      });
    }

    return `【教育目的のチャート分析アシスタント】

**重要な注意事項**:
- これは教育目的のチャート分析例です
- 金融商品取引の推奨ではありません
- 投資判断は自己責任で行ってください
- 過去の分析結果は将来の成果を保証しません

あなたはテクニカル分析の教育用アシスタントです。
ユーザーからの質問に対して、チャート画像を分析して回答してください。

【チャート情報】
- 通貨ペア: ${context.symbol}
- 時間軸: ${context.interval}
- 使用インジケーター: ${JSON.stringify(context.indicators, null, 2)}
${historySection}
【ユーザーの質問】
${question}

【回答ガイドライン】:
1. 断定表現を避ける（「～かもしれません」「～の可能性があります」）
2. 複数の可能性を提示する
3. リスクを明示する
4. 「教育例として」「参考情報として」などの表現を使用
5. 具体的な売買判断は示さず、分析の視点を提供する
6. **ATR/ADXなどのテクニカル指標も考慮に入れる**

上記を踏まえて、教育的な観点から回答してください。`;
  }

  /**
   * 表示中のインジケーターをフォーマット
   */
  private formatDisplayedIndicators(indicators: TechnicalData['displayedIndicators']): string {
    const lines: string[] = [];
    
    for (const [name, data] of Object.entries(indicators)) {
      if (name.startsWith('RSI')) {
        lines.push(`${name}: ${data.value?.toFixed(2) || 'N/A'}`);
      } else if (name.startsWith('MACD')) {
        lines.push(`${name}: MACD=${data.macd?.toFixed(4) || 'N/A'}, Signal=${data.signal?.toFixed(4) || 'N/A'}, Histogram=${data.histogram?.toFixed(4) || 'N/A'}`);
      } else if (name.startsWith('Bollinger')) {
        lines.push(`${name}: Upper=${data.upper?.toFixed(2) || 'N/A'}, Middle=${data.middle?.toFixed(2) || 'N/A'}, Lower=${data.lower?.toFixed(2) || 'N/A'}`);
      } else if (name.startsWith('SMA') || name.startsWith('EMA')) {
        if (data.value !== undefined) {
          lines.push(`${name}: ${data.value.toFixed(2)}`);
        } else if (data.values && data.values.length > 0) {
          const latestValue = data.values[data.values.length - 1];
          lines.push(`${name}: ${latestValue.toFixed(2)}`);
        }
      }
    }
    
    return lines.length > 0 ? lines.join('\n') : '（表示中のインジケーターなし）';
  }

  /**
   * 追加のテクニカル指標をフォーマット
   */
  private formatAdditionalIndicators(additionalIndicators: TechnicalData['additionalIndicators']): string {
    const lines: string[] = [];
    
    if (additionalIndicators.atr !== undefined) {
      lines.push(`ATR(14): ${additionalIndicators.atr.toFixed(2)} - ボラティリティ（値動きの大きさ）を示す。高いほど変動が大きい。`);
    }
    
    if (additionalIndicators.adx !== undefined) {
      const strength = additionalIndicators.adx > 25 ? '強いトレンド' : additionalIndicators.adx > 20 ? '中程度のトレンド' : '弱いトレンド';
      lines.push(`ADX(14): ${additionalIndicators.adx.toFixed(2)} - トレンドの強さを示す（${strength}）。25以上で強いトレンド。`);
    }
    
    return lines.length > 0 ? lines.join('\n') : '（追加の指標なし）';
  }

  /**
   * GPT-4 Visionレスポンスをパース
   */
  private parseQuickAnalysisResponse(content: string): QuickAnalysisResult {
    try {
      // JSONコードブロックの抽出を試みる
      let jsonStr = content;
      
      // ```json ... ``` 形式のコードブロックを削除
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      // パース
      const parsed = JSON.parse(jsonStr);
      
      // 型チェック（基本的な検証）
      if (!parsed.trend || !parsed.pattern || !parsed.levels || !parsed.indicators || !parsed.recommendation) {
        throw new Error('Invalid response structure');
      }
      
      return parsed as QuickAnalysisResult;
      
    } catch (error) {
      logger.error('Failed to parse Quick Analysis response:', error);
      logger.error('Raw content length:', content?.length || 0);
      // Save raw content to file for debugging
      const fs = require('fs');
      const path = require('path');
      const debugPath = path.join(__dirname, '../../logs/vision-debug-response.txt');
      const logsDir = path.dirname(debugPath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      fs.writeFileSync(debugPath, content || 'No content', 'utf-8');
      logger.error(`Raw content saved to: ${debugPath}`);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  }
}

export default new VisionService();
