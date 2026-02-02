/**
 * キャッシュサービス (メモリキャッシュ)
 */

import { logger } from '../utils/logger';
import { env } from '../config/environment';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * シンプルなメモリキャッシュ実装
 */
export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private enabled: boolean;
  private defaultTTL: number;

  constructor() {
    this.cache = new Map();
    this.enabled = env.CACHE_ENABLED;
    this.defaultTTL = env.CACHE_TTL;

    if (this.enabled) {
      logger.info(`Cache service initialized (TTL: ${this.defaultTTL}s)`);
      
      // 定期的に期限切れキャッシュをクリーン
      setInterval(() => this.cleanup(), 60000); // 1分ごと
    } else {
      logger.info('Cache service disabled');
    }
  }

  /**
   * キャッシュから取得
   */
  get<T>(key: string): T | null {
    if (!this.enabled) {
      return null;
    }

    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 期限切れチェック
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      logger.debug(`Cache expired: ${key}`);
      return null;
    }

    logger.debug(`Cache hit: ${key}`);
    return entry.value as T;
  }

  /**
   * キャッシュに保存
   */
  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.enabled) {
      return;
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL) * 1000;
    this.cache.set(key, { value, expiresAt });
    logger.debug(`Cache set: ${key} (TTL: ${ttl || this.defaultTTL}s)`);
  }

  /**
   * キャッシュから削除
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * すべてのキャッシュをクリア
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared (${size} entries removed)`);
  }

  /**
   * 期限切れキャッシュをクリーンアップ
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug(`Cache cleanup: removed ${removedCount} expired entries`);
    }
  }

  /**
   * キャッシュ統計
   */
  getStats(): { size: number; enabled: boolean } {
    return {
      size: this.cache.size,
      enabled: this.enabled,
    };
  }
}

// シングルトンインスタンス
export const cacheService = new CacheService();
