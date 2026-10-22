import ipaddress
import socket
from urllib.parse import urlparse
from typing import Tuple, List, Optional
from app.core.config import settings


class SSRFValidationError(Exception):
    """Raised when a URL fails SSRF safety validation."""
    pass


def is_ip_blocked(ip_str: str) -> Tuple[bool, str]:
    """
    Checks if an IP address belongs to private, loopback, link-local, or cloud metadata ranges.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True, f"Invalid IP address format: {ip_str}"

    if ip.is_loopback:
        return True, f"Loopback address ({ip_str}) is blocked"
    if ip.is_private:
        return True, f"Private network address ({ip_str}) is blocked"
    if ip.is_link_local:
        return True, f"Link-local / cloud metadata address ({ip_str}) is blocked"
    if ip.is_multicast:
        return True, f"Multicast address ({ip_str}) is blocked"
    if ip.is_reserved:
        return True, f"Reserved address ({ip_str}) is blocked"
    if ip.is_unspecified:
        return True, f"Unspecified address ({ip_str}) is blocked"
        
    # Extra check for cloud metadata addresses (169.254.169.254, etc.)
    if str(ip).startswith("169.254."):
        return True, f"Cloud metadata service range ({ip_str}) is blocked"

    return False, "Safe"


def validate_url_safety(
    url: str,
    allow_private_networks: bool = False,
    allowlist_hosts: Optional[List[str]] = None
) -> Tuple[bool, str, List[str]]:
    """
    Validates a target URL against SSRF vulnerabilities.
    
    1. Scheme check: only http and https.
    2. Host parsing: rejects credentials in authority.
    3. Hostname resolution: checks all resolved IP addresses.
    4. Blocks loopback, RFC1918 private, link-local (cloud metadata), multicast.
    5. Checks against configurable allowlist.
    
    Returns:
        (is_safe, message, resolved_ips)
    """
    if not url or not isinstance(url, str):
        return False, "URL must be a non-empty string", []

    try:
        parsed = urlparse(url.strip())
    except Exception as e:
        return False, f"Failed to parse URL: {str(e)}", []

    # Scheme validation
    scheme = parsed.scheme.lower()
    allowed_schemes = ("http", "https") if settings.ALLOW_HTTP_FOR_MONITORING else ("https",)
    if scheme not in allowed_schemes:
        return False, f"Invalid scheme '{scheme}'. Only {allowed_schemes} are permitted.", []

    # Hostname validation
    hostname = parsed.hostname
    if not hostname:
        return False, "URL must contain a valid hostname", []

    # Check for credentials in URL (user:pass@)
    if parsed.username or parsed.password:
        return False, "Credentials in URL are strictly prohibited", []

    # Port validation
    if parsed.port:
        if parsed.port < 1 or parsed.port > 65535:
            return False, f"Port {parsed.port} is out of valid range (1-65535)", []

    # Check allowlist
    effective_allowlist = allowlist_hosts or settings.SSRF_ALLOWLIST_HOSTS
    if hostname.lower() in [h.lower() for h in effective_allowlist]:
        # Allowed via safe explicit allowlist (e.g. for local test harness or demo mock endpoints)
        return True, "Hostname permitted by allowlist", ["allowlist"]

    # If SSRF protection is disabled (e.g. testing flag)
    if not settings.SSRF_BLOCK_PRIVATE_NETWORKS or allow_private_networks:
        return True, "Private network check bypassed", []

    # Resolve hostname to IP addresses to prevent DNS rebinding & bypass tricks
    resolved_ips: List[str] = []
    try:
        # socket.getaddrinfo returns list of 5-tuples: (family, type, proto, canonname, sockaddr)
        addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if scheme == "https" else 80))
        for item in addr_info:
            sockaddr = item[4]
            ip = sockaddr[0]
            if ip not in resolved_ips:
                resolved_ips.append(ip)
    except socket.gaierror as e:
        return False, f"DNS resolution failed for hostname '{hostname}': {str(e)}", []
    except Exception as e:
        return False, f"Error resolving hostname '{hostname}': {str(e)}", []

    if not resolved_ips:
        return False, f"No IP addresses could be resolved for '{hostname}'", []

    # Validate each resolved IP
    for ip in resolved_ips:
        blocked, reason = is_ip_blocked(ip)
        if blocked:
            return False, f"Destination resolved to restricted IP {ip}: {reason}", resolved_ips

    return True, "URL passed SSRF safety checks", resolved_ips
