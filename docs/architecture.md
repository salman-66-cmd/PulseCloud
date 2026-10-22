# PulseCloud System Architecture & Cloud Engineering Design

## 1. System Overview

PulseCloud is a cloud-native API Health, Availability, and Latency Monitoring platform designed for distributed cloud architectures.

```mermaid
graph TB
    subgraph Client Layer
        Browser["React 18 SPA (Vite + Tailwind)"]
    end

    subgraph API Gateway & Ingress
        ReverseProxy["Nginx / Cloud Ingress"]
        FastAPI["FastAPI REST API Service (/api/v1)"]
    end

    subgraph Asynchronous Worker Tier
        Scheduler["Background Scheduler (AsyncIO / Celery Beat)"]
        WorkerPool["Celery Monitoring Workers"]
        RedisQueue[("Redis Broker & Result Store")]
    end

    subgraph Target Validation & Core Engines
        SSRF["SSRF Defense & IP Validator"]
        HTTPClient["HTTPX Asynchronous Check Client"]
        HealthEvaluator["Health & Degradation Classifier"]
        IncidentEngine["Incident & Recovery Engine"]
        AlertEngine["Alert Cooldown & Notification Engine"]
    end

    subgraph Storage & Persistence Tier
        DB[("PostgreSQL / SQLite Database Engine")]
    end

    Browser -->|HTTP / JSON| ReverseProxy
    ReverseProxy --> FastAPI
    FastAPI --> DB
    Scheduler -->|Dispatch Due Checks| RedisQueue
    RedisQueue --> WorkerPool
    WorkerPool --> SSRF
    FastAPI --> SSRF
    SSRF -->|Safe URLs Only| HTTPClient
    HTTPClient -->|Latency & Status Codes| HealthEvaluator
    HealthEvaluator --> IncidentEngine
    HealthEvaluator --> AlertEngine
    HealthEvaluator --> DB
    IncidentEngine --> DB
    AlertEngine --> DB
```

## 2. Monitoring Workflow Sequence

```mermaid
sequenceDiagram
    autonumber
    participant S as Scheduler / Worker
    participant E as Endpoint DB
    participant V as SSRF Security Validator
    participant T as Monitored Target API
    participant H as Health Evaluator
    participant I as Incident Manager
    participant A as Alert Engine

    S->>E: Query active endpoints due for check
    E-->>S: Return endpoint configuration
    S->>V: Validate scheme, authority, resolve IPs
    alt URL is restricted (RFC1918 / Loopback / Metadata)
        V-->>S: Reject check (SSRF_BLOCKED)
    else URL is safe
        V-->>S: Safe to dispatch
        S->>T: Dispatch HTTP request (Timer started)
        T-->>S: Return HTTP status code & payload
        S->>H: Record duration (ms), status code, outcome
        H->>H: Evaluate consecutive failures / degradation
        alt 2+ Consecutive Failures (DOWN)
            H->>I: Check for existing open incident
            opt No existing open incident
                I->>I: Create new Incident & timeline record
                I->>A: Trigger critical outage alert (Cooldown checked)
            end
        else Recovered Check (HEALTHY)
            H->>I: Check for open incident
            opt Open incident exists
                I->>I: Auto-resolve incident & record timeline recovery note
            end
        end
    end
```

## 3. Distributed Cloud Scalability Considerations

1. **Horizontal Worker Scaling**: Additional Celery workers can be added (`docker compose scale worker=8`) without code modifications.
2. **Deduplication State**: Scheduled jobs use endpoint-level locking to prevent duplicate concurrent checks on identical endpoints.
3. **Bounded Concurrency**: Uses an asynchronous semaphore (default 20 concurrent checks per node) to prevent worker socket starvation.
4. **Zero-Cloud-Cost Development**: Provides an in-process AsyncIO scheduler and SQLite fallback allowing zero-cost local execution.
