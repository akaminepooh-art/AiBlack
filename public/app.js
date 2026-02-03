/**
 * Trading Platform - Frontend Application
 * Phase 3: Lightweight Charts Integration with Sub-Charts
 * DEBUG VERSION
 */

// ===== Global State =====
let mainChart = null;
let subChart = null;
let candlestickSeries = null;
let currentData = null;
let activeIndicators = new Map();
let mainChartSeries = new Map(); // SMA, EMA, Bollinger Bands
let subChartSeries = new Map();  // RSI, MACD
let hasSubChartIndicators = false;
let availableIndicators = []; // 動的に取得したインジケーター情報
let currentSymbol = '';
let currentInterval = '';

// Vision AI State
let lastQuickAnalysisResult = null; // 最後のQuick Analysis結果を保持
let currentVisionAbortController = null; // キャンセル用
let quickAnalysisAbortController = null; // Quick Analysis用AbortController
let askAIAbortController = null; // Ask AI用AbortController
let askAIConversationHistory = []; // Ask AI会話履歴

// ===== API Configuration =====
//const API_BASE = 'http://localhost:3001/api';
const API_BASE = window.location.origin + '/api';

// ===== Indicator Configuration =====
const INDICATOR_CONFIGS = {
    sma: {
        name: 'SMA',
        displayName: 'Simple Moving Average',
        chartType: 'main',
        defaultParams: { period: 20 },
        color: '#2196F3'
    },
    ema: {
        name: 'EMA',
        displayName: 'Exponential Moving Average',
        chartType: 'main',
        defaultParams: { period: 20 },
        color: '#FF6B35'
    },
    rsi: {
        name: 'RSI',
        displayName: 'Relative Strength Index',
        chartType: 'sub',
        defaultParams: { period: 14 },
        color: '#9C27B0'
    },
    macd: {
        name: 'MACD',
        displayName: 'MACD',
        chartType: 'sub',
        defaultParams: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        color: '#2196F3'
    },
    bollinger: {
        name: 'Bollinger',
        displayName: 'Bollinger Bands',
        chartType: 'main',
        defaultParams: { period: 20, stdDev: 2 },
        colors: {
            upper: '#FF5252',
            middle: '#2196F3',
            lower: '#66BB6A'
        }
    },
    atr: {
        name: 'ATR',
        displayName: 'Average True Range',
        chartType: 'readonly',  // 表示専用（チャートに描画しない）
        defaultParams: { period: 14 },
        color: '#FF9800'
    },
    adx: {
        name: 'ADX',
        displayName: 'Average Directional Index',
        chartType: 'readonly',  // 表示専用（チャートに描画しない）
        defaultParams: { period: 14 },
        color: '#4CAF50'
    }
};

// ===== Initialize Application =====
// Use window.load to ensure CSS is fully loaded
window.addEventListener('load', () => {
    console.log('Trading Platform initialized');
    // Add delay to ensure CSS dimensions are applied
    setTimeout(() => {
        initializeCharts();
        attachEventListeners();
        checkAPIHealth();
        loadAvailableIndicators(); // 動的にインジケーター一覧を読み込む
    }, 200);
});

// ===== Helper Functions =====
// Unix timestamp (seconds) を JST の日時文字列に変換
function formatTimeToJST(unixTime) {
    const date = new Date(unixTime * 1000);
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const year = jstDate.getUTCFullYear();
    const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getUTCDate()).padStart(2, '0');
    const hours = String(jstDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

function calculateChartDimensions(mainWrapper, subWrapper) {
    // Get actual element sizes (no fallback on initial load)
    const mainWrapperHeight = mainWrapper?.clientHeight;
    const subWrapperHeight = subWrapper?.clientHeight;
    const wrapperWidth = mainWrapper?.clientWidth;
    
    // If elements not ready, use fallback
    if (!mainWrapperHeight || !subWrapperHeight || !wrapperWidth) {
        console.warn('Elements not ready, using fallback dimensions');
        return {
            mainHeight: 400,
            subHeight: 180,
            chartWidth: 800,
            mainWrapperHeight: 456,
            subWrapperHeight: 236
        };
    }
    
    // Calculate chart height:
    // wrapper height - header (36px + 4px margin) - padding (24px: 12px top + 12px bottom)
    const mainHeight = Math.max(mainWrapperHeight - 56, 400); // 36 (header) + 20 (buffer)
    // サブチャート: 時間軸を表示するため、より多くのスペースを確保
    const subHeight = Math.max(subWrapperHeight - 76, 150);   // 追加で20px確保して時間軸表示
    const chartWidth = Math.max(wrapperWidth - 24, 400);      // 24 (12px left + 12px right)
    
    console.log('Chart calculation:', {
        mainWrapperHeight, mainHeight,
        subWrapperHeight, subHeight,
        chartWidth
    });
    
    return { mainHeight, subHeight, chartWidth, mainWrapperHeight, subWrapperHeight };
}

// ===== Chart Initialization =====
function initializeCharts() {
    const mainContainer = document.getElementById('mainChart');
    const subContainer = document.getElementById('subChart');
    
    if (!mainContainer || !subContainer) {
        console.error('Chart containers not found');
        return;
    }
    
    // Get parent wrapper dimensions
    const mainWrapper = mainContainer.parentElement;
    const subWrapper = subContainer.parentElement;
    
    if (!mainWrapper || !subWrapper) {
        console.error('Chart wrappers not found');
        return;
    }
    
    // Wait for next frame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
        // Force reflow to ensure accurate dimensions
        void mainWrapper.offsetHeight;
        
        // Calculate chart dimensions using shared function
        const dimensions = calculateChartDimensions(mainWrapper, subWrapper);
        const { mainHeight, subHeight, chartWidth, mainWrapperHeight, subWrapperHeight } = dimensions;
        
        console.log('Initial chart dimensions:', { 
            mainWrapperHeight, subWrapperHeight,
            mainHeight, subHeight, chartWidth 
        });
        
        // Main Chart (Candlesticks + Overlays)
        mainChart = LightweightCharts.createChart(mainContainer, {
            width: chartWidth,
            height: mainHeight,
            autoSize: true, // Enable auto-resize
        layout: {
            background: { color: '#161b22' },
            textColor: '#c9d1d9',
        },
        grid: {
            vertLines: { color: 'rgba(48, 54, 61, 0.5)' },
            horzLines: { color: 'rgba(48, 54, 61, 0.5)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#30363d',
        },
        timeScale: {
            borderColor: '#30363d',
            timeVisible: true,
            secondsVisible: false,
            shiftVisibleRangeOnNewBar: true,
            tickMarkFormatter: (time) => {
                // X軸ラベル用: Unix timestamp を JST に変換
                const date = new Date(time * 1000);
                const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
                const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
                const day = String(jstDate.getUTCDate()).padStart(2, '0');
                const hours = String(jstDate.getUTCHours()).padStart(2, '0');
                const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
                return `${month}/${day} ${hours}:${minutes}`;
            },
        },
        localization: {
            timeFormatter: (time) => {
                // ツールチップ用: Unix timestamp を JST に変換
                const date = new Date(time * 1000);
                const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
                const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
                const day = String(jstDate.getUTCDate()).padStart(2, '0');
                const hours = String(jstDate.getUTCHours()).padStart(2, '0');
                const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
                return `${month}/${day} ${hours}:${minutes}`;
            },
        },
        watermark: {
            visible: false,
        },
    });

    candlestickSeries = mainChart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
    });

        // Sub Chart (RSI, MACD)
        subChart = LightweightCharts.createChart(subContainer, {
            width: chartWidth,
            height: subHeight,
            autoSize: true, // Enable auto-resize
        layout: {
            background: { color: '#161b22' },
            textColor: '#c9d1d9',
        },
        grid: {
            vertLines: { color: 'rgba(48, 54, 61, 0.5)' },
            horzLines: { color: 'rgba(48, 54, 61, 0.5)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: '#30363d',
        },
        timeScale: {
            borderColor: '#30363d',
            visible: true, // サブチャートの時間軸を表示
            timeVisible: true,
            secondsVisible: false,
            shiftVisibleRangeOnNewBar: true,
            tickMarkFormatter: (time) => {
                // X軸ラベル用: Unix timestamp を JST に変換
                const date = new Date(time * 1000);
                const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
                const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
                const day = String(jstDate.getUTCDate()).padStart(2, '0');
                const hours = String(jstDate.getUTCHours()).padStart(2, '0');
                const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
                return `${month}/${day} ${hours}:${minutes}`;
            },
        },
        localization: {
            timeFormatter: (time) => {
                // ツールチップ用: Unix timestamp を JST に変換
                const date = new Date(time * 1000);
                const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
                const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
                const day = String(jstDate.getUTCDate()).padStart(2, '0');
                const hours = String(jstDate.getUTCHours()).padStart(2, '0');
                const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
                return `${month}/${day} ${hours}:${minutes}`;
            },
        },
        watermark: {
            visible: false,
        },
    });

    // 時間軸の双方向同期
    // メインチャートが変更されたらサブチャートも更新
    mainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
        const timeRange = mainChart.timeScale().getVisibleRange();
        if (timeRange && subChart) {
            try {
                subChart.timeScale().setVisibleRange(timeRange);
                console.debug('Synced sub chart time range from main chart');
            } catch (error) {
                // Ignore errors during sync
                console.debug('Time scale sync skipped:', error.message);
            }
        }
    });
    
    // サブチャートが変更されたらメインチャートも更新
    subChart.timeScale().subscribeVisibleTimeRangeChange(() => {
        const timeRange = subChart.timeScale().getVisibleRange();
        if (timeRange && mainChart) {
            try {
                mainChart.timeScale().setVisibleRange(timeRange);
                console.debug('Synced main chart time range from sub chart');
            } catch (error) {
                // Ignore errors during sync
                console.debug('Time scale sync skipped:', error.message);
            }
        }
    });

        console.log('Charts initialized');
    });
}

// ===== Event Listeners =====
function attachEventListeners() {
    // Load Data Button
    document.getElementById('loadDataBtn').addEventListener('click', loadMarketData);

    // Add Indicator Button
    document.getElementById('addIndicatorBtn').addEventListener('click', addIndicator);

    // Symbol Select - Show/Hide Custom Input
    document.getElementById('symbolSelect').addEventListener('change', (e) => {
        const customGroup = document.getElementById('customSymbolGroup');
        if (e.target.value === '__CUSTOM__') {
            customGroup.style.display = 'block';
            document.getElementById('customSymbolInput').focus();
        } else {
            customGroup.style.display = 'none';
        }
    });

    // Indicator Select Change
    document.getElementById('indicatorSelect').addEventListener('change', (e) => {
        const btn = document.getElementById('addIndicatorBtn');
        btn.disabled = !e.target.value || !currentData;
    });

    // Enter key shortcuts
    document.getElementById('symbolSelect').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadMarketData();
    });
}

