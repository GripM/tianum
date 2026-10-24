<?php
/**
 * Tianum Networth Managers - Market Data Static Provider for cPanel (PHP)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=15, stale-while-revalidate=30');

$cacheFile = __DIR__ . '/../public/data/market-data.json';

if (file_exists($cacheFile)) {
    echo file_get_contents($cacheFile);
    exit;
}

// Fallback baseline
echo json_encode([
    'status' => 'success',
    'timestamp' => time(),
    'cached' => true,
    'market_status' => [
        'bse' => 'OPEN',
        'isBseOpen' => true,
        'timezone' => 'IST (UTC+5:30)'
    ],
    'indices' => [
        'sensex' => [
            'name' => 'BSE SENSEX',
            'price' => 73709.69,
            'change' => -143.21,
            'percentChange' => -0.19,
            'direction' => 'down',
            'display' => '73,709.69'
        ],
        'usdinr' => [
            'name' => 'USD / INR',
            'price' => 94.45,
            'change' => -0.54,
            'percentChange' => -0.57,
            'direction' => 'down',
            'display' => '94.45'
        ],
        'brent' => [
            'name' => 'Brent Crude',
            'price' => 109.16,
            'change' => 0.37,
            'percentChange' => 0.34,
            'direction' => 'up',
            'display' => '$109.16'
        ],
        'silver' => [
            'name' => 'Silver (10g)',
            'price' => 1858.12,
            'change' => 2.86,
            'percentChange' => 0.15,
            'direction' => 'up',
            'display' => '₹1,858.12'
        ]
    ]
]);
