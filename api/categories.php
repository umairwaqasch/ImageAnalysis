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
    $stmt = $pdo->prepare("SELECT id, name, created_at, (private_key IS NOT NULL AND private_key != '') as is_locked FROM categories WHERE user_id = ? ORDER BY name ASC");
    $stmt->execute([$_SESSION['user_id']]);
    $categories = $stmt->fetchAll();
    echo json_encode($categories);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['name'])) {
        $name = trim($data['name']);
        // Check for duplicate for this user
        $stmt = $pdo->prepare("SELECT id FROM categories WHERE name = ? AND user_id = ?");
        $stmt->execute([$name, $_SESSION['user_id']]);
        if ($stmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Category already exists']);
            exit;
        }

        // Support private_key if passed from frontend
        $privateKey = null;
        if (!empty($data['private_key'])) {
            $privateKey = password_hash(trim($data['private_key']), PASSWORD_DEFAULT);
        }

        $stmt = $pdo->prepare("INSERT INTO categories (user_id, name, private_key) VALUES (?, ?, ?)");
        if ($stmt->execute([$_SESSION['user_id'], $name, $privateKey])) {
            echo json_encode(['id' => $pdo->lastInsertId(), 'name' => $name]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to create category']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Valid name is required']);
    }
} elseif ($method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['id'])) {
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ? AND user_id = ?");
        if ($stmt->execute([$data['id'], $_SESSION['user_id']])) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete category']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'ID is required']);
    }
} elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['id']) && !empty($data['name'])) {
        $stmt = $pdo->prepare("UPDATE categories SET name = ? WHERE id = ? AND user_id = ?");
        if ($stmt->execute([trim($data['name']), $data['id'], $_SESSION['user_id']])) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update category']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'ID and name are required']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>