// ===== API Health Check =====
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        const statusElement = document.getElementById('apiStatus');
        const dotElement = document.getElementById('apiStatusDot');
        
        if (data.status === 'ok') {
            statusElement.textContent = '🟢 API Connected';
            dotElement.classList.add('online');
        }
    } catch (error) {
        console.error('API health check failed:', error);
        document.getElementById('apiStatus').textContent = '🔴 API Disconnected';
    }
}

// ===== Load Available Indicators =====
async function loadAvailableIndicators() {
    try {
        console.log('Loading available indicators...');
        const response = await fetch(`${API_BASE}/indicator/metadata`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Indicators metadata:', data);
        
        if (data.success && data.indicators) {
            availableIndicators = data.indicators;
            populateIndicatorSelect(data.indicators);
            console.log(`✅ Loaded ${data.indicators.length} indicators`);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Failed to load indicators:', error);
        // フォールバック: 固定のINDICATOR_CONFIGSを使用
        console.warn('⚠️ Falling back to static INDICATOR_CONFIGS');
        populateIndicatorSelectFallback();
    }
}

// ===== Populate Indicator Select (Dynamic) =====
function populateIndicatorSelect(indicators) {
    const select = document.getElementById('indicatorSelect');
    
    // 既存のオプションをクリア（最初の「Select Indicator」以外）
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Main Chart Indicators
    const mainIndicators = indicators.filter(ind => ind.chartType === 'main');
    if (mainIndicators.length > 0) {
        const mainGroup = document.createElement('optgroup');
        mainGroup.label = '📈 Main Chart Indicators';
        
        mainIndicators.forEach(indicator => {
            const option = document.createElement('option');
            option.value = indicator.name;
            option.textContent = `${indicator.displayName} (${indicator.name.toUpperCase()})`;
            mainGroup.appendChild(option);
        });
        
        select.appendChild(mainGroup);
    }
    
    // Sub Chart Indicators
    const subIndicators = indicators.filter(ind => ind.chartType === 'sub');
    if (subIndicators.length > 0) {
        const subGroup = document.createElement('optgroup');
        subGroup.label = '📊 Sub Chart Indicators';
        
        subIndicators.forEach(indicator => {
            const option = document.createElement('option');
            option.value = indicator.name;
            option.textContent = `${indicator.displayName} (${indicator.name.toUpperCase()})`;
            subGroup.appendChild(option);
        });
        
        select.appendChild(subGroup);
    }
}

// ===== Populate Indicator Select (Fallback) =====
function populateIndicatorSelectFallback() {
    const select = document.getElementById('indicatorSelect');
    
    // 既存のオプションをクリア（最初の「Select Indicator」以外）
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // INDICATOR_CONFIGSから読み込み
    const mainGroup = document.createElement('optgroup');
    mainGroup.label = '📈 Main Chart Indicators';
    
    const subGroup = document.createElement('optgroup');
    subGroup.label = '📊 Sub Chart Indicators';
    
    Object.entries(INDICATOR_CONFIGS).forEach(([key, config]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${config.displayName} (${key.toUpperCase()})`;
        
        if (config.chartType === 'main') {
            mainGroup.appendChild(option);
        } else {
            subGroup.appendChild(option);
        }
    });
    
    select.appendChild(mainGroup);
    select.appendChild(subGroup);
}

// ===== Load Market Data =====
async function loadMarketData() {
    const symbolSelect = document.getElementById('symbolSelect');
    let symbol = symbolSelect.value.trim();
    
    // Handle custom symbol input
    if (symbol === '__CUSTOM__') {
        const customSymbol = document.getElementById('customSymbolInput').value.trim();
        if (!customSymbol) {
            alert('Please enter a custom symbol');
            return;
        }
        symbol = customSymbol;
    }
    
    const interval = document.getElementById('intervalSelect').value;
    const range = document.getElementById('rangeSelect').value;

    if (!symbol) {
        alert('Please select or enter a symbol');
        return;
    }

    const btn = document.getElementById('loadDataBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Loading...';
    btn.disabled = true;

    try {
        const url = `${API_BASE}/market-data/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`;
        console.log('API call:', url);
        
        const response = await fetch(url);
        
        // === DEBUG: Check response status ===
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP Error:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        // === DEBUG: Log response data ===
        console.log('API Response:', data);
        console.log('Data structure check:', {
            hasSuccess: 'success' in data,
            success: data.success,
            hasData: 'data' in data,
            dataIsArray: Array.isArray(data.data),
            dataLength: data.data?.length,
            firstCandle: data.data?.[0]
        });

        if (!data.success) {
            throw new Error(data.error || 'API returned success: false');
        }
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('Invalid response: data is not an array');
        }
        
        if (data.data.length === 0) {
            throw new Error('No data returned from API');
        }

        currentData = data.data;
        currentSymbol = symbol;
        currentInterval = interval;
        
        // === DEBUG: Log currentData ===
        console.log('Current data:', {
            length: currentData.length,
            firstCandle: currentData[0],
            lastCandle: currentData[currentData.length - 1]
        });
        
        displayChartData(currentData, symbol, interval);
        
        // Update info
        document.getElementById('dataInfo').textContent = 
            `✅ Loaded ${currentData.length} candles`;
        document.getElementById('dataInfo').style.display = 'block';
        
        // Hide empty state
        document.getElementById('emptyState').style.display = 'none';
        
        // Enable indicator button if indicator selected
        const indicatorSelect = document.getElementById('indicatorSelect');
        if (indicatorSelect.value) {
            document.getElementById('addIndicatorBtn').disabled = false;
        }

        // Enable capture button
        updateCaptureButtonState();

        console.log(`Chart data displayed: ${currentData.length} candles`);
        
        // ATR/ADX表示を更新
        updateTechnicalIndicatorsDisplay(currentData);

    } catch (error) {
        console.error('Failed to load market data:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        alert(`Error: ${error.message}`);
        document.getElementById('emptyState').style.display = 'flex';
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// ===== Display Chart Data =====
function displayChartData(data, symbol, interval) {
    console.log('displayChartData called with:', { dataLength: data.length, symbol, interval });
    
    // === データの並び順を確認 ===
    if (data.length > 1) {
        const isAscending = data[0].time < data[1].time;
        console.log('Data order:', isAscending ? 'Ascending (oldest first)' : 'Descending (newest first)');
        
        // 昇順でない場合はソート
        if (!isAscending) {
            console.warn('Data is not in ascending order, sorting...');
            data.sort((a, b) => a.time - b.time);
        }
    }
    
    // === タイムスタンプの範囲を確認 ===
    if (data.length > 0) {
        const firstTime = data[0].time;
        const lastTime = data[data.length - 1].time;
        const firstDate = new Date(firstTime * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const lastDate = new Date(lastTime * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        console.log('Time range:', {
            firstTime,
            lastTime,
            firstDate,
            lastDate,
            spanHours: ((lastTime - firstTime) / 3600).toFixed(2)
        });
    }
    
    // Convert data to Lightweight Charts format
    const candleData = data.map((candle, index) => {
        // === DEBUG: Log each candle ===
        if (index < 3 || index >= data.length - 3) {
            const candleDate = new Date(candle.time * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
            console.log(`Candle ${index}:`, { ...candle, date: candleDate });
        }
        
        // Validate candle data
        if (!candle || typeof candle !== 'object') {
            console.error(`Invalid candle at index ${index}:`, candle);
            throw new Error(`Invalid candle data at index ${index}`);
        }
        
        if (candle.time === null || candle.time === undefined) {
            console.error(`Null time at index ${index}:`, candle);
            throw new Error(`Candle time is null at index ${index}`);
        }
        
        // タイムスタンプの妥当性チェック
        if (candle.time <= 0 || candle.time > Date.now() / 1000 + 86400) {
            console.error(`Invalid timestamp at index ${index}:`, candle.time);
            throw new Error(`Invalid timestamp at index ${index}: ${candle.time}`);
        }
        
        // 価格データの妥当性チェック
        if (candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0) {
            console.error(`Invalid price data at index ${index}:`, candle);
            throw new Error(`Invalid price data at index ${index}`);
        }
        
        const result = {
            time: candle.time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
        };
        
        // === DEBUG: Log converted candle ===
        if (index < 3 || index >= data.length - 3) {
            console.log(`Converted candle ${index}:`, result);
        }
        
        return result;
    });

    console.log('Converted candle data:', {
        length: candleData.length,
        firstCandle: candleData[0],
        lastCandle: candleData[candleData.length - 1]
    });

    try {
        candlestickSeries.setData(candleData);
        mainChart.timeScale().fitContent();
        
        // Update chart info with JST timezone indication
        document.getElementById('mainChartInfo').textContent = 
            `${symbol.toUpperCase()} | ${interval} | ${data.length} bars | JST (UTC+9)`;
            
        console.log('Chart data set successfully');
    } catch (error) {
        console.error('Error setting chart data:', error);
        throw error;
    }
}

// ===== Add Indicator =====
async function addIndicator() {
    const select = document.getElementById('indicatorSelect');
    const indicatorName = select.value;

    if (!indicatorName || !currentData) {
        alert('⚠️ Please load market data first');
        return;
    }

    if (activeIndicators.has(indicatorName)) {
        alert('⚠️ This indicator is already added');
        return;
    }

    // パラメータダイアログを表示
    await showParameterDialog(indicatorName);
}

// ===== Show Parameter Dialog =====
async function showParameterDialog(indicatorName, preloadedMetadata = null, currentParams = null, isEditMode = false) {
    try {
        // インジケーターのメタデータを取得
        let indicatorMetadata = preloadedMetadata || availableIndicators.find(ind => ind.name === indicatorName);
        
        if (!indicatorMetadata) {
            // フォールバック: APIから直接取得
            const response = await fetch(`${API_BASE}/indicator/metadata/${indicatorName}`);
            const data = await response.json();
            if (data.success && data.indicator) {
                indicatorMetadata = data.indicator;
            } else {
                throw new Error('Failed to load indicator metadata');
            }
        }
        
        // ダイアログを作成
        const overlay = document.createElement('div');
        overlay.className = 'parameter-dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'parameter-dialog';
        
        // ヘッダー
        const header = document.createElement('div');
        header.className = 'parameter-dialog-header';
        header.innerHTML = `
            <h3>${isEditMode ? '✏️' : '📊'} ${indicatorMetadata.displayName}</h3>
            <p>${indicatorMetadata.name.toUpperCase()} - v${indicatorMetadata.version}${isEditMode ? ' (Editing)' : ''}</p>
        `;
        dialog.appendChild(header);
        
        // パラメータフィールド
        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'parameter-fields';
        
        indicatorMetadata.parameters.forEach(param => {
            // 編集モードの場合、現在の値を使用
            const currentValue = currentParams?.[param.name];
            const field = createParameterField(param, currentValue);
            fieldsContainer.appendChild(field);
        });
        
        dialog.appendChild(fieldsContainer);
        
        // ボタン
        const buttons = document.createElement('div');
        buttons.className = 'parameter-dialog-buttons';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-cancel';
        cancelBtn.textContent = '❌ Cancel';
        cancelBtn.onclick = () => {
            overlay.remove();
            if (!isEditMode) {
                document.getElementById('indicatorSelect').value = '';
            }
        };
        
        const actionBtn = document.createElement('button');
        actionBtn.className = 'btn-add';
        actionBtn.textContent = isEditMode ? '💾 Update Indicator' : '✅ Add Indicator';
        actionBtn.onclick = async () => {
            const params = getParameterValues(fieldsContainer);
            overlay.remove();
            
            if (isEditMode) {
                // 編集モード: 既存インジケーターを削除して再追加
                await updateIndicatorWithParams(indicatorName, params, indicatorMetadata);
            } else {
                // 新規追加モード
                await addIndicatorWithParams(indicatorName, params, indicatorMetadata);
            }
        };
        
        buttons.appendChild(cancelBtn);
        buttons.appendChild(actionBtn);
        dialog.appendChild(buttons);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // ESCキーで閉じる
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                if (!isEditMode) {
                    document.getElementById('indicatorSelect').value = '';
                }
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
    } catch (error) {
        console.error('Failed to show parameter dialog:', error);
        alert(`⚠️ Error: ${error.message}`);
        document.getElementById('indicatorSelect').value = '';
    }
}

// ===== Create Parameter Field =====
function createParameterField(param, currentValue = null) {
    const field = document.createElement('div');
    field.className = 'parameter-field';
    
    const label = document.createElement('label');
    label.textContent = param.label || param.name;
    field.appendChild(label);
    
    // 現在値が指定されている場合はそれを使用、そうでなければデフォルト値
    const value = currentValue !== null && currentValue !== undefined ? currentValue : param.default;
    
    let input;
    
    switch(param.type) {
        case 'number':
            input = document.createElement('input');
            input.type = 'number';
            input.name = param.name;
            input.value = value;
            if (param.min !== undefined) input.min = param.min;
            if (param.max !== undefined) input.max = param.max;
            if (param.step !== undefined) input.step = param.step;
            
            // 範囲表示
            if (param.min !== undefined && param.max !== undefined) {
                const range = document.createElement('span');
                range.className = 'param-range';
                range.textContent = `(${param.min} - ${param.max})`;
                label.appendChild(range);
            }
            break;
            
        case 'color':
            input = document.createElement('input');
            input.type = 'color';
            input.name = param.name;
            input.value = value;
            break;
            
        case 'select':
            input = document.createElement('select');
            input.name = param.name;
            param.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                option.selected = opt.value === value;
                input.appendChild(option);
            });
            break;
            
        default:
            input = document.createElement('input');
            input.type = 'text';
            input.name = param.name;
            input.value = value || '';
    }
    
    field.appendChild(input);
    return field;
}

// ===== Get Parameter Values =====
function getParameterValues(container) {
    const params = {};
    const inputs = container.querySelectorAll('input, select');
    
    inputs.forEach(input => {
        const name = input.name;
        let value = input.value;
        
        // 型変換
        if (input.type === 'number') {
            value = parseFloat(value);
        }
        
        params[name] = value;
    });
    
    return params;
}

// ===== Add Indicator with Parameters =====
async function addIndicatorWithParams(indicatorName, params, metadata) {
    const btn = document.getElementById('addIndicatorBtn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ Calculating...';
    btn.disabled = true;

    try {
        console.log(`Adding indicator: ${indicatorName}`, params);
        
        // Prepare request
        const requestData = {
            name: indicatorName,
            candleData: currentData,
            params: params,
            metadata: {
                symbol: currentSymbol,
                interval: currentInterval
            }
        };

        const response = await fetch(`${API_BASE}/indicator/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Indicator calculation failed');
        }

        // Add indicator to chart
        addIndicatorToChart(indicatorName, result, metadata, params);

        // Add to active list
        activeIndicators.set(indicatorName, {
            metadata,
            result,
            params
        });

        updateActiveIndicatorsList();
        
        console.log(`✅ Indicator added: ${indicatorName}`, result);

    } catch (error) {
        console.error(`❌ Failed to add indicator: ${indicatorName}`, error);
        alert(`⚠️ Error: ${error.message}`);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
        document.getElementById('indicatorSelect').value = '';
    }
}

// ===== Add Indicator to Chart =====
function addIndicatorToChart(name, result, metadata, params) {
    // metadata.chartType または フォールバックで INDICATOR_CONFIGS を使用
    const chartType = metadata?.chartType || INDICATOR_CONFIGS[name]?.chartType || 'main';
    
    if (chartType === 'main') {
        addMainChartIndicator(name, result, metadata, params);
    } else if (chartType === 'sub') {
        addSubChartIndicator(name, result, metadata, params);
    }
}

// ===== Add Main Chart Indicator (SMA, EMA, Bollinger) =====
function addMainChartIndicator(name, result, metadata, params) {
    if (name === 'bollinger') {
        // Bollinger Bands has 3 lines in result.lines array
        if (!result.lines || !Array.isArray(result.lines)) {
            console.error('Bollinger result.lines is missing or invalid:', result);
            return;
        }

        const upperLine = result.lines.find(line => line.name === 'Upper');
        const middleLine = result.lines.find(line => line.name === 'Middle');
        const lowerLine = result.lines.find(line => line.name === 'Lower');

        if (!upperLine || !middleLine || !lowerLine) {
            console.error('Bollinger lines are incomplete:', result.lines);
            return;
        }

        const upperSeries = mainChart.addLineSeries({
            color: upperLine.config.color,
            lineWidth: upperLine.config.lineWidth || 2,
            title: upperLine.config.title,
        });
        upperSeries.setData(upperLine.values);

        const middleSeries = mainChart.addLineSeries({
            color: middleLine.config.color,
            lineWidth: middleLine.config.lineWidth || 2,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            title: middleLine.config.title,
        });
        middleSeries.setData(middleLine.values);

        const lowerSeries = mainChart.addLineSeries({
            color: lowerLine.config.color,
            lineWidth: lowerLine.config.lineWidth || 2,
            title: lowerLine.config.title,
        });
        lowerSeries.setData(lowerLine.values);

        mainChartSeries.set(name, { upper: upperSeries, middle: middleSeries, lower: lowerSeries });

    } else {
        // SMA, EMA - single line
        const lineData = result.values
            .filter(point => point.value !== null)
            .map(point => ({ time: point.time, value: point.value }));

        const color = params?.color || metadata?.color || INDICATOR_CONFIGS[name]?.color || '#2196F3';
        const displayName = metadata?.displayName || INDICATOR_CONFIGS[name]?.displayName || name.toUpperCase();

        const series = mainChart.addLineSeries({
            color: color,
            lineWidth: 2,
            title: result.lineConfig?.title || displayName,
        });
        series.setData(lineData);

        mainChartSeries.set(name, series);
    }
}

// ===== Add Sub Chart Indicator (RSI, MACD) =====
function addSubChartIndicator(name, result, metadata, params) {
    console.log(`Adding sub-chart indicator: ${name}`, { result, metadata, params });
    
    // Show sub chart
    if (!hasSubChartIndicators) {
        document.getElementById('subChartWrapper').classList.add('active');
        hasSubChartIndicators = true;
    }

    if (name === 'rsi') {
        console.log('Processing RSI data:', {
            valuesLength: result.values?.length,
            firstValue: result.values?.[0],
            lastValue: result.values?.[result.values.length - 1]
        });
        
        // RSI - single line with reference lines
        const lineData = result.values
            .filter(point => point.value !== null && point.value !== undefined)
            .map(point => ({ time: point.time, value: point.value }));
        
        console.log('RSI line data:', {
            length: lineData.length,
            first: lineData[0],
            last: lineData[lineData.length - 1]
        });

        const color = params?.color || metadata?.color || INDICATOR_CONFIGS[name]?.color || '#9C27B0';
        const period = params?.period || metadata?.defaultParams?.period || 14;

        const series = subChart.addLineSeries({
            color: color,
            lineWidth: 2,
            title: `RSI(${period})`,
        });
        series.setData(lineData);
        
        console.log('RSI series added, data set');

        // Add reference lines at 70 and 30
        const overboughtLine = subChart.addLineSeries({
            color: 'rgba(255, 82, 82, 0.3)',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            title: 'Overbought (70)',
        });
        overboughtLine.setData(lineData.map(d => ({ time: d.time, value: 70 })));

        const oversoldLine = subChart.addLineSeries({
            color: 'rgba(102, 187, 106, 0.3)',
            lineWidth: 1,
            lineStyle: LightweightCharts.LineStyle.Dashed,
            title: 'Oversold (30)',
        });
        oversoldLine.setData(lineData.map(d => ({ time: d.time, value: 30 })));

        subChartSeries.set(name, { main: series, overbought: overboughtLine, oversold: oversoldLine });

        document.getElementById('subChartTitle').textContent = `RSI (${period})`;
        
        // Fit content after adding data
        subChart.timeScale().fitContent();
        
        console.log('RSI setup complete');

    } else if (name === 'macd') {
        console.log('Processing MACD data:', {
            hasLines: !!result.lines,
            linesLength: result.lines?.length,
            lines: result.lines
        });
        
        // MACD - multiple lines in result.lines array
        if (!result.lines || !Array.isArray(result.lines)) {
            console.error('MACD result.lines is missing or invalid:', result);
            return;
        }

        const macdLine = result.lines.find(line => line.name === 'MACD');
        const signalLine = result.lines.find(line => line.name === 'Signal');
        const histogramLine = result.lines.find(line => line.name === 'Histogram');

        if (!macdLine || !signalLine || !histogramLine) {
            console.error('MACD lines are incomplete:', result.lines);
            return;
        }

        const fastPeriod = params?.fastPeriod || metadata?.defaultParams?.fastPeriod || 12;
        const slowPeriod = params?.slowPeriod || metadata?.defaultParams?.slowPeriod || 26;
        const signalPeriod = params?.signalPeriod || metadata?.defaultParams?.signalPeriod || 9;

        const macdSeries = subChart.addLineSeries({
            color: macdLine.config.color,
            lineWidth: macdLine.config.lineWidth || 2,
            title: macdLine.config.title,
        });
        macdSeries.setData(macdLine.values);

        const signalSeries = subChart.addLineSeries({
            color: signalLine.config.color,
            lineWidth: signalLine.config.lineWidth || 2,
            title: signalLine.config.title,
        });
        signalSeries.setData(signalLine.values);

        const histogramSeries = subChart.addHistogramSeries({
            color: histogramLine.config.color,
            priceFormat: {
                type: 'volume',
            },
            title: histogramLine.config.title,
        });
        histogramSeries.setData(histogramLine.values);

        subChartSeries.set(name, { macd: macdSeries, signal: signalSeries, histogram: histogramSeries });

        document.getElementById('subChartTitle').textContent = `MACD (${fastPeriod},${slowPeriod},${signalPeriod})`;
        
        // Fit content after adding data
        subChart.timeScale().fitContent();
        
        console.log('MACD setup complete');
    }
}

// ===== Remove Indicator =====
function removeIndicator(name) {
    if (!activeIndicators.has(name)) return;

    const indicator = activeIndicators.get(name);
    const metadata = indicator.metadata;
    const chartType = metadata?.chartType || 'main';

    // Remove from chart
    if (chartType === 'main') {
        const series = mainChartSeries.get(name);
        if (series) {
            if (name === 'bollinger') {
                mainChart.removeSeries(series.upper);
                mainChart.removeSeries(series.middle);
                mainChart.removeSeries(series.lower);
            } else {
                mainChart.removeSeries(series);
            }
            mainChartSeries.delete(name);
        }
    } else if (chartType === 'sub') {
        const series = subChartSeries.get(name);
        if (series) {
            if (name === 'rsi') {
                subChart.removeSeries(series.main);
                subChart.removeSeries(series.overbought);
                subChart.removeSeries(series.oversold);
            } else if (name === 'macd') {
                subChart.removeSeries(series.macd);
                subChart.removeSeries(series.signal);
                subChart.removeSeries(series.histogram);
            }
            subChartSeries.delete(name);
        }

        // Hide sub chart if no indicators
        if (subChartSeries.size === 0) {
            document.getElementById('subChartWrapper').classList.remove('active');
            hasSubChartIndicators = false;
        }
    }

    // Remove from active list
    activeIndicators.delete(name);
    updateActiveIndicatorsList();

    console.log(`Indicator removed: ${name}`);
}

// ===== Edit Indicator =====
async function editIndicator(name) {
    if (!activeIndicators.has(name)) {
        console.error(`Indicator ${name} not found in active indicators`);
        return;
    }

    const indicator = activeIndicators.get(name);
    const metadata = indicator.metadata;
    const currentParams = indicator.params;

    console.log(`Editing indicator: ${name}`, { metadata, currentParams });

    // Show parameter dialog with current values
    await showParameterDialog(name, metadata, currentParams, true);
}

// ===== Update Indicator with New Parameters =====
async function updateIndicatorWithParams(indicatorName, newParams, metadata) {
    console.log(`Updating indicator: ${indicatorName}`, { newParams });
    
    try {
        // Remove the old indicator from chart
        removeIndicator(indicatorName);
        
        // Add the indicator with new parameters
        await addIndicatorWithParams(indicatorName, newParams, metadata);
        
        console.log(`✅ Indicator updated: ${indicatorName}`);
    } catch (error) {
        console.error(`❌ Failed to update indicator: ${indicatorName}`, error);
        alert(`⚠️ Error updating indicator: ${error.message}`);
    }
}

// ===== Update Active Indicators List =====
function updateActiveIndicatorsList() {
    const container = document.getElementById('activeIndicatorsList');
    
    // activeIndicatorsがMapの場合
    const indicatorKeys = Array.from(activeIndicators.keys());
    
    if (indicatorKeys.length === 0) {
        container.innerHTML = '<div class="no-indicators">No indicators added yet</div>';
        return;
    }

    container.innerHTML = '';

    indicatorKeys.forEach((key) => {
        const indicator = activeIndicators.get(key);
        const metadata = indicator.metadata;
        const params = indicator.params;
        const name = metadata?.name || key;
        
        let paramText = '';
        if (name === 'sma' || name === 'ema') {
            paramText = `(${params.period})`;
        } else if (name === 'rsi') {
            paramText = `(${params.period})`;
        } else if (name === 'macd') {
            paramText = `(${params.fastPeriod},${params.slowPeriod},${params.signalPeriod})`;
        } else if (name === 'bollinger') {
            paramText = `(${params.period},${params.stdDev})`;
        } else if (name === 'atr') {
            paramText = `(${params.period}): ${indicator.value?.toFixed(4) || 'N/A'}`;
        } else if (name === 'adx') {
            paramText = `(${params.period}): ${indicator.value?.toFixed(2) || 'N/A'}`;
        }

        const item = document.createElement('div');
        item.className = 'indicator-item';
        
        // ATR/ADXは表示専用（削除ボタンなし）
        const isReadonly = name === 'atr' || name === 'adx';
        
        item.innerHTML = `
            <div class="indicator-info" ${isReadonly ? '' : `data-indicator="${key}" style="cursor: pointer;" title="Click to edit"`}>
                <div class="indicator-color" style="background-color: ${params.color || '#999'}"></div>
                <span class="indicator-name">${metadata?.displayName || name.toUpperCase()}</span>
                <span class="indicator-params">${paramText}</span>
            </div>
            ${isReadonly ? '<span class="indicator-readonly-badge">📊 Auto</span>' : `<button class="remove-indicator-btn" data-indicator="${key}" title="Remove">×</button>`}
        `;

        // Attach edit handler (click on indicator info) - 表示専用は除く
        if (!isReadonly) {
            item.querySelector('.indicator-info')?.addEventListener('click', () => {
                editIndicator(key);
            });
        }

        // Attach remove handler - 表示専用は除く
        if (!isReadonly) {
            item.querySelector('.remove-indicator-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                removeIndicator(key);
            });
        }

        container.appendChild(item);
    });
}


// ===== Chart Capture Feature =====
const CAPTURE_WIDTH = 1024;
const CAPTURE_HEIGHT = 576;
const CAPTURE_QUALITY = 0.87; // JPEG quality (0.85-0.90 recommended)

// Initialize capture button
function initializeCaptureButton() {
    const captureBtn = document.getElementById('captureChartBtn');
    if (!captureBtn) return;
    
    captureBtn.addEventListener('click', captureMainChart);
    
    // Disable button if no data loaded
    if (!currentData || currentData.length === 0) {
        captureBtn.disabled = true;
    }
}

// Capture main chart as image
async function captureMainChart() {
    const captureBtn = document.getElementById('captureChartBtn');
    const originalText = captureBtn.textContent;
    
    // Get main chart element
    const mainChartElement = document.getElementById('mainChart');
    if (!mainChartElement) {
        alert('⚠️ Main chart element not found');
        return;
    }
    
    // Save original styles and computed dimensions
    const originalStyles = {
        width: mainChartElement.style.width,
        height: mainChartElement.style.height,
        minHeight: mainChartElement.style.minHeight,
        maxHeight: mainChartElement.style.maxHeight,
        flex: mainChartElement.style.flex,
        position: mainChartElement.style.position
    };
    
    const originalWidth = mainChartElement.clientWidth;
    const originalHeight = mainChartElement.clientHeight;
    
    try {
        captureBtn.textContent = '⏳ Capturing...';
        captureBtn.disabled = true;
        
        console.log('Starting chart capture...');
        console.log(`Original size: ${originalWidth}×${originalHeight}`);
        console.log(`Target capture size: ${CAPTURE_WIDTH}×${CAPTURE_HEIGHT}`);
        
        // Force fixed dimensions on the chart container
        mainChartElement.style.width = `${CAPTURE_WIDTH}px`;
        mainChartElement.style.height = `${CAPTURE_HEIGHT}px`;
        mainChartElement.style.minHeight = `${CAPTURE_HEIGHT}px`;
        mainChartElement.style.maxHeight = `${CAPTURE_HEIGHT}px`;
        mainChartElement.style.flex = 'none'; // Disable flex to prevent size changes
        mainChartElement.style.position = 'relative';
        
        // Force browser reflow
        void mainChartElement.offsetHeight;
        
        // Resize the Lightweight Chart instance
        if (mainChart) {
            mainChart.resize(CAPTURE_WIDTH, CAPTURE_HEIGHT);
            console.log('✅ Chart temporarily resized to', CAPTURE_WIDTH, 'x', CAPTURE_HEIGHT);
        }
        
        // Wait for chart to finish rendering
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify actual size before capture
        console.log(`Actual element size before capture: ${mainChartElement.clientWidth}×${mainChartElement.clientHeight}`);
        
        // Take screenshot using html2canvas
        const canvas = await takeChartScreenshot(mainChartElement);
        
        // Restore original styles
        mainChartElement.style.width = originalStyles.width;
        mainChartElement.style.height = originalStyles.height;
        mainChartElement.style.minHeight = originalStyles.minHeight;
        mainChartElement.style.maxHeight = originalStyles.maxHeight;
        mainChartElement.style.flex = originalStyles.flex;
        mainChartElement.style.position = originalStyles.position;
        
        // Force browser reflow
        void mainChartElement.offsetHeight;
        
        // Resize chart back to container
        if (mainChart) {
            // Use original dimensions if available, otherwise use current size
            const restoreWidth = originalWidth || mainChartElement.clientWidth;
            const restoreHeight = originalHeight || mainChartElement.clientHeight;
            mainChart.resize(restoreWidth, restoreHeight);
            console.log(`✅ Chart restored to original size: ${restoreWidth}×${restoreHeight}`);
        }
        
        // Convert to JPEG blob
        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', CAPTURE_QUALITY);
        });
        
        // Generate filename
        const filename = generateCaptureFilename();
        
        // Download the image
        downloadImage(blob, filename);
        
        console.log(`✅ Chart captured: ${filename} (${Math.round(blob.size / 1024)}KB, ${canvas.width}×${canvas.height})`);
        
        // Show success feedback
        captureBtn.textContent = '✅ Captured!';
        setTimeout(() => {
            captureBtn.textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('❌ Failed to capture chart:', error);
        alert(`⚠️ Error capturing chart: ${error.message}`);
        captureBtn.textContent = originalText;
        
        // Restore original styles on error
        try {
            mainChartElement.style.width = originalStyles.width;
            mainChartElement.style.height = originalStyles.height;
            mainChartElement.style.minHeight = originalStyles.minHeight;
            mainChartElement.style.maxHeight = originalStyles.maxHeight;
            mainChartElement.style.flex = originalStyles.flex;
            mainChartElement.style.position = originalStyles.position;
            
            if (mainChart) {
                const restoreWidth = originalWidth || mainChartElement.clientWidth;
                const restoreHeight = originalHeight || mainChartElement.clientHeight;
                mainChart.resize(restoreWidth, restoreHeight);
            }
        } catch (restoreError) {
            console.error('❌ Failed to restore chart:', restoreError);
        }
    } finally {
        captureBtn.disabled = false;
    }
}

// Take screenshot of chart element using html2canvas
async function takeChartScreenshot(chartElement) {
    // Use html2canvas to capture the chart area
    console.log('📸 Capturing chart using html2canvas...');
    
    const canvas = await html2canvas(chartElement, {
        backgroundColor: '#0a0e1a',
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: CAPTURE_WIDTH,
        windowHeight: CAPTURE_HEIGHT
    });
    
    console.log(`✅ Chart captured: ${canvas.width}×${canvas.height}`);
    
    // Ensure canvas is exactly CAPTURE_WIDTH x CAPTURE_HEIGHT
    if (canvas.width !== CAPTURE_WIDTH || canvas.height !== CAPTURE_HEIGHT) {
        console.warn(`⚠️ Canvas size mismatch: ${canvas.width}×${canvas.height}, resizing to ${CAPTURE_WIDTH}×${CAPTURE_HEIGHT}`);
        
        // Create new canvas with exact dimensions
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = CAPTURE_WIDTH;
        finalCanvas.height = CAPTURE_HEIGHT;
        const ctx = finalCanvas.getContext('2d');
        
        // Fill background
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
        
        // Draw captured image, scaled to fit
        ctx.drawImage(canvas, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
        
        console.log(`✅ Resized to final dimensions: ${finalCanvas.width}×${finalCanvas.height}`);
        return finalCanvas;
    }
    
    return canvas;
}

// Generate filename for captured image
function generateCaptureFilename() {
    const symbol = currentSymbol || 'CHART';
    const interval = currentInterval || '15m';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${symbol}_${interval}_${timestamp}.jpg`;
}

// Download image blob
function downloadImage(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Enable/disable capture button based on data availability
function updateCaptureButtonState() {
    const captureBtn = document.getElementById('captureChartBtn');
    if (!captureBtn) return;
    
    if (currentData && currentData.length > 0) {
        captureBtn.disabled = false;
    } else {
        captureBtn.disabled = true;
    }
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCaptureButton);
} else {
    initializeCaptureButton();
}
/**
 * Trading Platform - Vision AI Extension (Phase 5)
 * GPT-4 Vision integration for chart analysis
 */

// ===== Vision AI State =====
let visionPanelOpen = false;
let conversationHistory = [];
let disclaimerAccepted = false;
let currentChartImageBase64 = null;
let currentChartImageMode = null; // 'Normal (1024×576px)' or 'HD (2048×1152px)'

// ===== Vision AI Initialization =====
function initializeVisionAI() {
    console.log('Initializing Vision AI...');
    
    // Check if disclaimer was previously accepted
    const accepted = localStorage.getItem('vision_disclaimer_accepted');
    disclaimerAccepted = accepted === 'true';
    
    // Attach event listeners
    attachVisionEventListeners();
}

// ===== Event Listeners =====
function attachVisionEventListeners() {
    // Analyze Chart button (Standard mode)
    const analyzeBtn = document.getElementById('analyzeChartBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => handleAnalyzeChart(false));
    }
    
    // Analyze Chart HD button (High-resolution mode)
    const analyzeHDBtn = document.getElementById('analyzeChartHDBtn');
    if (analyzeHDBtn) {
        analyzeHDBtn.addEventListener('click', () => handleAnalyzeChart(true));
    }
    
    // Close Vision Panel
    const closeBtn = document.getElementById('closeVisionPanel');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeVisionPanel);
    }
    
    // Vision Tabs
    const quickTab = document.getElementById('quickAnalysisTab');
    const askTab = document.getElementById('askAITab');
    
    if (quickTab) {
        quickTab.addEventListener('click', () => switchVisionTab('quick'));
    }
    
    if (askTab) {
        askTab.addEventListener('click', () => switchVisionTab('ask'));
    }
    
    // Ask AI Send Button
    const sendBtn = document.getElementById('sendAskAIBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', handleAskAI);
    }
    
    // Ask AI Input - Enter key
    const askInput = document.getElementById('askAIInput');
    if (askInput) {
        askInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAskAI();
            }
        });
    }
    
    // Disclaimer Modal
    const agreeCheckbox = document.getElementById('agreeDisclaimer');
    const acceptBtn = document.getElementById('acceptDisclaimer');
    const cancelBtn = document.getElementById('cancelDisclaimer');
    
    if (agreeCheckbox) {
        agreeCheckbox.addEventListener('change', (e) => {
            if (acceptBtn) {
                acceptBtn.disabled = !e.target.checked;
            }
        });
    }
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', acceptDisclaimer);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeDisclaimerModal);
    }
}

// ===== Handle Analyze Chart =====
/**
 * Analyze Chartボタンのハンドラー
 * @param {boolean} isHDMode - 高解像度モードかどうか
 */


// ===== Capture Chart as Base64 =====
/**
 * チャートを画像としてキャプチャし、Base64形式で返す
 * @param {boolean} isHDMode - 高解像度モードかどうか
 * @returns {Promise<string>} Base64エンコードされた画像データ
 */
async function captureChartAsBase64(isHDMode = false) {
    const mainChartWrapper = document.querySelector('.main-chart-wrapper');
    if (!mainChartWrapper) {
        throw new Error('Chart element not found');
    }
    
    // 解像度をモードに応じて切り替え
    const width = isHDMode ? 2048 : 1024;
    const height = isHDMode ? 1152 : 576;
    
    console.log(`📸 Capturing chart in ${isHDMode ? 'HD' : 'Standard'} mode: ${width}x${height}`);
    
    const canvas = await html2canvas(mainChartWrapper, {
        backgroundColor: '#0a0e27',
        scale: 2,
        logging: false,
        width: width,
        height: height,
        windowWidth: width,
        windowHeight: height
    });
    
    // Convert to base64
    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
    
    // Remove data:image/jpeg;base64, prefix
    return base64Image.replace(/^data:image\/jpeg;base64,/, '');
}

// ===== Quick Analysis =====
async function performQuickAnalysis(imageBase64) {
    const loadingEl = document.getElementById('quickAnalysisLoading');
    const resultEl = document.getElementById('quickAnalysisResult');
    
    if (!loadingEl || !resultEl) return;
    
    // Show loading
    loadingEl.style.display = 'block';
    resultEl.innerHTML = '';
    
    try {
        // Get active indicators
        const indicators = Array.from(activeIndicators.keys());
        
        // Call Vision API
        const response = await fetch(`${API_BASE}/vision/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: imageBase64,
                symbol: currentSymbol || 'UNKNOWN',
                interval: currentInterval || '15m',
                indicators: indicators
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Analysis failed');
        }
        
        const responseData = await response.json();
        const result = responseData.data; // Extract data property
        
        // Display result
        displayQuickAnalysisResult(result);
        
    } catch (error) {
        console.error('Quick Analysis error:', error);
        resultEl.innerHTML = `
            <div class="error-message">
                <strong>⚠️ エラー</strong>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        loadingEl.style.display = 'none';
    }
}

// ===== Display Quick Analysis Result =====

// ===== Handle Ask AI =====

// ===== Add Message to History =====
function addMessageToHistory(role, content) {
    const historyEl = document.getElementById('conversationHistory');
    if (!historyEl) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${role}`;
    
    if (role === 'user') {
        messageDiv.innerHTML = `
            <div class="message-header">👤 あなた</div>
            <div class="message-content">${escapeHtml(content)}</div>
        `;
    } else if (role === 'assistant') {
        messageDiv.innerHTML = `
            <div class="message-header">🤖 AI アシスタント</div>
            <div class="message-content">${formatAIResponse(content)}</div>
            <div class="message-disclaimer">
                ⚠️ 本回答は教育目的の参考情報です。投資判断はご自身の責任で行ってください。
            </div>
        `;
    } else if (role === 'error') {
        messageDiv.innerHTML = `
            <div class="message-content error-message">${escapeHtml(content)}</div>
        `;
    }
    
    historyEl.appendChild(messageDiv);
    
    // Scroll to bottom
    historyEl.scrollTop = historyEl.scrollHeight;
}

// ===== Format AI Response =====
function formatAIResponse(text) {
    // Convert markdown-style formatting to HTML
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    
    return formatted;
}

// ===== Escape HTML =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== Vision Panel Controls =====
function openVisionPanel() {
    const panel = document.getElementById('visionPanel');
    if (panel) {
        panel.classList.add('open');
        visionPanelOpen = true;
        
        // 前回の結果を復元
        if (lastQuickAnalysisResult) {
            console.log('🔄 Restoring last Quick Analysis result on panel open');
            restoreLastQuickAnalysisResult();
        }
    }
}

function closeVisionPanel() {
    const panel = document.getElementById('visionPanel');
    if (panel) {
        panel.classList.remove('open');
        visionPanelOpen = false;
    }
}

function switchVisionTab(tabName) {
    const quickTab = document.getElementById('quickAnalysisTab');
    const askTab = document.getElementById('askAITab');
    const quickContent = document.getElementById('quickAnalysisContent');
    const askContent = document.getElementById('askAIContent');
    
    if (!quickTab || !askTab || !quickContent || !askContent) return;
    
    if (tabName === 'quick') {
        quickTab.classList.add('active');
        askTab.classList.remove('active');
        quickContent.style.display = 'block';
        askContent.style.display = 'none';
        
        // 前回の結果を復元
        restoreLastQuickAnalysisResult();
    } else if (tabName === 'ask') {
        quickTab.classList.remove('active');
        askTab.classList.add('active');
        quickContent.style.display = 'none';
        askContent.style.display = 'block';
    }
}

// ===== Disclaimer Modal =====
function showDisclaimerModal() {
    const modal = document.getElementById('disclaimerModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeDisclaimerModal() {
    const modal = document.getElementById('disclaimerModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset checkbox
    const checkbox = document.getElementById('agreeDisclaimer');
    if (checkbox) {
        checkbox.checked = false;
    }
    
    const acceptBtn = document.getElementById('acceptDisclaimer');
    if (acceptBtn) {
        acceptBtn.disabled = true;
    }
}

function acceptDisclaimer() {
    disclaimerAccepted = true;
    localStorage.setItem('vision_disclaimer_accepted', 'true');
    closeDisclaimerModal();
    
    // Continue with analysis
    handleAnalyzeChart();
}

// ===== Initialize on Load =====
// Add to existing window load event
if (window.visionInitialized !== true) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            initializeVisionAI();
            window.visionInitialized = true;
        }, 300);
    });
}
// ============================================================
// Vision Analysis Quality Check Module
// Phase 5: Pre-analysis data and chart quality validation
// ============================================================

