<?php
session_start();
require_once '../config/db.php';
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

if ($action === 'register') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password are required']);
        exit;
    }

    // Check if username already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Username already taken']);
        exit;
    }

    // Hash password and insert
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
    if ($stmt->execute([$username, $hash])) {
        // Auto log in after registration
        $_SESSION['user_id'] = $pdo->lastInsertId();
        $_SESSION['username'] = $username;
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed']);
    }

} elseif ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password are required']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        echo json_encode(['success' => true]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid username or password']);
    }

} elseif ($action === 'logout') {
    session_destroy();
    header('Location: ../login.php');
    exit;

} elseif ($action === 'check') {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'loggedIn' => true,
            'user_id' => $_SESSION['user_id'],
            'username' => $_SESSION['username']
        ]);
    } else {
        echo json_encode(['loggedIn' => false]);
    }

} else {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid action']);
}
?>