<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

require_once '../config/db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['ids']) || !is_array($data['ids'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Image IDs array is required']);
    exit;
}

$ids = $data['ids'];
$userId = $_SESSION['user_id'];

// Create a string of placeholders (?,?,?)
$placeholders = implode(',', array_fill(0, count($ids), '?'));

try {
    // Clear both result and original prompt to truly "reset"
    $stmt = $pdo->prepare("UPDATE images SET analysis_result = NULL, prompt = NULL WHERE id IN ($placeholders) AND user_id = ?");
    
    // Merge IDs and UserID for the execute call
    $params = array_merge($ids, [$userId]);
    
    if ($stmt->execute($params)) {
        echo json_encode(['success' => true, 'cleared_count' => $stmt->rowCount()]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to clear analysis data']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
