<?php
/**
 * Plugin Name: DersMatrix Ultimate Connect (by EvrakPlus)
 * Plugin URI: https://www.evrakplus.com/ders-dagitim-multi-plus/
 * Description: DersMatrix Ultimate masaustu, web ve PWA uygulamalari icin guvenli PKCE uyelik dogrulama, imzali yetki belgesi ve bulut senkronizasyon REST API eklentisi.
 * Version: 2.7.3
 * Requires PHP: 8.1
 * Author: EvrakPlus
 * Author URI: https://www.evrakplus.com/
 * License: GPLv2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

define('EP_MP_VERSION', '2.7.3');
define('EP_MP_NS', 'evrakplus/v1');
define('EP_MP_ACCESS_TTL', 900);        // 15 dakika kisa omurlu access token
define('EP_MP_REFRESH_TTL', 2592000);   // 30 gun refresh token
define('EP_MP_OFFLINE_TTL', 604800);    // 7 gun sunucu imzali cevrimdisi yetki belgesi

register_activation_hook(__FILE__, 'ep_mp_activate');

function ep_mp_activate(): void {
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $charset = $wpdb->get_charset_collate();

    $sql_codes = "CREATE TABLE {$wpdb->prefix}ep_mp_auth_codes (
        code_hash CHAR(64) NOT NULL,
        wp_user_id BIGINT UNSIGNED NOT NULL,
        device_id VARCHAR(64) NOT NULL,
        code_challenge VARCHAR(128) NOT NULL,
        expires_at BIGINT UNSIGNED NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (code_hash)
    ) $charset;";

    $sql_tokens = "CREATE TABLE {$wpdb->prefix}ep_mp_tokens (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        wp_user_id BIGINT UNSIGNED NOT NULL,
        device_id VARCHAR(64) NOT NULL,
        device_name VARCHAR(120) NOT NULL DEFAULT '',
        refresh_hash CHAR(64) NOT NULL,
        revoked TINYINT(1) NOT NULL DEFAULT 0,
        expires_at BIGINT UNSIGNED NOT NULL,
        last_used_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uniq_refresh_hash (refresh_hash),
        KEY idx_user_device (wp_user_id, device_id)
    ) $charset;";

    $sql_sync = "CREATE TABLE {$wpdb->prefix}ep_mp_sync_projects (
        project_id CHAR(36) NOT NULL,
        wp_user_id BIGINT UNSIGNED NOT NULL,
        school_name VARCHAR(255) NOT NULL,
        revision INT NOT NULL DEFAULT 1,
        updated_at VARCHAR(40) NOT NULL,
        deleted_at VARCHAR(40) NULL DEFAULT NULL,
        payload_json LONGTEXT NOT NULL,
        PRIMARY KEY (project_id, wp_user_id),
        KEY idx_user_updated (wp_user_id, updated_at)
    ) $charset;";

    dbDelta($sql_codes);
    dbDelta($sql_tokens);
    dbDelta($sql_sync);

    // Sunucu imzalama anahtari yoksa uret (yalnizca WP options icinde guvenle saklanir)
    if (!get_option('ep_mp_ed25519_secret') && function_exists('sodium_crypto_sign_keypair')) {
        $kp = sodium_crypto_sign_keypair();
        update_option('ep_mp_ed25519_secret', base64_encode(sodium_crypto_sign_secretkey($kp)), false);
        update_option('ep_mp_ed25519_public', base64_encode(sodium_crypto_sign_publickey($kp)), false);
    }
    if (!get_option('ep_mp_jwt_secret')) {
        update_option('ep_mp_jwt_secret', bin2hex(random_bytes(32)), false);
    }
}

function ep_mp_b64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function ep_mp_b64url_decode(string $data): string {
    $pad = strlen($data) % 4;
    if ($pad) {
        $data .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($data, '-_', '+/')) ?: '';
}

function ep_mp_require_https(): ?WP_Error {
    if (!is_ssl() && !defined('WP_DEBUG')) {
        return new WP_Error('https_required', 'Bu API yalnizca HTTPS uzerinden kullanilabilir.', ['status' => 403]);
    }
    return null;
}

function ep_mp_issue_access_token(int $user_id, string $device_id): string {
    $secret = (string)get_option('ep_mp_jwt_secret');
    $header = ep_mp_b64url_encode(wp_json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $now = time();
    $payload = ep_mp_b64url_encode(wp_json_encode([
        'iss' => home_url(),
        'sub' => $user_id,
        'dev' => $device_id,
        'iat' => $now,
        'exp' => $now + EP_MP_ACCESS_TTL,
    ]));
    $sig = ep_mp_b64url_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    return "$header.$payload.$sig";
}

function ep_mp_verify_access_token(WP_REST_Request $req): array|WP_Error {
    $https = ep_mp_require_https();
    if (is_wp_error($https)) {
        return $https;
    }
    $auth = (string)$req->get_header('authorization');
    if (!str_starts_with($auth, 'Bearer ')) {
        return new WP_Error('unauthorized', 'Erisim belirteci eksik.', ['status' => 401]);
    }
    $jwt = trim(substr($auth, 7));
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return new WP_Error('invalid_token', 'Gecersiz belirtec bicimi.', ['status' => 401]);
    }
    $secret = (string)get_option('ep_mp_jwt_secret');
    $expected = ep_mp_b64url_encode(hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret, true));
    if (!hash_equals($expected, $parts[2])) {
        return new WP_Error('invalid_sig', 'Belirtec imzasi gecersiz.', ['status' => 401]);
    }
    $claims = json_decode(ep_mp_b64url_decode($parts[1]), true);
    if (!is_array($claims) || empty($claims['sub']) || (int)($claims['exp'] ?? 0) < time()) {
        return new WP_Error('expired_token', 'Oturum suresi dolmus.', ['status' => 401]);
    }
    return $claims;
}

/**
 * Cevrimdisi cikti yetkisi icin sunucu tarafindan Ed25519 imzali, sureli yetki belgesi uretir.
 */