/**
 * チャート分析の品質チェック設定
 */
const QUALITY_CHECK = {
    MIN_CANDLES: 50,                    // 最低ローソク足数
    RECOMMENDED_CANDLES: 100,           // 推奨ローソク足数
    MAX_CANDLES_STANDARD: 200,          // 通常モードの上限
    MAX_CANDLES_HD: 500,                // 高解像度モードの上限
    MIN_VISIBLE_CANDLES: 20,            // 最低可視ローソク足数
    WARNING_SHOWN_KEY: 'visionQualityWarningShown' // LocalStorage キー
};

/**
 * チャートデータと品質をチェック
 * @param {boolean} isHDMode - 高解像度モードかどうか
 * @returns {Object} { valid: boolean, warnings: string[], suggestions: string[] }
 */
function checkChartQuality(isHDMode = false) {
    const warnings = [];
    const suggestions = [];
    
    // データ量チェック
    if (!currentData || currentData.length === 0) {
        warnings.push('チャートデータが読み込まれていません');
        suggestions.push('左側のパネルから銘柄を選択し、「Load Data」ボタンをクリックしてデータを読み込んでください');
        return { valid: false, warnings, suggestions };
    }
    
    const candleCount = currentData.length;
    const maxCandles = isHDMode ? QUALITY_CHECK.MAX_CANDLES_HD : QUALITY_CHECK.MAX_CANDLES_STANDARD;
    const modeName = isHDMode ? '高解像度モード' : '通常モード';
    
    // ローソク足数の上限チェック
    if (candleCount > maxCandles) {
        warnings.push(`ローソク足が多すぎます（現在: ${candleCount}本 / ${modeName}上限: ${maxCandles}本）`);
        suggestions.push('Range（データ期間）を短くして、ローソク足数を減らしてください');
        suggestions.push('または、チャートを拡大して可視範囲のローソク足を減らしてください');
        if (!isHDMode) {
            suggestions.push('または、「高解像度分析」モード（上限500本、コスト2倍）をご利用ください');
        }
    }
    
    // 最低データ量チェック
    if (candleCount < QUALITY_CHECK.MIN_CANDLES) {
        warnings.push(`データ量が不足しています（現在: ${candleCount}本 / 最低推奨: ${QUALITY_CHECK.MIN_CANDLES}本）`);
        suggestions.push('Range（データ範囲）を「5 Days」または「1 Week」に変更して、より多くのデータを読み込んでください');
    }
    
    // 推奨データ量チェック
    if (candleCount < QUALITY_CHECK.RECOMMENDED_CANDLES && candleCount >= QUALITY_CHECK.MIN_CANDLES) {
        warnings.push(`より多くのデータがあると分析精度が向上します（現在: ${candleCount}本 / 推奨: ${QUALITY_CHECK.RECOMMENDED_CANDLES}本以上）`);
        suggestions.push('Range（データ範囲）を「1 Week」または「1 Month」に変更することをお勧めします');
    }
    
    // チャート可視範囲チェック（Lightweight Chartsの表示範囲を推定）
    if (mainChart) {
        try {
            const visibleRange = mainChart.timeScale().getVisibleRange();
            if (visibleRange) {
                const visibleCandles = currentData.filter(candle => 
                    candle.time >= visibleRange.from && candle.time <= visibleRange.to
                ).length;
                
                if (visibleCandles < QUALITY_CHECK.MIN_VISIBLE_CANDLES) {
                    warnings.push(`チャートが縮小されすぎています（可視ローソク足: 約${visibleCandles}本）`);
                    suggestions.push('マウスホイールまたはピンチ操作でチャートを拡大してください');
                    suggestions.push('ローソク足の形状が明確に見える程度まで拡大することをお勧めします');
                }
            }
        } catch (error) {
            console.warn('Failed to check visible range:', error);
        }
    }
    
    // データ量は十分だが警告が1つもない場合
    const isValid = warnings.length === 0 || (candleCount >= QUALITY_CHECK.MIN_CANDLES && warnings.length === 1 && warnings[0].includes('より多くのデータ'));
    
    return {
        valid: isValid,
        warnings,
        suggestions,
        candleCount,
        hasMinimumData: candleCount >= QUALITY_CHECK.MIN_CANDLES
    };
}

