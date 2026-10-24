<?php
/**
 * Tianum Networth Managers - Master Admin API Handler for cPanel (PHP)
 * Handles authentication, enquiry management, metrics and content for the Admin Portal.
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
$adminFile = __DIR__ . '/../data/admin.json';
$contentFile = __DIR__ . '/../data/content.json';
$dataDir  = dirname($dataFile);

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

// Seed admin profile
$seedAdmin = [
    'id' => 1,
    'email' => 'admin@tianum.in',
    'password' => 'admin123',
    'full_name' => 'Prakash Bhootra',
    'role' => 'Managing Partner & Super Admin',
    'photo' => 'team-member-0.jpeg'
];

// Seed enquiries
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

function loadJson($file, $default) {
    if (file_exists($file)) {
        $raw = @file_get_contents($file);
        if ($raw) {
            $parsed = @json_decode($raw, true);
            if (is_array($parsed)) return $parsed;
        }
    }
    @file_put_contents($file, json_encode($default, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    return $default;
}

function saveJson($file, $data) {
    return @file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

// Parse request path or action parameter
$requestUri = $_SERVER['REQUEST_URI'] ?? '';
$action = $_GET['action'] ?? '';

if (empty($action)) {
    if (strpos($requestUri, '/api/admin/') !== false) {
        $action = trim(substr($requestUri, strpos($requestUri, '/api/admin/') + strlen('/api/admin/')), '/');
        // Strip query string if present
        if (strpos($action, '?') !== false) {
            $action = substr($action, 0, strpos($action, '?'));
        }
    }
}

// Decode input body
$rawInput = file_get_contents('php://input');
$body = [];
if (!empty($rawInput)) {
    $decoded = @json_decode($rawInput, true);
    if (is_array($decoded)) $body = $decoded;
}
if (empty($body)) {
    $body = $_POST;
}

// 1. Authentication Route (/api/admin/login)
if ($action === 'login' || strpos($action, 'login') !== false) {
    $admin = loadJson($adminFile, $seedAdmin);
    $inputEmail = strtolower(trim($body['email'] ?? ''));
    $inputPass  = trim($body['password'] ?? '');

    if (!empty($inputEmail) && $inputEmail === strtolower($admin['email']) && $inputPass === $admin['password']) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Authentication successful',
            'admin' => [
                'email' => $admin['email'],
                'full_name' => $admin['full_name'],
                'role' => $admin['role']
            ]
        ]);
        exit;
    } else {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password. Please verify credentials.'
        ]);
        exit;
    }
}

// 2. Status Update Route (/api/admin/enquiries/status)
if ($action === 'enquiries/status' || strpos($action, 'status') !== false) {
    $id = $body['id'] ?? null;
    $status = $body['status'] ?? 'New';
    $enquiries = loadJson($dataFile, $seedEnquiries);
    $updated = false;

    foreach ($enquiries as &$e) {
        if ((string)$e['id'] === (string)$id) {
            $e['status'] = $status;
            $e['updated_at'] = date('Y-m-d H:i:s');
            $updated = true;
            break;
        }
    }
    if ($updated) {
        saveJson($dataFile, $enquiries);
        echo json_encode(['status' => 'success', 'message' => 'Status updated successfully']);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Enquiry record not found']);
    }
    exit;
}

// 3. Toggle Read State Route (/api/admin/enquiries/read)
if ($action === 'enquiries/read' || strpos($action, 'read') !== false) {
    $id = $body['id'] ?? null;
    $enquiries = loadJson($dataFile, $seedEnquiries);
    $updated = false;

    foreach ($enquiries as &$e) {
        if ((string)$e['id'] === (string)$id) {
            $e['is_read'] = empty($e['is_read']);
            $e['updated_at'] = date('Y-m-d H:i:s');
            $updated = true;
            break;
        }
    }
    if ($updated) {
        saveJson($dataFile, $enquiries);
        echo json_encode(['status' => 'success', 'message' => 'Read state toggled']);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Enquiry record not found']);
    }
    exit;
}

// 4. Delete Enquiry Route (/api/admin/enquiries/delete)
if ($action === 'enquiries/delete' || strpos($action, 'delete') !== false) {
    $id = $body['id'] ?? null;
    $enquiries = loadJson($dataFile, $seedEnquiries);
    $filtered = [];
    $found = false;

    foreach ($enquiries as $e) {
        if ((string)$e['id'] === (string)$id) {
            $found = true;
        } else {
            $filtered[] = $e;
        }
    }
    if ($found) {
        saveJson($dataFile, $filtered);
        echo json_encode(['status' => 'success', 'message' => 'Enquiry deleted successfully']);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Enquiry record not found']);
    }
    exit;
}

// 5. Statistics Route (/api/admin/stats)
if ($action === 'stats' || strpos($action, 'stats') !== false) {
    $enquiries = loadJson($dataFile, $seedEnquiries);
    $total = count($enquiries);
    $unread = 0;
    $inProgress = 0;
    $resolved = 0;

    foreach ($enquiries as $e) {
        if (empty($e['is_read']) || ($e['status'] ?? '') === 'New') $unread++;
        if (($e['status'] ?? '') === 'In Progress') $inProgress++;
        if (($e['status'] ?? '') === 'Resolved') $resolved++;
    }

    echo json_encode([
        'status' => 'success',
        'total' => $total,
        'unread' => $unread,
        'in_progress' => $inProgress,
        'resolved' => $resolved
    ]);
    exit;
}

// 6. Admin Profile Route (/api/admin/profile)
if ($action === 'profile' || strpos($action, 'profile') !== false) {
    $admin = loadJson($adminFile, $seedAdmin);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!empty($body['full_name'])) $admin['full_name'] = trim($body['full_name']);
        if (!empty($body['email'])) $admin['email'] = trim($body['email']);
        if (!empty($body['new_password'])) {
            if (!empty($body['current_password']) && $body['current_password'] !== $admin['password']) {
                http_response_code(400);
                echo json_encode(['status' => 'error', 'message' => 'Current password is incorrect.']);
                exit;
            }
            $admin['password'] = trim($body['new_password']);
        }
        saveJson($adminFile, $admin);
        echo json_encode(['status' => 'success', 'message' => 'Profile updated successfully', 'admin' => $admin]);
        exit;
    }
    echo json_encode(['status' => 'success', 'admin' => $admin]);
    exit;
}

// 7. Website Dynamic Content Route (/api/admin/content)
if ($action === 'content' || strpos($action, 'content') !== false) {
    $seedContent = [
        'home_hero_title' => 'Built on trust. Driven by research.<br>Engineered for your future.',
        'home_hero_subtitle' => 'Strategic investment advisory, disciplined multi-asset allocation, and research-led market execution for High Net-Worth Individuals, Business Owners, and Family Offices.',
        'home_cta_review_text' => 'Schedule a Consultation',
        'home_cta_explore_text' => 'Explore Our Services',
        'service_wealth_desc' => 'Tailored discretionary and non-discretionary portfolio management architectures.',
        'service_investment_desc' => 'Institutional structuring, debt syndication, and private equity transaction advisory.',
        'contact_email' => 'contact@tianum.in',
        'contact_phone' => '+91 96840 06917',
        'contact_address' => 'Solitaire Business Hub, Baner, Pune, Maharashtra 411045'
    ];
    $content = loadJson($contentFile, $seedContent);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (!empty($body)) {
            $content = array_merge($content, $body);
            saveJson($contentFile, $content);
        }
        echo json_encode(['status' => 'success', 'message' => 'Website content saved and published', 'content' => $content]);
        exit;
    }
    echo json_encode(['status' => 'success', 'content' => $content]);
    exit;
}

// 8. Enquiries List Route (/api/admin/enquiries or default)
$enquiries = loadJson($dataFile, $seedEnquiries);

$limit = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int)$_GET['limit'] : 0;
if ($limit > 0 && count($enquiries) > $limit) {
    $enquiries = array_slice($enquiries, 0, $limit);
}

echo json_encode([
    'status' => 'success',
    'enquiries' => $enquiries
]);