function ep_mp_sign_offline_entitlement(int $user_id, string $device_id): array {
    $user = get_userdata($user_id);
    $now = time();
    $payload = [
        'ver' => '1.0.0',
        'iss' => 'https://www.evrakplus.com',
        'sub' => $user_id,
        'email' => $user ? $user->user_email : '',
        'displayName' => $user ? $user->display_name : '',
        'deviceId' => $device_id,
        'canExport' => true,
        'canExportPdf' => true,
        'canExportExcel' => true,
        'canExportWord' => true,
        'canPrint' => true,
        'canCloudSync' => true,
        'iat' => $now,
        'exp' => $now + EP_MP_OFFLINE_TTL,
    ];
    $encoded = ep_mp_b64url_encode(wp_json_encode($payload));
    $secB64 = (string)get_option('ep_mp_ed25519_secret');
    $sig = '';
    if ($secB64 !== '' && function_exists('sodium_crypto_sign_detached')) {
        $sig = ep_mp_b64url_encode(sodium_crypto_sign_detached($encoded, base64_decode($secB64)));
    }
    return [
        'payload' => $payload,
        'signedToken' => $sig !== '' ? "$encoded.$sig" : null,
        'publicKeyBase64' => (string)get_option('ep_mp_ed25519_public'),
    ];
}