/**
 * 品質チェック結果ダイアログを表示
 * @param {Object} checkResult - checkChartQuality() の戻り値
 * @returns {Promise<boolean>} - ユーザーが続行を選択した場合 true
 */
function showQualityCheckDialog(checkResult) {
    return new Promise((resolve) => {
        const modal = document.getElementById('qualityCheckModal');
        const warningsContainer = document.getElementById('qualityWarnings');
        const suggestionsContainer = document.getElementById('qualitySuggestions');
        const continueBtn = document.getElementById('qualityContinueBtn');
        const cancelBtn = document.getElementById('qualityCancelBtn');
        const dontShowAgain = document.getElementById('qualityDontShowAgain');
        
        // 警告メッセージを表示
        warningsContainer.innerHTML = checkResult.warnings.map(warning => 
            `<div class="quality-warning-item">⚠️ ${warning}</div>`
        ).join('');
        
        // 改善提案を表示
        suggestionsContainer.innerHTML = checkResult.suggestions.map((suggestion, index) => 
            `<div class="quality-suggestion-item">${index + 1}. ${suggestion}</div>`
        ).join('');
        
        // データ量が最低基準を満たしている場合は「続行」ボタンを有効化
        if (checkResult.hasMinimumData) {
            continueBtn.disabled = false;
            continueBtn.textContent = 'このまま分析を実行';
        } else {
            continueBtn.disabled = true;
            continueBtn.textContent = '分析を実行（データ不足）';
        }
        
        // モーダルを表示
        modal.style.display = 'flex';
        
        // イベントリスナー
        const handleContinue = () => {
            if (dontShowAgain.checked) {
                localStorage.setItem(QUALITY_CHECK.WARNING_SHOWN_KEY, 'true');
            }
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            modal.style.display = 'none';
            continueBtn.removeEventListener('click', handleContinue);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        
        continueBtn.addEventListener('click', handleContinue);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

/**
 * 初回利用ガイドを表示
 */
function showFirstTimeGuide() {
    const modal = document.getElementById('visionGuideModal');
    const closeBtn = document.getElementById('guideCloseBtn');
    const dontShowAgain = document.getElementById('guideDontShowAgain');
    
    modal.style.display = 'flex';
    
    closeBtn.addEventListener('click', () => {
        if (dontShowAgain.checked) {
            localStorage.setItem('visionGuideShown', 'true');
        }
        modal.style.display = 'none';
    });
}

/**
 * Vision分析前の統合チェック
 * @param {boolean} isHDMode - 高解像度モードかどうか
 * @returns {Promise<boolean>} - 分析を続行する場合 true
 */
async function performPreAnalysisCheck(isHDMode = false) {
    // 初回利用ガイド表示（LocalStorageでスキップ可能）
    const guideShown = localStorage.getItem('visionGuideShown');
    if (!guideShown) {
        showFirstTimeGuide();
        // ガイドは情報提供のみで、続行を妨げない
    }
    
    // 品質チェック実行（isHDModeを渡す）
    const checkResult = checkChartQuality(isHDMode);
    
    // 警告表示スキップ設定を確認
    const warningSkipped = localStorage.getItem(QUALITY_CHECK.WARNING_SHOWN_KEY);
    
    // データが完全に問題ない、または警告スキップ設定がある場合は即座に続行
    if (checkResult.valid && !checkResult.warnings.length) {
        return true;
    }
    
    if (warningSkipped === 'true' && checkResult.hasMinimumData) {
        return true;
    }
    
    // 警告がある場合はダイアログを表示してユーザーに確認
    if (checkResult.warnings.length > 0) {
        return await showQualityCheckDialog(checkResult);
    }
    
    return true;
}

/**
 * 品質チェック設定をリセット（デバッグ用）
 */
function resetQualityCheckSettings() {
    localStorage.removeItem(QUALITY_CHECK.WARNING_SHOWN_KEY);
    localStorage.removeItem('visionGuideShown');
    console.log('✅ Vision品質チェック設定をリセットしました');
}

// グローバルスコープに公開（デバッグ用）
window.resetVisionQualityCheck = resetQualityCheckSettings;

console.log('✅ Vision Quality Check Module loaded');
// ============================================================
// 🔧 ATR/ADX Technical Indicators Calculation
// ============================================================

/**
 * ATR (Average True Range) - ボラティリティ指標
 * @param {Array} data - ローソク足データ [{high, low, close}, ...]
 * @param {number} period - 期間（デフォルト14）
 * @returns {number} 最新のATR値
 */
function calculateATR(data, period = 14) {
    if (!data || data.length < period + 1) {
        return null;
    }

    const trueRanges = [];
    
    for (let i = 1; i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevClose = data[i - 1].close;
        
        // True Range = max(high - low, |high - prevClose|, |low - prevClose|)
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        
        trueRanges.push(tr);
    }
    
    // 最初のATRは単純平均
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    
    // その後は指数移動平均
    for (let i = period; i < trueRanges.length; i++) {
        atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    }
    
    return atr;
}

/**
 * ADX (Average Directional Index) - トレンド強度指標
 * @param {Array} data - ローソク足データ [{high, low, close}, ...]
 * @param {number} period - 期間（デフォルト14）
 * @returns {number} 最新のADX値
 */
function calculateADX(data, period = 14) {
    if (!data || data.length < period * 2) {
        return null;
    }

    const plusDM = [];
    const minusDM = [];
    const tr = [];
    
    // Step 1: +DM, -DM, TR を計算
    for (let i = 1; i < data.length; i++) {
        const highDiff = data[i].high - data[i - 1].high;
        const lowDiff = data[i - 1].low - data[i].low;
        
        // +DM
        if (highDiff > lowDiff && highDiff > 0) {
            plusDM.push(highDiff);
        } else {
            plusDM.push(0);
        }
        
        // -DM
        if (lowDiff > highDiff && lowDiff > 0) {
            minusDM.push(lowDiff);
        } else {
            minusDM.push(0);
        }
        
        // TR (True Range)
        const trValue = Math.max(
            data[i].high - data[i].low,
            Math.abs(data[i].high - data[i - 1].close),
            Math.abs(data[i].low - data[i - 1].close)
        );
        tr.push(trValue);
    }
    
    // Step 2: スムージング（Wilder's smoothing）
    const smoothPlusDM = [];
    const smoothMinusDM = [];
    const smoothTR = [];
    
    // 最初の値は単純平均
    let sumPlusDM = plusDM.slice(0, period).reduce((sum, val) => sum + val, 0);
    let sumMinusDM = minusDM.slice(0, period).reduce((sum, val) => sum + val, 0);
    let sumTR = tr.slice(0, period).reduce((sum, val) => sum + val, 0);
    
    smoothPlusDM.push(sumPlusDM);
    smoothMinusDM.push(sumMinusDM);
    smoothTR.push(sumTR);
    
    // その後はWilder's smoothing
    for (let i = period; i < plusDM.length; i++) {
        sumPlusDM = sumPlusDM - (sumPlusDM / period) + plusDM[i];
        sumMinusDM = sumMinusDM - (sumMinusDM / period) + minusDM[i];
        sumTR = sumTR - (sumTR / period) + tr[i];
        
        smoothPlusDM.push(sumPlusDM);
        smoothMinusDM.push(sumMinusDM);
        smoothTR.push(sumTR);
    }
    
    // Step 3: +DI と -DI を計算
    const plusDI = [];
    const minusDI = [];
    
    for (let i = 0; i < smoothPlusDM.length; i++) {
        plusDI.push(smoothTR[i] !== 0 ? (smoothPlusDM[i] / smoothTR[i]) * 100 : 0);
        minusDI.push(smoothTR[i] !== 0 ? (smoothMinusDM[i] / smoothTR[i]) * 100 : 0);
    }
    
    // Step 4: DX (Directional Index) を計算
    const dx = [];
    for (let i = 0; i < plusDI.length; i++) {
        const sum = plusDI[i] + minusDI[i];
        const diff = Math.abs(plusDI[i] - minusDI[i]);
        dx.push(sum !== 0 ? (diff / sum) * 100 : 0);
    }
    
    // Step 5: ADX を計算（DXの移動平均）
    if (dx.length < period) {
        return null;
    }
    
    let adx = dx.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    
    for (let i = period; i < dx.length; i++) {
        adx = ((adx * (period - 1)) + dx[i]) / period;
    }
    
    return adx;
}

/**
 * テクニカルデータを収集してAPI送信用に整形
 * @param {Array} data - ローソク足データ
 * @param {Object} activeIndicators - アクティブなインジケーター
 * @returns {Object} technicalData
 */
function collectTechnicalData(data, activeIndicators) {
    if (!data || data.length === 0) {
        return null;
    }

    const latestCandle = data[data.length - 1];
    const currentPrice = latestCandle.close;
    
    // 価格範囲を計算
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    const highPrice = Math.max(...highs);
    const lowPrice = Math.min(...lows);
    const priceRange = highPrice - lowPrice;
    const rangePercent = (priceRange / lowPrice) * 100;
    
    // 時間範囲
    const startTime = new Date(data[0].time * 1000).toISOString();
    const endTime = new Date(latestCandle.time * 1000).toISOString();
    
    // 表示中のインジケーター値を収集
    const displayedIndicators = {};
    
    for (const [key, indicator] of Object.entries(activeIndicators)) {
        const series = indicator.series;
        
        if (key.startsWith('rsi')) {
            // RSI
            if (series && series.data && series.data.length > 0) {
                const lastRSI = series.data[series.data.length - 1];
                displayedIndicators[`RSI(${indicator.params.period})`] = {
                    value: lastRSI.value
                };
            }
        } else if (key.startsWith('macd')) {
            // MACD
            if (series.macd && series.macd.data && series.macd.data.length > 0) {
                const lastMACD = series.macd.data[series.macd.data.length - 1];
                const lastSignal = series.signal.data[series.signal.data.length - 1];
                const lastHistogram = series.histogram.data[series.histogram.data.length - 1];
                
                displayedIndicators[`MACD(${indicator.params.fastPeriod},${indicator.params.slowPeriod},${indicator.params.signalPeriod})`] = {
                    macd: lastMACD.value,
                    signal: lastSignal.value,
                    histogram: lastHistogram.value
                };
            }
        } else if (key.startsWith('bollinger')) {
            // Bollinger Bands
            if (series.upper && series.upper.data && series.upper.data.length > 0) {
                const lastUpper = series.upper.data[series.upper.data.length - 1];
                const lastMiddle = series.middle.data[series.middle.data.length - 1];
                const lastLower = series.lower.data[series.lower.data.length - 1];
                
                displayedIndicators[`Bollinger Bands(${indicator.params.period},${indicator.params.stdDev})`] = {
                    upper: lastUpper.value,
                    middle: lastMiddle.value,
                    lower: lastLower.value
                };
            }
        } else if (key.startsWith('sma') || key.startsWith('ema')) {
            // SMA/EMA
            if (series && series.data && series.data.length > 0) {
                const lastValue = series.data[series.data.length - 1];
                const type = key.startsWith('sma') ? 'SMA' : 'EMA';
                displayedIndicators[`${type}(${indicator.params.period})`] = {
                    value: lastValue.value
                };
            }
        }
    }
    
    // ATR と ADX を計算
    const atr = calculateATR(data, 14);
    const adx = calculateADX(data, 14);
    
    const technicalData = {
        currentPrice: currentPrice,
        priceRange: {
            high: highPrice,
            low: lowPrice,
            range: priceRange,
            rangePercent: rangePercent
        },
        candleCount: data.length,
        timeRange: {
            start: startTime,
            end: endTime
        },
        displayedIndicators: displayedIndicators,
        additionalIndicators: {
            atr: atr,
            adx: adx
        }
    };
    
    console.log('📊 Collected Technical Data:', technicalData);
    
    return technicalData;
}
// ============================================================
// 🎨 Vision AI - Complete Quick Analysis Implementation
// ============================================================


/**
 * Analyze Chart ハンドラー（完全版）
 * @param {boolean} isHDMode - HD Mode (2048x1152) or Normal Mode (1024x576)
 */
async function handleAnalyzeChart(isHDMode = false) {
    try {
        // Vision Panelを開く
        openVisionPanel();
        
        // Quick Analysisタブに切り替え
        switchVisionTab('quick');
        
        // データチェック
        if (!currentData || currentData.length === 0) {
            alert('チャートデータが読み込まれていません。\nLoad Data を実行してください。');
            return;
        }

        // 品質チェック
        const qualityCheckPassed = await performPreAnalysisCheck(isHDMode);
        if (!qualityCheckPassed) {
            console.log('⚠️ Quality check failed or user cancelled');
            return;
        }

        console.log(`🚀 Starting Quick Analysis (${isHDMode ? 'HD Mode 2048x1152' : 'Normal Mode 1024x576'})`);

        // AbortController作成
        quickAnalysisAbortController = new AbortController();

        // ローディング表示
        const loadingEl = document.getElementById('quickAnalysisLoading');
        const resultEl = document.getElementById('quickAnalysisResult');
        const cancelBtn = document.getElementById('analysisCancelBtn');
        
        if (loadingEl) loadingEl.style.display = 'flex';
        if (resultEl) resultEl.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        // チャート画像をキャプチャ
        let imageBase64;
        try {
            imageBase64 = await captureChartAsBase64(isHDMode);
            
            // 画像を保存（Ask AIで再利用）
            currentChartImageBase64 = imageBase64;
            currentChartImageMode = isHDMode ? 'HD (2048×1152px)' : 'Normal (1024×576px)';
            console.log(`💾 Chart image saved for Ask AI: ${currentChartImageMode}`);
        } catch (error) {
            console.error('❌ Chart capture error:', error);
            alert(`チャートのキャプチャに失敗しました: ${error.message}`);
            if (loadingEl) loadingEl.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            return;
        }

        // テクニカルデータを収集
        const technicalData = collectTechnicalData(currentData, activeIndicators);
        if (!technicalData) {
            alert('テクニカルデータの収集に失敗しました。');
            if (loadingEl) loadingEl.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
            return;
        }

        // API リクエスト
        const requestBody = {
            image: imageBase64,
            symbol: currentSymbol,
            interval: currentInterval,
            indicators: Object.entries(activeIndicators).map(([key, ind]) => ({
                name: ind.name,
                params: ind.params
            })),
            technicalData: technicalData
        };

        console.log('📤 Sending Vision API request...');
        console.log('Technical Data:', technicalData);

        const response = await fetch(`${API_BASE}/vision/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: quickAnalysisAbortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Analysis failed');
        }

        console.log('✅ Quick Analysis result:', result.data);

        // 結果を保存（再表示用）
        lastQuickAnalysisResult = result.data;
        
        // Show Last Resultボタンを表示
        updateShowLastResultButton();

        // 結果を表示
        displayQuickAnalysisResult(result.data);

        // ローディング非表示
        if (loadingEl) loadingEl.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⚠️ Analysis cancelled by user');
            alert('分析をキャンセルしました。');
        } else {
            console.error('❌ Quick Analysis error:', error);
            alert(`AI分析エラー: ${error.message}`);
        }

        const loadingEl = document.getElementById('quickAnalysisLoading');
        const cancelBtn = document.getElementById('analysisCancelBtn');
        if (loadingEl) loadingEl.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }
}

/**
 * 分析をキャンセル
 */
function cancelQuickAnalysis() {
    if (quickAnalysisAbortController) {
        quickAnalysisAbortController.abort();
        quickAnalysisAbortController = null;
    }
}

/**
 * 結果表示（完全版 - ATR/ADX対応、確率%表示）
 */
function displayQuickAnalysisResult(result) {
    console.log('📊 displayQuickAnalysisResult called with:', result);
    const resultContainer = document.getElementById('quickAnalysisResult');
    
    if (!resultContainer) {
        console.error('❌ Result container not found');
        return;
    }
    
    console.log('✅ Result container found:', resultContainer);

    let html = '<div class="analysis-sections">';

    // Disclaimer
    if (result.disclaimer) {
        html += `
            <div class="analysis-section disclaimer-section">
                <p>${result.disclaimer}</p>
            </div>
        `;
    }

    // Trend
    if (result.trend) {
        html += `
            <div class="analysis-section">
                <h3>📈 トレンド分析</h3>
                <div class="trend-info">
                    <div class="trend-badge trend-${result.trend.direction}">${result.trend.direction}</div>
                    <div class="trend-strength">${result.trend.strength}</div>
                </div>
                <p>${result.trend.description}</p>
            </div>
        `;
    }

    // Pattern
    if (result.pattern) {
        html += `
            <div class="analysis-section">
                <h3>📊 チャートパターン</h3>
                <div class="pattern-info">
                    <div class="pattern-detected">${result.pattern.detected.join(', ')}</div>
                    <div class="pattern-confidence">信頼度: ${result.pattern.confidence}</div>
                </div>
                <p>${result.pattern.description}</p>
            </div>
        `;
    }

    // Support/Resistance
    if (result.levels) {
        html += `
            <div class="analysis-section">
                <h3>🎯 サポート/レジスタンス</h3>
                <div class="levels-grid">
                    <div class="levels-column">
                        <strong>📉 サポート:</strong>
                        <ul>${result.levels.support.map(level => `<li>${level.toFixed(2)}</li>`).join('')}</ul>
                    </div>
                    <div class="levels-column">
                        <strong>📈 レジスタンス:</strong>
                        <ul>${result.levels.resistance.map(level => `<li>${level.toFixed(2)}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>
        `;
    }

    // Indicators（ATR/ADX含む）
    if (result.indicators && Object.keys(result.indicators).length > 0) {
        html += `
            <div class="analysis-section">
                <h3>📊 インジケーター分析</h3>
                <div class="indicators-list">
        `;

        for (const [name, data] of Object.entries(result.indicators)) {
            html += `<div class="indicator-detail">`;
            html += `<strong>${name}</strong>: `;

            // 値を表示
            if (data.value !== undefined) {
                html += `${data.value.toFixed(2)}`;
            } else if (data.macd !== undefined) {
                html += `MACD=${data.macd.toFixed(4)}, Signal=${data.signal.toFixed(4)}, Histogram=${data.histogram.toFixed(4)}`;
            } else if (data.upper !== undefined) {
                html += `Upper=${data.upper.toFixed(2)}, Middle=${data.middle.toFixed(2)}, Lower=${data.lower.toFixed(2)}`;
            }

            // 解釈を表示
            if (data.interpretation) {
                html += `<br><span class="indicator-interpretation">${data.interpretation}</span>`;
            }

            html += `</div>`;
        }

        html += `
                </div>
            </div>
        `;
    }

    // Recommendation with Scenarios（確率%表示）
    if (result.recommendation) {
        html += `
            <div class="analysis-section">
                <h3>💡 教育的見解</h3>
                <div class="recommendation-action">${result.recommendation.action}</div>
                <p><strong>理由:</strong> ${result.recommendation.reason}</p>
        `;

        // Scenarios（確率%を目立たせる）
        if (result.recommendation.scenarios && result.recommendation.scenarios.length > 0) {
            html += `<div class="scenarios-container">`;
            
            for (const scenario of result.recommendation.scenarios) {
                const probabilityClass = 
                    parseInt(scenario.probability) >= 50 ? 'high-probability' :
                    parseInt(scenario.probability) >= 30 ? 'medium-probability' :
                    'low-probability';
                
                html += `
                    <div class="scenario-card ${probabilityClass}">
                        <div class="scenario-header">
                            <h4>${scenario.case}</h4>
                            <div class="scenario-probability">${scenario.probability}</div>
                        </div>
                        <p><strong>条件:</strong> ${scenario.conditions}</p>
                        ${scenario.entry ? `<p><strong>エントリー:</strong> ${scenario.entry}</p>` : ''}
                        <p><strong>目標:</strong> ${scenario.target}</p>
                        ${scenario.stopLoss ? `<p><strong>ストップロス:</strong> ${scenario.stopLoss}</p>` : ''}
                    </div>
                `;
            }
            
            html += `</div>`;
        }

        // Risk Factors
        if (result.recommendation.riskFactors && result.recommendation.riskFactors.length > 0) {
            html += `
                <div class="risk-factors">
                    <strong>⚠️ リスク要因:</strong>
                    <ul>${result.recommendation.riskFactors.map(risk => `<li>${risk}</li>`).join('')}</ul>
                </div>
            `;
        }

        // Conclusion
        if (result.recommendation.conclusion) {
            html += `<p class="conclusion"><strong>結論:</strong> ${result.recommendation.conclusion}</p>`;
        }

        html += `</div>`;
    }

    html += '</div>';

    console.log('📝 Setting result HTML, length:', html.length);
    resultContainer.innerHTML = html;
    resultContainer.style.display = 'block';
    console.log('✅ Result displayed, container visibility:', resultContainer.style.display);
}

/**
 * Vision Panelが開かれた時、前回の結果を再表示
 */
function restoreLastQuickAnalysisResult() {
    if (lastQuickAnalysisResult) {
        console.log('🔄 Restoring last Quick Analysis result');
        displayQuickAnalysisResult(lastQuickAnalysisResult);
    }
}

console.log('✅ Quick Analysis implementation (complete) loaded');
// ============================================================
// 💬 Ask AI - Complete Implementation with Better Loading
// ============================================================


/**
 * Ask AI - ユーザーの質問に回答
 */
async function handleAskAI() {
    try {
        const questionInput = document.getElementById('askAIQuestionInput');
        const question = questionInput ? questionInput.value.trim() : '';

        if (!question) {
            alert('質問を入力してください。');
            return;
        }

        // 分析結果がない場合
        if (!currentChartImageBase64) {
            alert('まず「Analyze Chart」または「Analyze (HD)」を実行してください。\n\nAsk AIは分析結果について質問するための機能です。');
            return;
        }

        if (!currentData || currentData.length === 0) {
            alert('チャートデータが読み込まれていません。');
            return;
        }

        console.log('🤔 Ask AI:', question);
        console.log(`📸 Using saved chart image: ${currentChartImageMode}`);

        // AbortController作成
        askAIAbortController = new AbortController();

        // ローディング表示（画面中央）
        const loadingEl = document.getElementById('askAILoading');
        const historyEl = document.getElementById('askAIHistory');
        const cancelBtn = document.getElementById('askAICancelBtn');
        
        if (loadingEl) loadingEl.style.display = 'flex';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        // 保存済み画像を使用（再キャプチャしない）
        const imageBase64 = currentChartImageBase64;

        // コンテキスト
        const context = {
            symbol: currentSymbol,
            interval: currentInterval,
            indicators: Object.entries(activeIndicators).map(([key, ind]) => ({
                name: ind.name,
                params: ind.params
            }))
        };

        // API リクエスト
        const requestBody = {
            image: imageBase64,
            question: question,
            context: context,
            conversationHistory: askAIConversationHistory
        };

        console.log('📤 Sending Ask AI request...');

        const response = await fetch(`${API_BASE}/vision/ask`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: askAIAbortController.signal
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Ask AI failed');
        }

        console.log('✅ Ask AI result:', result.data);

        const answer = result.data.answer;

        // 会話履歴に追加
        askAIConversationHistory.push({
            question: question,
            answer: answer
        });

        // 会話履歴を表示
        displayAskAIConversation(question, answer);

        // 入力フィールドをクリア
        if (questionInput) questionInput.value = '';

        // ローディング非表示
        if (loadingEl) loadingEl.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⚠️ Ask AI cancelled by user');
            alert('質問をキャンセルしました。');
        } else {
            console.error('❌ Ask AI error:', error);
            alert(`AI質問エラー: ${error.message}`);
        }

        const loadingEl = document.getElementById('askAILoading');
        const cancelBtn = document.getElementById('askAICancelBtn');
        if (loadingEl) loadingEl.style.display = 'none';
        if (cancelBtn) cancelBtn.style.display = 'none';
    }
}

/**
 * Ask AI をキャンセル
 */
function cancelAskAI() {
    if (askAIAbortController) {
        askAIAbortController.abort();
        askAIAbortController = null;
    }
}

/**
 * 会話履歴を表示
 */
function displayAskAIConversation(question, answer) {
    const historyContainer = document.getElementById('askAIHistory');
    
    if (!historyContainer) {
        console.error('❌ Ask AI history container not found');
        return;
    }

    const conversationItem = document.createElement('div');
    conversationItem.className = 'conversation-item';
    
    conversationItem.innerHTML = `
        <div class="conversation-question">
            <strong>Q:</strong> ${escapeHtml(question)}
        </div>
        <div class="conversation-answer">
            <strong>A:</strong> ${escapeHtml(answer)}
        </div>
    `;

    historyContainer.appendChild(conversationItem);

    // スクロールを下に
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

/**
 * 会話履歴をクリア
 */
function clearAskAIHistory() {
    askAIConversationHistory = [];
    const historyContainer = document.getElementById('askAIHistory');
    if (historyContainer) {
        historyContainer.innerHTML = '<div class="empty-state">質問を入力してAIに聞いてみましょう</div>';
    }
    console.log('🗑️ Ask AI history cleared');
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('✅ Ask AI implementation (complete) loaded');
// ============================================================
// 📊 Update ATR/ADX Display in Sidebar
// ============================================================

/**
 * サイドバーにATR/ADX値を表示
 */
function updateTechnicalIndicatorsDisplay(data) {
    if (!data || data.length < 30) {
        return;
    }

    // ATR計算
    const atr = calculateATR(data, 14);
    // ADX計算
    const adx = calculateADX(data, 14);

    // ATRをactiveIndicatorsに追加（まだ追加されていない場合）
    if (atr && !activeIndicators['atr_14']) {
        activeIndicators['atr_14'] = {
            name: 'ATR',
            params: { period: 14 },
            series: null,  // 表示専用
            value: atr
        };
    } else if (atr && activeIndicators['atr_14']) {
        activeIndicators['atr_14'].value = atr;
    }

    // ADXをactiveIndicatorsに追加
    if (adx && !activeIndicators['adx_14']) {
        activeIndicators['adx_14'] = {
            name: 'ADX',
            params: { period: 14 },
            series: null,  // 表示専用
            value: adx
        };
    } else if (adx && activeIndicators['adx_14']) {
        activeIndicators['adx_14'].value = adx;
    }

    // Active Indicatorsリストを更新
    updateActiveIndicatorsList();

    console.log('📊 Technical Indicators updated:', { atr: atr?.toFixed(4), adx: adx?.toFixed(2) });
}
// ========================================
// Show Last Result機能
// ========================================

/**
 * Show Last Resultボタンの表示/非表示を制御
 */
function updateShowLastResultButton() {
    const showLastResultBtn = document.getElementById('showLastResultBtn');
    if (!showLastResultBtn) return;

    if (lastQuickAnalysisResult && Object.keys(lastQuickAnalysisResult).length > 0) {
        showLastResultBtn.style.display = 'inline-flex';
    } else {
        showLastResultBtn.style.display = 'none';
    }
    
    // Ask AIの画像情報も更新
    updateAskAIImageInfo();
}

/**
 * 過去の分析結果を表示（新規分析なし）
 */
function showLastAnalysisResult() {
    if (!lastQuickAnalysisResult || Object.keys(lastQuickAnalysisResult).length === 0) {
        alert('表示する分析結果がありません。\nまず「Analyze Chart」を実行してください。');
        return;
    }

    console.log('📋 Showing last analysis result (no new analysis)');
    
    // Vision Panelを開く
    openVisionPanel();
    
    // Quick Analysisタブに切り替え
    switchVisionTab('quick');
    
    // 過去の結果を表示
    displayQuickAnalysisResult({ data: lastQuickAnalysisResult });
}

// Show Last Resultボタンのイベントリスナー
window.addEventListener('DOMContentLoaded', () => {
    const showLastResultBtn = document.getElementById('showLastResultBtn');
    if (showLastResultBtn) {
        showLastResultBtn.addEventListener('click', showLastAnalysisResult);
        console.log('✅ Show Last Result button initialized');
    }
});
// ========================================
// Ask AI Image Info Update
// ========================================

/**
 * Ask AIタブの画像情報を更新
 */
function updateAskAIImageInfo() {
    const infoEl = document.getElementById('askAIImageSource');
    if (!infoEl) return;

    if (currentChartImageBase64) {
        infoEl.textContent = `使用中の画像: Analyze (${currentChartImageMode || 'Unknown'})`;
        infoEl.className = 'has-image';
    } else {
        infoEl.textContent = '画像なし - まずAnalyzeを実行してください';
        infoEl.className = 'no-image';
    }
}

// Override switchVisionTab to update image info when switching to Ask AI
const originalSwitchVisionTab = switchVisionTab;
switchVisionTab = function(tabName) {
    originalSwitchVisionTab(tabName);
    
    if (tabName === 'ask') {
        updateAskAIImageInfo();
    }
};
// ========================================
// Logout Functionality
// ========================================

window.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('ログアウトしますか？')) {
                const AUTH_KEY = 'ai_black_scopezx_authenticated';
                localStorage.removeItem(AUTH_KEY);
                window.location.href = 'auth.html';
            }
        });
        console.log('✅ Logout button initialized');
    }
});
