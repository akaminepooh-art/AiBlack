/**
 * Indicator Service
 * テクニカル指標の計算とメタデータ管理
 */

import { spawn } from 'child_process';
import path from 'path';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

export interface IndicatorMetadata {
  name: string;
  fullName: string;
  category: 'standard' | 'momentum' | 'volatility' | 'trend' | 'volume';
  description: string;
  parameters: Array<{
    name: string;
    type: 'number' | 'string' | 'boolean';
    default: any;
    min?: number;
    max?: number;
    description: string;
  }>;
}

export interface IndicatorResult {
  displayType: 'single-line' | 'multi-line' | 'histogram' | 'band';
  values: number[];
  lineConfig?: {
    color: string;
    lineWidth: number;
  };
  metadata: {
    period?: number;
    calculatedPoints: number;
    indicator: string;
    version: string;
    dataPoints: number;
  };
}

export class IndicatorService {
  private metadata: Record<string, IndicatorMetadata> = {
    sma: {
      name: 'sma',
      fullName: 'Simple Moving Average',
      category: 'trend',
      description: '指定期間の終値の単純平均を計算します',
      parameters: [
        {
          name: 'period',
          type: 'number',
          default: 20,
          min: 2,
          max: 200,
          description: '計算期間'
        }
      ]
    },
    ema: {
      name: 'ema',
      fullName: 'Exponential Moving Average',
      category: 'trend',
      description: '指数移動平均を計算します。直近の価格により大きな重みを置きます',
      parameters: [
        {
          name: 'period',
          type: 'number',
          default: 20,
          min: 2,
          max: 200,
          description: '計算期間'
        }
      ]
    },
    rsi: {
      name: 'rsi',
      fullName: 'Relative Strength Index',
      category: 'momentum',
      description: '相対力指数。買われすぎ・売られすぎを判断する指標',
      parameters: [
        {
          name: 'period',
          type: 'number',
          default: 14,
          min: 2,
          max: 100,
          description: '計算期間'
        }
      ]
    },
    macd: {
      name: 'macd',
      fullName: 'Moving Average Convergence Divergence',
      category: 'momentum',
      description: '移動平均収束拡散法。トレンドの方向性と強さを示します',
      parameters: [
        {
          name: 'fastPeriod',
          type: 'number',
          default: 12,
          min: 2,
          max: 100,
          description: '短期EMA期間'
        },
        {
          name: 'slowPeriod',
          type: 'number',
          default: 26,
          min: 2,
          max: 100,
          description: '長期EMA期間'
        },
        {
          name: 'signalPeriod',
          type: 'number',
          default: 9,
          min: 2,
          max: 100,
          description: 'シグナル線期間'
        }
      ]
    },
    bollinger: {
      name: 'bollinger',
      fullName: 'Bollinger Bands',
      category: 'volatility',
      description: 'ボリンジャーバンド。価格の変動範囲を示します',
      parameters: [
        {
          name: 'period',
          type: 'number',
          default: 20,
          min: 2,
          max: 200,
          description: '計算期間'
        },
        {
          name: 'stdDev',
          type: 'number',
          default: 2,
          min: 1,
          max: 3,
          description: '標準偏差の倍数'
        }
      ]
    }
  };

  /**
   * 全インジケーターのメタデータを取得
   */
  async getAllMetadata(): Promise<Record<string, IndicatorMetadata>> {
    return this.metadata;
  }

  /**
   * インジケーターを計算
   */
  async calculate(
    indicator: string,
    candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>,
    parameters?: Record<string, any>
  ): Promise<IndicatorResult> {
    try {
      logger.info(`Calculating indicator: ${indicator}`, { parameters, candleCount: candles.length });

      // Python スクリプトを実行
      const pythonPath = env.pythonPath || 'python3';
      const scriptPath = path.join(process.cwd(), 'python-indicators', 'calculate.py');

      const result = await this.executePython(pythonPath, scriptPath, {
        indicator,
        candles,
        parameters: parameters || {}
      });

      return result;
    } catch (error) {
      logger.error(`Failed to calculate indicator ${indicator}:`, error);
      throw error;
    }
  }

  /**
   * Python スクリプトを実行
   */
  private async executePython(pythonPath: string, scriptPath: string, input: any): Promise<IndicatorResult> {
    return new Promise((resolve, reject) => {
      const python = spawn(pythonPath, [scriptPath]);
      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          logger.error('Python process failed:', { code, stderr, stdout });
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          logger.error('Failed to parse Python output:', { stdout, stderr });
          reject(new Error('Failed to parse indicator calculation result'));
        }
      });

      python.on('error', (error) => {
        logger.error('Failed to spawn Python process:', error);
        reject(error);
      });

      // 入力データを送信
      python.stdin.write(JSON.stringify(input));
      python.stdin.end();
    });
  }
}