add_action('rest_api_init', function () {
    // 1. /auth/start (PKCE baslatma)
    register_rest_route(EP_MP_NS, '/auth/start', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            if (is_wp_error($e = ep_mp_require_https())) return $e;
            $challenge = sanitize_text_field((string)$req->get_param('code_challenge'));
            $deviceId = sanitize_text_field((string)$req->get_param('device_id'));
            if (strlen($challenge) < 32 || $deviceId === '') {
                return new WP_Error('bad_request', 'PKCE code_challenge ve device_id zorunludur.', ['status' => 400]);
            }
            if (!is_user_logged_in()) {
                return rest_ensure_response([
                    'authenticated' => false,
                    'loginUrl' => 'https://www.evrakplus.com/giris',
                ]);
            }
            global $wpdb;
            $code = bin2hex(random_bytes(24));
            $wpdb->insert("{$wpdb->prefix}ep_mp_auth_codes", [
                'code_hash' => hash('sha256', $code),
                'wp_user_id' => get_current_user_id(),
                'device_id' => $deviceId,
                'code_challenge' => $challenge,
                'expires_at' => time() + 300,
                'used' => 0,
            ]);
            return rest_ensure_response(['authenticated' => true, 'authCode' => $code, 'expiresIn' => 300]);
        },
    ]);

    // 2. /auth/exchange (PKCE tek kullanimlik kod -> access + refresh + imzali yetki)
    register_rest_route(EP_MP_NS, '/auth/exchange', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            if (is_wp_error($e = ep_mp_require_https())) return $e;
            global $wpdb;
            $code = (string)$req->get_param('auth_code');
            $verifier = (string)$req->get_param('code_verifier');
            $deviceName = sanitize_text_field((string)($req->get_param('device_name') ?: 'Bilinmeyen Cihaz'));
            $hash = hash('sha256', $code);
            $row = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}ep_mp_auth_codes WHERE code_hash = %s",
                $hash
            ), ARRAY_A);
            if (!$row || (int)$row['used'] === 1 || (int)$row['expires_at'] < time()) {
                return new WP_Error('invalid_code', 'Yetkilendirme kodu gecersiz veya suresi dolmus.', ['status' => 400]);
            }
            // PKCE S256 dogrulama
            $computed = ep_mp_b64url_encode(hash('sha256', $verifier, true));
            if (!hash_equals((string)$row['code_challenge'], $computed)) {
                return new WP_Error('pkce_failed', 'PKCE dogrulamasi basarisiz.', ['status' => 403]);
            }
            $wpdb->update("{$wpdb->prefix}ep_mp_auth_codes", ['used' => 1], ['code_hash' => $hash]);

            $userId = (int)$row['wp_user_id'];
            $deviceId = (string)$row['device_id'];
            $refresh = bin2hex(random_bytes(32));
            $wpdb->insert("{$wpdb->prefix}ep_mp_tokens", [
                'wp_user_id' => $userId,
                'device_id' => $deviceId,
                'device_name' => $deviceName,
                'refresh_hash' => hash('sha256', $refresh),
                'revoked' => 0,
                'expires_at' => time() + EP_MP_REFRESH_TTL,
                'last_used_at' => current_time('mysql', true),
            ]);

            return rest_ensure_response([
                'accessToken' => ep_mp_issue_access_token($userId, $deviceId),
                'expiresIn' => EP_MP_ACCESS_TTL,
                'refreshToken' => $refresh,
                'entitlement' => ep_mp_sign_offline_entitlement($userId, $deviceId),
            ]);
        },
    ]);

    // 3. /auth/refresh (Refresh token rotation)
    register_rest_route(EP_MP_NS, '/auth/refresh', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            if (is_wp_error($e = ep_mp_require_https())) return $e;
            global $wpdb;
            $refresh = (string)$req->get_param('refresh_token');
            $hash = hash('sha256', $refresh);
            $row = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM {$wpdb->prefix}ep_mp_tokens WHERE refresh_hash = %s AND revoked = 0",
                $hash
            ), ARRAY_A);
            if (!$row || (int)$row['expires_at'] < time()) {
                return new WP_Error('invalid_refresh', 'Yenileme belirteci gecersiz veya iptal edilmis.', ['status' => 401]);
            }
            $newRefresh = bin2hex(random_bytes(32));
            $wpdb->update("{$wpdb->prefix}ep_mp_tokens", [
                'refresh_hash' => hash('sha256', $newRefresh),
                'expires_at' => time() + EP_MP_REFRESH_TTL,
                'last_used_at' => current_time('mysql', true),
            ], ['id' => (int)$row['id']]);

            $userId = (int)$row['wp_user_id'];
            $deviceId = (string)$row['device_id'];
            return rest_ensure_response([
                'accessToken' => ep_mp_issue_access_token($userId, $deviceId),
                'expiresIn' => EP_MP_ACCESS_TTL,
                'refreshToken' => $newRefresh,
                'entitlement' => ep_mp_sign_offline_entitlement($userId, $deviceId),
            ]);
        },
    ]);

    // 4. /auth/status
    register_rest_route(EP_MP_NS, '/auth/status', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            $claims = ep_mp_verify_access_token($req);
            if (is_wp_error($claims)) return $claims;
            global $wpdb;
            $userId = (int)$claims['sub'];
            $user = get_userdata($userId);
            $devices = $wpdb->get_results($wpdb->prepare(
                "SELECT device_id, device_name, last_used_at FROM {$wpdb->prefix}ep_mp_tokens WHERE wp_user_id = %d AND revoked = 0",
                $userId
            ), ARRAY_A);
            return rest_ensure_response([
                'authenticated' => true,
                'user' => ['id' => $userId, 'email' => $user->user_email ?? '', 'name' => $user->display_name ?? ''],
                'devices' => $devices,
            ]);
        },
    ]);

    // 5. /auth/logout (Token iptali)
    register_rest_route(EP_MP_NS, '/auth/logout', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            $claims = ep_mp_verify_access_token($req);
            if (is_wp_error($claims)) return $claims;
            global $wpdb;
            $wpdb->update(
                "{$wpdb->prefix}ep_mp_tokens",
                ['revoked' => 1],
                ['wp_user_id' => (int)$claims['sub'], 'device_id' => (string)$claims['dev']]
            );
            return rest_ensure_response(['loggedOut' => true]);
        },
    ]);

    // 6. /entitlements
    register_rest_route(EP_MP_NS, '/entitlements', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            $claims = ep_mp_verify_access_token($req);
            if (is_wp_error($claims)) return $claims;
            $ent = ep_mp_sign_offline_entitlement((int)$claims['sub'], (string)$claims['dev']);
            return rest_ensure_response(array_merge($ent['payload'], [
                'signedToken' => $ent['signedToken'],
                'publicKeyBase64' => $ent['publicKeyBase64'],
            ]));
        },
    ]);

    // 7. /sync/push (UUID + revision + cakisma tespiti 409)
    register_rest_route(EP_MP_NS, '/sync/push', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            $claims = ep_mp_verify_access_token($req);
            if (is_wp_error($claims)) return $claims;
            global $wpdb;
            $userId = (int)$claims['sub'];
            $project = $req->get_param('project');
            $baseRevision = (int)($req->get_param('baseRevision') ?? 0);
            if (!is_array($project) || empty($project['id'])) {
                return new WP_Error('bad_project', 'Gecersiz proje verisi.', ['status' => 400]);
            }
            $pid = sanitize_text_field((string)$project['id']);
            $existing = $wpdb->get_row($wpdb->prepare(
                "SELECT revision, updated_at, payload_json FROM {$wpdb->prefix}ep_mp_sync_projects WHERE project_id = %s AND wp_user_id = %d",
                $pid,
                $userId
            ), ARRAY_A);

            // Cakisma tespiti: baska cihaz daha yeni surum gondermisse sessizce ezme!
            if ($existing && (int)$existing['revision'] > $baseRevision) {
                return new WP_REST_Response([
                    'conflict' => true,
                    'serverRevision' => (int)$existing['revision'],
                    'serverUpdatedAt' => $existing['updated_at'],
                    'serverProject' => json_decode($existing['payload_json'], true),
                ], 409);
            }

            $nextRev = $existing ? ((int)$existing['revision'] + 1) : 1;
            $now = gmdate('c');
            $project['revision'] = $nextRev;
            $project['updatedAt'] = $now;
            unset($project['auth']);

            $wpdb->replace("{$wpdb->prefix}ep_mp_sync_projects", [
                'project_id' => $pid,
                'wp_user_id' => $userId,
                'school_name' => sanitize_text_field((string)($project['school']['name'] ?? 'Okul')),
                'revision' => $nextRev,
                'updated_at' => $now,
                'deleted_at' => !empty($project['deletedAt']) ? sanitize_text_field((string)$project['deletedAt']) : null,
                'payload_json' => wp_json_encode($project),
            ]);

            return rest_ensure_response(['pushed' => true, 'projectId' => $pid, 'revision' => $nextRev, 'updatedAt' => $now]);
        },
    ]);

    // 8. /sync/pull (Okul/kullanici izolasyonlu degisiklik ve silme kayitlari cekme)
    register_rest_route(EP_MP_NS, '/sync/pull', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $req) {
            $claims = ep_mp_verify_access_token($req);
            if (is_wp_error($claims)) return $claims;
            global $wpdb;
            $userId = (int)$claims['sub'];
            $since = sanitize_text_field((string)($req->get_param('since') ?? ''));
            if ($since !== '') {
                $rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT project_id, revision, updated_at, deleted_at, payload_json FROM {$wpdb->prefix}ep_mp_sync_projects WHERE wp_user_id = %d AND updated_at > %s ORDER BY updated_at ASC",
                    $userId,
                    $since
                ), ARRAY_A);
            } else {
                $rows = $wpdb->get_results($wpdb->prepare(
                    "SELECT project_id, revision, updated_at, deleted_at, payload_json FROM {$wpdb->prefix}ep_mp_sync_projects WHERE wp_user_id = %d ORDER BY updated_at ASC",
                    $userId
                ), ARRAY_A);
            }
            $projects = array_map(fn($r) => [
                'id' => $r['project_id'],
                'revision' => (int)$r['revision'],
                'updatedAt' => $r['updated_at'],
                'deletedAt' => $r['deleted_at'],
                'project' => json_decode($r['payload_json'], true),
            ], $rows);
            return rest_ensure_response(['serverTime' => gmdate('c'), 'items' => $projects]);
        },
    ]);
});
