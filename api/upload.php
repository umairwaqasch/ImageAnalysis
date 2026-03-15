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

if (!isset($_FILES['images']) || !is_array($_FILES['images']['name'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No files uploaded']);
    exit;
}

$uploadDir = '../uploads/';
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$uploadedFiles = [];
$errors = [];

    foreach ($_FILES['images']['tmp_name'] as $key => $tmpName) {
    if ($_FILES['images']['error'][$key] === UPLOAD_ERR_OK) {
        $fileType = mime_content_type($tmpName);
        if (in_array($fileType, $allowedTypes)) {
            // Calculate hash for duplicate detection
            $fileHash = md5_file($tmpName);
            $categoryId = isset($_POST['category_id']) && is_numeric($_POST['category_id']) ? (int) $_POST['category_id'] : null;

            // Check if user already has this exact image
            $checkStmt = $pdo->prepare("SELECT id, filename, category_id FROM images WHERE user_id = ? AND file_hash = ? LIMIT 1");
            $checkStmt->execute([$_SESSION['user_id'], $fileHash]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                $uploadedFiles[] = [
                    'id' => $existing['id'],
                    'filename' => $existing['filename'],
                    'category_id' => $existing['category_id'],
                    'is_duplicate' => true
                ];
                continue; // Skip moving/inserting
            }

            $fileName = uniqid() . '_' . basename($_FILES['images']['name'][$key]);
            $targetFilePath = $uploadDir . $fileName;

            if (move_uploaded_file($tmpName, $targetFilePath)) {
                $stmt = $pdo->prepare("INSERT INTO images (user_id, filename, category_id, file_hash) VALUES (?, ?, ?, ?)");
                if ($stmt->execute([$_SESSION['user_id'], $fileName, $categoryId, $fileHash])) {
                    $uploadedFiles[] = [
                        'id' => $pdo->lastInsertId(),
                        'filename' => $fileName,
                        'category_id' => $categoryId
                    ];
                } else {
                    $errors[] = "Database insertion failed for " . $fileName;
                }
            } else {
                $errors[] = "Failed to move uploaded file " . $fileName;
            }
        } else {
            $errors[] = "Invalid file type " . $fileType;
        }
    } else {
        $errors[] = "Upload error code " . $_FILES['images']['error'][$key] . " for " . $_FILES['images']['name'][$key];
    }
}

if (!empty($errors) && empty($uploadedFiles)) {
    http_response_code(400);
    echo json_encode(['error' => implode(', ', $errors)]);
} else {
    echo json_encode(['success' => true, 'files' => $uploadedFiles, 'errors' => $errors]);
}
?>