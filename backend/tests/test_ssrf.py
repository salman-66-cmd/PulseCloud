from app.core.ssrf import validate_url_safety, is_ip_blocked


def test_is_ip_blocked():
    # Loopback
    assert is_ip_blocked("127.0.0.1")[0] is True
    assert is_ip_blocked("::1")[0] is True

    # Private RFC1918
    assert is_ip_blocked("10.0.0.1")[0] is True
    assert is_ip_blocked("192.168.1.254")[0] is True
    assert is_ip_blocked("172.16.0.5")[0] is True

    # Link-local / Cloud metadata service
    assert is_ip_blocked("169.254.169.254")[0] is True
    assert is_ip_blocked("169.254.1.1")[0] is True

    # Public safe IP (e.g. Google DNS 8.8.8.8, Cloudflare 1.1.1.1)
    assert is_ip_blocked("8.8.8.8")[0] is False
    assert is_ip_blocked("1.1.1.1")[0] is False


def test_ssrf_disallowed_schemes():
    is_safe, reason, _ = validate_url_safety("ftp://example.com/file")
    assert is_safe is False
    assert "Invalid scheme" in reason

    is_safe, reason, _ = validate_url_safety("file:///etc/passwd")
    assert is_safe is False

    is_safe, reason, _ = validate_url_safety("gopher://127.0.0.1:70")
    assert is_safe is False


def test_ssrf_rejects_credentials_in_url():
    is_safe, reason, _ = validate_url_safety("http://admin:secret@example.com/api")
    assert is_safe is False
    assert "Credentials" in reason


def test_ssrf_blocks_private_destinations():
    is_safe, reason, _ = validate_url_safety("http://192.168.1.1/admin", allowlist_hosts=[])
    assert is_safe is False

    is_safe, reason, _ = validate_url_safety("http://169.254.169.254/latest/meta-data", allowlist_hosts=[])
    assert is_safe is False


def test_ssrf_allowlist_permit():
    # Test that configured allowlist host is permitted
    is_safe, reason, _ = validate_url_safety("http://127.0.0.1:8000/api/v1/mock-targets/healthy", allowlist_hosts=["127.0.0.1"])
    assert is_safe is True
    assert "allowlist" in reason.lower()
