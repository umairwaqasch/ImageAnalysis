<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>NeuralVision | Register</title>
    <!-- AdminLTE Style -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@4.0.0-beta2/dist/css/adminlte.min.css">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.10.6/dist/sweetalert2.min.css" rel="stylesheet">
    <style>
        .register-page {
            align-items: center;
            background-color: var(--bs-body-bg);
            display: flex;
            flex-direction: column;
            height: 100vh;
            justify-content: center;
        }

        .register-box {
            width: 400px;
            margin-top: -10vh;
        }

        .bg-gradient-text {
            background: linear-gradient(90deg, #8b5cf6, #ec4899);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
    </style>
</head>

<body class="register-page">
    <div class="register-box">
        <div class="register-logo text-center mb-4">
            <h1 class="fw-bold"><i class="fas fa-brain me-2" style="color: #8b5cf6;"></i><span
                    class="bg-gradient-text">Neural</span>Vision</h1>
        </div>
        <div class="card card-outline card-primary shadow-lg border-0 rounded-4">
            <div class="card-body register-card-body p-4">
                <p class="login-box-msg text-center text-muted mb-4">Register a new isolated workspace</p>

                <form id="registerForm">
                    <div class="input-group mb-3">
                        <input type="text" id="username" name="username" class="form-control form-control-lg"
                            placeholder="Username" required minlength="3">
                        <div class="input-group-text"><span class="fas fa-user"></span></div>
                    </div>
                    <div class="input-group mb-3">
                        <input type="password" id="password" name="password" class="form-control form-control-lg"
                            placeholder="Password" required minlength="6">
                        <div class="input-group-text"><span class="fas fa-lock"></span></div>
                    </div>
                    <div class="input-group mb-4">
                        <input type="password" id="password_confirm" name="password_confirm"
                            class="form-control form-control-lg" placeholder="Retype password" required>
                        <div class="input-group-text"><span class="fas fa-lock"></span></div>
                    </div>
                    <div class="row">
                        <div class="col-12">
                            <button type="submit" class="btn btn-primary d-block w-100 btn-lg"
                                style="background: linear-gradient(90deg, #8b5cf6, #ec4899); border: none;">Register</button>
                        </div>
                    </div>
                </form>

                <p class="mb-0 mt-4 text-center">
                    <a href="login.php" class="text-center text-decoration-none">I already have a workspace</a>
                </p>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.10.6/dist/sweetalert2.all.min.js"></script>
    <script>
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);

            if (formData.get('password') !== formData.get('password_confirm')) {
                Swal.fire('Error', 'Passwords do not match.', 'error');
                return;
            }

            try {
                const response = await fetch('api/auth.php?action=register', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (response.ok && data.success) {
                    Swal.fire({
                        title: 'Success!',
                        text: 'Workspace created. Redirecting...',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = 'index.php';
                    });
                } else {
                    Swal.fire('Registration Failed', data.error || 'Username might be taken.', 'error');
                }
            } catch (err) {
                Swal.fire('System Error', 'Could not reach authentication server.', 'error');
            }
        });
    </script>
</body>

</html>