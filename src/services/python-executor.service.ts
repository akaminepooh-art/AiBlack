import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { IndicatorRequest, IndicatorResponse, IndicatorErrorResponse } from '../types/indicator';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

/**
 * Python Indicator Executor Service
 * Pythonインジケーターを実行し、結果を取得するサービス
 */
export class PythonExecutorService {
  private readonly pythonPath: string;
  private readonly indicatorsDir: string;
  private readonly timeout: number;

  constructor() {
    this.pythonPath = env.pythonPath;
    this.indicatorsDir = path.resolve(process.cwd(), 'python-indicators');
    this.timeout = env.pythonTimeout;
  }

  /**
   * インジケーターを実行
   * @param indicatorName インジケーター名 (例: 'sma', 'ema')
   * @param request リクエストデータ
   * @returns インジケーター実行結果
   */
  async execute(
    indicatorName: string,
    request: IndicatorRequest
  ): Promise<IndicatorResponse | IndicatorErrorResponse> {
    const scriptPath = this.getScriptPath(indicatorName);

    logger.info(`Executing Python indicator: ${indicatorName}`, {
      scriptPath,
      candleCount: request.candleData.length,
      params: request.params,
    });

    try {
      const result = await this.spawnPythonProcess(scriptPath, request);
      logger.info(`Python indicator completed: ${indicatorName}`, {
        success: result.success,
      });
      return result;
    } catch (error) {
      logger.error(`Python indicator failed: ${indicatorName}`, { error });
      return this.createErrorResponse(error);
    }
  }

  /**
   * 利用可能なインジケーター一覧を取得
   * @returns インジケーター名の配列
   */
  async listIndicators(): Promise<string[]> {
    const fs = await import('fs/promises');
    const standardDir = path.join(this.indicatorsDir, 'standard');

    try {
      const files = await fs.readdir(standardDir);
      const indicators = files
        .filter((file) => file.endsWith('.py') && file !== '__init__.py')
        .map((file) => file.replace('.py', ''));

      logger.info(`Available indicators: ${indicators.length}`, { indicators });
      return indicators;
    } catch (error) {
      logger.error('Failed to list indicators', { error });
      return [];
    }
  }

  /**
   * インジケーターのメタデータを取得
   * @param indicatorName インジケーター名
   * @returns メタデータ
   */
  async getIndicatorMetadata(indicatorName: string): Promise<any> {
    const scriptPath = this.getScriptPath(indicatorName);
    
    logger.info(`Getting metadata for indicator: ${indicatorName}`);
    
    // メタデータ取得モードで実行
    const result = await this.spawnPythonProcess(scriptPath, {
      name: indicatorName,
      candleData: [],
      params: {},
      metadata: {},
      _mode: 'metadata'
    } as any);
    
    return result;
  }

  /**
   * 全インジケーターのメタデータを取得
   * @returns メタデータ配列
   */
  async getIndicatorsMetadata(): Promise<any[]> {
    const indicators = await this.listIndicators();
    logger.info(`Getting metadata for ${indicators.length} indicators`);
    
    const metadataPromises = indicators.map(name => 
      this.getIndicatorMetadata(name).catch(error => {
        logger.warn(`Failed to get metadata for ${name}`, { error: error.message });
        return null;
      })
    );
    
    const results = await Promise.all(metadataPromises);
    const validResults = results.filter(r => r !== null && r.success);
    
    logger.info(`Successfully retrieved metadata for ${validResults.length}/${indicators.length} indicators`);
    return validResults;
  }

  /**
   * Pythonプロセスを起動してJSONデータをやり取り
   * @param scriptPath Pythonスクリプトのパス
   * @param request リクエストデータ
   * @returns 実行結果
   */
  private spawnPythonProcess(
    scriptPath: string,
    request: IndicatorRequest
  ): Promise<IndicatorResponse | IndicatorErrorResponse> {
    return new Promise((resolve, reject) => {
      const pythonProcess: ChildProcess = spawn(this.pythonPath, [scriptPath]);

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout;

      // タイムアウト設定
      timeoutId = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Python process timeout after ${this.timeout}ms`));
      }, this.timeout);

      // stdout収集
      pythonProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // stderr収集
      pythonProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // プロセス終了
      pythonProcess.on('close', (code: number | null) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          const errorMessage = stderr || stdout || `Python process exited with code ${code}`;
          logger.error('Python process failed', {
            code,
            stderr: stderr.substring(0, 1000),
            stdout: stdout.substring(0, 1000),
            pythonPath: this.pythonPath,
            scriptPath,
            requestData: JSON.stringify(request).substring(0, 500),
          });
          // Log full stderr and stdout for debugging
          if (stderr) {
            logger.error('Full Python stderr:', stderr);
          }
          if (stdout) {
            logger.error('Full Python stdout:', stdout);
          }
          reject(new Error(errorMessage));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (error) {
          logger.error('Failed to parse Python output', {
            stdout: stdout.substring(0, 500),
            error,
          });
          reject(new Error('Invalid JSON response from Python'));
        }
      });

      // エラーハンドリング
      pythonProcess.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        logger.error('Failed to spawn Python process', { 
          error,
          pythonPath: this.pythonPath,
          scriptPath,
          message: error.message,
        });
        reject(error);
      });

      // stdinにリクエストデータを送信
      try {
        const jsonInput = JSON.stringify(request);
        pythonProcess.stdin?.write(jsonInput);
        pythonProcess.stdin?.end();
      } catch (error) {
        clearTimeout(timeoutId);
        pythonProcess.kill();
        reject(error);
      }
    });
  }

  /**
   * インジケーターのスクリプトパスを取得
   * @param indicatorName インジケーター名
   * @returns スクリプトの絶対パス
   */
  private getScriptPath(indicatorName: string): string {
    return path.join(this.indicatorsDir, 'standard', `${indicatorName}.py`);
  }

  /**
   * エラーレスポンスを生成
   * @param error エラーオブジェクト
   * @returns エラーレスポンス
   */
  private createErrorResponse(error: unknown): IndicatorErrorResponse {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: {
        type: 'ExecutionError',
        message,
        details: error instanceof Error ? error.stack : undefined,
      },
    };
  }
}

// シングルトンインスタンス
export const pythonExecutor = new PythonExecutorService();
