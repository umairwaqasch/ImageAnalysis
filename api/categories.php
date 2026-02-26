<?php
require_once '../config/db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM categories ORDER BY name ASC");
    $categories = $stmt->fetchAll();
    echo json_encode($categories);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!empty($data['name'])) {
        $name = trim($data['name']);
        // Check for duplicate
        $stmt = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
        $stmt->execute([$name]);
        if ($stmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Category already exists']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO categories (name) VALUES (?)");
        if ($stmt->execute([$name])) {
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
        $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
        if ($stmt->execute([$data['id']])) {
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
        $stmt = $pdo->prepare("UPDATE categories SET name = ? WHERE id = ?");
        if ($stmt->execute([trim($data['name']), $data['id']])) {
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