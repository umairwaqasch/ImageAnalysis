<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

require_once '../config/db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $unlockedList = isset($_SESSION['unlocked_categories']) ? $_SESSION['unlocked_categories'] : [];
    $inClause = empty($unlockedList) ? "0" : implode(',', array_map('intval', $unlockedList));

    $stmt = $pdo->prepare("
        SELECT i.id, i.filename, i.prompt, i.analysis_result, i.category_id, i.created_at, c.name as category_name,
               (c.private_key IS NOT NULL AND c.private_key != '') as is_locked
        FROM images i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.user_id = ?
          AND (c.private_key IS NULL OR c.private_key = '' OR c.id IN ($inClause))
        ORDER BY i.created_at DESC, i.id DESC
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $images = $stmt->fetchAll();
    echo json_encode($images);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['id']) && isset($data['category_id'])) {
        $categoryId = $data['category_id'] === 'null' || $data['category_id'] === null ? null : (int) $data['category_id'];

        $stmt = $pdo->prepare("UPDATE images SET category_id = ? WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$categoryId, $data['id'], $_SESSION['user_id']])) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update image category']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ID or category_id']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>