<?php
require_once '../config/db.php';
header('Content-Type: application/json');

// Ensure script can run long enough for AI generation
set_time_limit(300);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Image ID is required']);
    exit;
}

$imageId = $data['id'];
$prompt = isset($data['prompt']) && !empty($data['prompt']) ? $data['prompt'] : "Describe this image in detail.";

// 1. Get filename from DB
$stmt = $pdo->prepare("SELECT filename FROM images WHERE id = ?");
$stmt->execute([$imageId]);
$imageRow = $stmt->fetch();

if (!$imageRow) {
    http_response_code(404);
    echo json_encode(['error' => 'Image not found in database']);
    exit;
}

$filename = $imageRow['filename'];
$filePath = '../uploads/' . $filename;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'Physical file not found']);
    exit;
}

// 2. Encode to Base64 for Ollama
$imageData = file_get_contents($filePath);
$base64Image = base64_encode($imageData);

// 3. Prepare cURL request to Ollama Daemon
$model = isset($data['model']) && !empty($data['model']) ? $data['model'] : "llama3.2-vision";
$temperature = isset($data['temperature']) && is_numeric($data['temperature']) ? (float) $data['temperature'] : 0.8;
$numPredict = isset($data['num_predict']) && is_numeric($data['num_predict']) ? (int) $data['num_predict'] : -1;

$ollamaUrl = "http://127.0.0.1:11434/api/generate";
$ollamaPayloadObj = [
    "model" => $model,
    "prompt" => $prompt,
    "images" => [$base64Image],
    "stream" => false
];

if ($temperature !== 0.8 || $numPredict !== -1) {
    $ollamaPayloadObj["options"] = [];
    if ($temperature !== 0.8)
        $ollamaPayloadObj["options"]["temperature"] = $temperature;
    if ($numPredict !== -1)
        $ollamaPayloadObj["options"]["num_predict"] = $numPredict;
}

$ollamaPayload = json_encode($ollamaPayloadObj);

$ch = curl_init($ollamaUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $ollamaPayload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
// Set timeout high in case model needs to load
curl_setopt($ch, CURLOPT_TIMEOUT, 300);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($httpCode !== 200 || $response === false) {
    $ollamaErrorMsg = 'Failed to connect to Ollama daemon';
    if ($response !== false) {
        $ollamaResponse = json_decode($response, true);
        if (isset($ollamaResponse['error'])) {
            $ollamaErrorMsg = 'Ollama Error: ' . $ollamaResponse['error'];
        }
    }

    http_response_code(500);
    echo json_encode([
        'error' => $ollamaErrorMsg,
        'details' => $curlError,
        'http_code' => $httpCode,
        'raw_response' => $response
    ]);
    exit;
}

// 4. Parse AI Response
$responseData = json_decode($response, true);
if (!isset($responseData['response'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Invalid response format from Ollama']);
    exit;
}

$aiText = $responseData['response'];

// 5. Save back to database
$updateStmt = $pdo->prepare("UPDATE images SET prompt = ?, analysis_result = ? WHERE id = ?");
if ($updateStmt->execute([$prompt, $aiText, $imageId])) {
    echo json_encode([
        'success' => true,
        'analysis_result' => $aiText
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save analysis to database']);
}
?>