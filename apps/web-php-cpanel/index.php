<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';

$cfg = ep_load_config();
if (!$cfg && !is_file(__DIR__ . '/installer/INSTALL.LOCK')) {
    header('Location: installer/index.php');
    exit;
}

$csrf = ep_csrf_token();
?>
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0b3b91">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="DersMatrix Ultimate">
  <link rel="icon" type="image/png" href="./assets/icons/dersmatrix-icon.png">
  <link rel="apple-touch-icon" href="./assets/icons/dersmatrix-icon.png">
  <meta name="csrf-token" content="<?= htmlspecialchars($csrf, ENT_QUOTES, 'UTF-8') ?>">
  <title>DersMatrix Ultimate · v2.7.2 Web &amp; PWA</title>
  <link rel="manifest" href="./manifest.json">
  <link rel="stylesheet" href="./assets/css/styles.css">
</head>
<body>
  <script>
    window.EVRAKPLUS_WEB_API = './api/index.php';
    window.EVRAKPLUS_CSRF = <?= json_encode($csrf) ?>;
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
    }
  </script>
  <?php
    $sharedHtml = __DIR__ . '/assets/ui-body.html';
    if (is_file($sharedHtml)) {
        readfile($sharedHtml);
    } else {
        echo '<div id="appRoot">EvrakPlus Multi Plus yükleniyor...</div>';
    }
  ?>
  <script src="./assets/js/meb-data.js"></script>
  <script src="./assets/js/solver-bridge.js"></script>
  <script src="./assets/js/reports-doc.js"></script>
  <script src="./assets/js/app.js"></script>
</body>
</html>
