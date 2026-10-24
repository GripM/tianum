<?php
/**
 * Tianum Networth Managers - Contact API Handler for cPanel (PHP)
 * Accepts public consultation requests and saves persistently to data/enquiries.json
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataFile = __DIR__ . '/../data/enquiries.json';
$dataDir  = dirname($dataFile);

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

// Seed enquiries if data file does not exist
$seedEnquiries = [
    [
        'id' => 1,
        'name' => 'Vikramaditya Singhania',
        'email' => 'v.singhania@singhaniaholdings.com',
        'mobile' => '+91 98220 14820',
        'subject' => 'Wealth Management & Multi-Asset Allocation',
        'message' => 'Looking for fiduciary consultation on structuring family office investments and private wealth across PMS/AIFs.',
        'status' => 'New',
        'is_read' => false,
        'created_at' => '2026-10-13 14:15:22',
        'updated_at' => '2026-10-13 14:15:22'
    ],
    [
        'id' => 2,
        'name' => 'Sunil Kulkarni',
        'email' => 'sunil.kulkarni@techapex.in',
        'mobile' => '+91 94225 33019',
        'subject' => 'Corporate Treasury & Fixed Income',
        'message' => 'Interested in debt syndication and liquidity management solutions for our mid-market tech firm in Pune.',
        'status' => 'In Progress',
        'is_read' => true,
        'created_at' => '2026-10-12 16:40:10',
        'updated_at' => '2026-10-13 09:20:00'
    ],
    [
        'id' => 3,
        'name' => 'Ananya Deshmukh',
        'email' => 'ananya.d@nexuscap.com',
        'mobile' => '+91 97640 21908',
        'subject' => 'Investment Banking & M&A Advisory',
        'message' => 'Seeking advisory on Series B growth capital and institutional equity placements in Maharashtra.',
        'status' => 'Resolved',
        'is_read' => true,
        'created_at' => '2026-10-11 11:25:00',
        'updated_at' => '2026-10-12 18:00:00'
    ],
    [
        'id' => 4,
        'name' => 'Dr. Rajeshwar Rao',
        'email' => 'dr.rao.cardio@apollohealth.org',
        'mobile' => '+91 98501 77234',
        'subject' => 'Portfolio Management Services (PMS)',
        'message' => 'Need a comprehensive portfolio audit of existing equity mutual funds and advisory on direct indexed equities.',
        'status' => 'New',
        'is_read' => false,
        'created_at' => '2026-10-10 18:10:45',
        'updated_at' => '2026-10-10 18:10:45'
    ]
];

function getEnquiries($file, $seeds) {
    if (file_exists($file)) {
        $raw = @file_get_contents($file);
        if ($raw) {
            $parsed = @json_decode($raw, true);
            if (is_array($parsed) && count($parsed) > 0) {
                return $parsed;
            }
        }
    }
    @file_put_contents($file, json_encode($seeds, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    return $seeds;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = [];
    if (!empty($rawInput)) {
        $decoded = @json_decode($rawInput, true);
        if (is_array($decoded)) {
            $input = $decoded;
        }
    }
    if (empty($input)) {
        $input = $_POST;
    }

    $name    = isset($input['name']) ? trim(strip_tags($input['name'])) : '';
    $email   = isset($input['email']) ? trim(filter_var($input['email'], FILTER_SANITIZE_EMAIL)) : '';
    $mobile  = isset($input['mobile']) ? trim(strip_tags($input['mobile'])) : (isset($input['phone']) ? trim(strip_tags($input['phone'])) : '');
    $subject = isset($input['subject']) ? trim(strip_tags($input['subject'])) : 'Website Consultation Request';
    $message = isset($input['message']) ? trim(strip_tags($input['message'])) : 'Consultation request from website form';

    if (empty($name))   $name = 'Anonymous Client';
    if (empty($subject)) $subject = 'Wealth Consultation Mandate';

    $now = date('Y-m-d H:i:s');
    $id = isset($input['id']) && is_numeric($input['id']) ? (int)$input['id'] : (int)(microtime(true) * 1000);

    $newEnquiry = [
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'mobile' => $mobile,
        'subject' => $subject,
        'message' => $message,
        'status' => 'New',
        'is_read' => false,
        'created_at' => $now,
        'updated_at' => $now
    ];

    $enquiries = getEnquiries($dataFile, $seedEnquiries);

    // Prevent immediate duplicate submission by checking ID
    $exists = false;
    foreach ($enquiries as $e) {
        if ((string)$e['id'] === (string)$newEnquiry['id']) {
            $exists = true;
            break;
        }
    }

    if (!$exists) {
        array_unshift($enquiries, $newEnquiry);
        @file_put_contents($dataFile, json_encode($enquiries, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }

    // Optional notification email if server mail is active
    if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $to = 'sales@tianumnetworth.com';
        $mailSubject = "New Tianum Consultation: " . $name . " (" . $subject . ")";
        $mailBody = "New Client Consultation Inquiry:\n\n"
                  . "Name: $name\n"
                  . "Email: $email\n"
                  . "Mobile: $mobile\n"
                  . "Purpose: $subject\n"
                  . "Message:\n$message\n\n"
                  . "Date: $now\n";
        $headers = "From: noreply@" . ($_SERVER['HTTP_HOST'] ?? 'tianumnetworth.com') . "\r\n"
                 . "Reply-To: $email\r\n"
                 . "X-Mailer: PHP/" . phpversion();
        @mail($to, $mailSubject, $mailBody, $headers);
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Thank you! Your advisory request has been registered.',
        'received' => [
            'id' => $newEnquiry['id'],
            'name' => $name,
            'email' => $email,
            'timestamp' => $now
        ]
    ]);
    exit;
}

// GET request
echo json_encode([
    'status' => 'success',
    'message' => 'Tianum Contact API (PHP/cPanel) is online'
]);
