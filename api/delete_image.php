<?php
require_once '../config/db.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!empty($data['id'])) {
    $stmt = $pdo->prepare("SELECT filename FROM images WHERE id = ?");
    $stmt->execute([$data['id']]);
    $image = $stmt->fetch();

    if ($image) {
        $filePath = '../uploads/' . $image['filename'];

        // Delete from database
        $stmt = $pdo->prepare("DELETE FROM images WHERE id = ?");
        if ($stmt->execute([$data['id']])) {
            // Delete file from filesystem
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete image record']);
        }
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Image not found']);
    }
} else {
    http_response_code(400);
    echo json_encode(['error' => 'ID is required']);
}
?>