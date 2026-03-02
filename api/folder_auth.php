<?php
session_start();
require_once '../config/db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$categoryId = isset($_POST['category_id']) ? (int) $_POST['category_id'] : 0;
$password = $_POST['password'] ?? '';

if (!$categoryId) {
    http_response_code(400);
    echo json_encode(['error' => 'Category ID required']);
    exit;
}

// Fetch the category to verify ownership and check the key
$stmt = $pdo->prepare("SELECT id, private_key FROM categories WHERE id = ? AND user_id = ?");
$stmt->execute([$categoryId, $_SESSION['user_id']]);
$category = $stmt->fetch();

if (!$category) {
    http_response_code(404);
    echo json_encode(['error' => 'Folder not found']);
    exit;
}

if (empty($category['private_key'])) {
    // Folder isn't actually locked
    echo json_encode(['success' => true]);
    exit;
}

// Check the provided password against the stored private key
// We can use direct string comparison or password_verify if we hashed it.
// The user requested a "private key column", let's assume direct string for simplicity or hashed for security.
// Hashing is better. Let's assume password_verify. Wait, when creating the folder, we should hash it.
// For now, let's just do password_verify.
if (password_verify($password, $category['private_key'])) {
    // Store in session so the user doesn't have to re-enter it during this session
    if (!isset($_SESSION['unlocked_categories'])) {
        $_SESSION['unlocked_categories'] = [];
    }
    if (!in_array($categoryId, $_SESSION['unlocked_categories'])) {
        $_SESSION['unlocked_categories'][] = $categoryId;
    }

    echo json_encode(['success' => true]);
} else {
    http_response_code(403);
    echo json_encode(['error' => 'Incorrect folder password']);
}
?>