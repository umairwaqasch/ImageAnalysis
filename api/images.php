<?php
require_once '../config/db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("
        SELECT i.id, i.filename, i.prompt, i.analysis_result, i.category_id, i.created_at, c.name as category_name
        FROM images i
        LEFT JOIN categories c ON i.category_id = c.id
        ORDER BY i.created_at DESC
    ");
    $images = $stmt->fetchAll();
    echo json_encode($images);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (isset($data['id']) && isset($data['category_id'])) {
        $categoryId = $data['category_id'] === 'null' || $data['category_id'] === null ? null : (int) $data['category_id'];

        $stmt = $pdo->prepare("UPDATE images SET category_id = ? WHERE id = ?");
        if ($stmt->execute([$categoryId, $data['id']])) {
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