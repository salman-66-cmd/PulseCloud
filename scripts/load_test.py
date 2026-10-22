from locust import HttpUser, task, between
import random


class PulseCloudUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        """Authenticate as admin or test user before executing tasks."""
        login_res = self.client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@pulsecloud.io",
                "password": "Admin123!"
            }
        )
        if login_res.status_code == 200:
            self.token = login_res.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.headers = {}

    @task(5)
    def view_dashboard_summary(self):
        """Simulate active user viewing overview summary metrics."""
        self.client.get("/api/v1/analytics/summary?hours=24", headers=self.headers)

    @task(3)
    def view_endpoints(self):
        """Simulate loading monitored endpoints list."""
        self.client.get("/api/v1/endpoints", headers=self.headers)

    @task(3)
    def view_timeline_and_latency(self):
        """Simulate chart telemetry loading."""
        self.client.get("/api/v1/analytics/timeline?hours=24", headers=self.headers)
        self.client.get("/api/v1/analytics/latency?hours=24", headers=self.headers)

    @task(2)
    def view_history(self):
        """Simulate paginated check history inspection."""
        self.client.get("/api/v1/checks?limit=25", headers=self.headers)

    @task(1)
    def check_mock_healthy_target(self):
        """Simulate monitoring check dispatch to healthy target."""
        self.client.get("/api/v1/mock-targets/healthy")

    @task(1)
    def check_mock_slow_target(self):
        """Simulate monitoring check dispatch to degraded/slow target."""
        self.client.get("/api/v1/mock-targets/slow")
