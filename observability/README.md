# Observability Stack for SuperApp Mobile

Local development stack: **OpenTelemetry Collector** → **Prometheus** → **Grafana**

Collects real-time metrics from your React Native app for debugging performance and errors.

---

## 🚀 Quick Start

```bash
cd observability
docker compose up -d
```

**Services:**

- **Prometheus**: http://localhost:9090 (raw metrics & queries)
- **Grafana**: http://localhost:3000 (dashboards, login: `admin` / `123456`)
- **OTLP Collector**: localhost:4318 (HTTP endpoint for app)

---

## 📱 Configure Your App

**Development (Android Emulator):**

```env
EXPO_PUBLIC_OTEL_ENABLED=true
EXPO_PUBLIC_OTEL_COLLECTOR_URL=http://10.0.2.2:4318
EXPO_PUBLIC_OTEL_EXPORT_INTERVAL=10000
EXPO_PUBLIC_OTEL_SAMPLE_RATE=1.0
```

**Development (iOS Simulator):**

```env
EXPO_PUBLIC_OTEL_COLLECTOR_URL=http://localhost:4318
```

**Development (Physical Device):**

```env
EXPO_PUBLIC_OTEL_COLLECTOR_URL=http://192.168.1.XXX:4318  # Your machine's IP
```

See `frontend/.env.example` for production configuration (API keys, sampling, etc.)

---

## 📊 Metrics Overview (15 Total)

### App Performance

| Metric                        | Type      | Labels                        | Purpose                   |
| ----------------------------- | --------- | ----------------------------- | ------------------------- |
| `app_start_time_milliseconds` | Histogram | -                             | Identify slow app startup |
| `app_crash_count_total`       | Counter   | `error_type`, `error_message` | Track native crashes      |
| `app_js_error_count_total`    | Counter   | `error_type`, `error_message` | Track JS/React errors     |

### API Debugging (Most Critical)

| Metric                              | Type      | Labels                                            | Purpose                    |
| ----------------------------------- | --------- | ------------------------------------------------- | -------------------------- |
| `api_request_count_total`           | Counter   | `method`, `endpoint`, `status_code`               | Request volume by endpoint |
| `api_request_duration_milliseconds` | Histogram | `method`, `endpoint`                              | API latency percentiles    |
| `api_request_error_count_total`     | Counter   | `method`, `endpoint`, `status_code`, `error_type` | Failed API calls           |

### Screen Navigation

| Metric                              | Type      | Labels   | Purpose               |
| ----------------------------------- | --------- | -------- | --------------------- |
| `screen_view_count_total`           | Counter   | `screen` | Navigation patterns   |
| `screen_view_duration_milliseconds` | Histogram | `screen` | Time spent per screen |

### Micro-App Debugging

| Metric                                | Type      | Labels                                  | Purpose               |
| ------------------------------------- | --------- | --------------------------------------- | --------------------- |
| `microapp_load_count_total`           | Counter   | `app_id`                                | Load frequency        |
| `microapp_load_duration_milliseconds` | Histogram | `app_id`                                | Load time bottlenecks |
| `microapp_error_count_total`          | Counter   | `app_id`, `error_type`, `error_message` | Micro-app errors      |

### Authentication Flow

| Metric                           | Type    | Labels                      | Purpose                |
| -------------------------------- | ------- | --------------------------- | ---------------------- |
| `auth_login_count_total`         | Counter | `method`                    | Login attempts         |
| `auth_logout_count_total`        | Counter | -                           | Logout events          |
| `auth_token_refresh_count_total` | Counter | `success`, `error_type`     | Token refresh tracking |
| `auth_error_count_total`         | Counter | `error_type`, `status_code` | Auth failures          |

---

## 🔍 Useful Prometheus Queries

**API Errors by Endpoint:**

```promql
sum by (endpoint, status_code) (api_request_error_count_total)
```

**95th Percentile API Latency:**

```promql
histogram_quantile(0.95, sum by (endpoint, le) (rate(api_request_duration_milliseconds_bucket[5m])))
```

**Slowest Micro-Apps:**

```promql
topk(5, histogram_quantile(0.95, sum by (app_id, le) (rate(microapp_load_duration_milliseconds_bucket[5m]))))
```

**Failed Token Refreshes:**

```promql
sum(auth_token_refresh_count_total{success="false"})
```

**Most Visited Screens:**

```promql
topk(10, sum by (screen) (screen_view_count_total))
```

**Current Metric Values (All):**

```promql
{__name__=~"api_.*|app_.*|screen_.*|microapp_.*|auth_.*"}
```

---

## 📈 Grafana Dashboard

Pre-configured dashboard: **SuperApp Mobile Metrics**

**URL:** http://localhost:3000/d/superapp-mobile/superapp-mobile-metrics

**Panels:**

- App Start Time (95th percentile)
- API Request Total Count
- API Latency (95th percentile)
- API Error Count
- Micro App Load Count
- Micro App Load Time (95th percentile)
- Screen View Count
- Auth Events (login, token refresh, errors)

---

## 🛑 Stop Services

```bash
docker compose down
```

**Keep data (volumes persist):**

```bash
docker compose stop
```

**Remove everything (data + volumes):**

```bash
docker compose down -v
```

---

## 🚢 Production Deployment

This setup is for **local development only**. For production:

1. **Use Managed Service**: Grafana Cloud (free tier), Datadog, New Relic, Honeycomb
2. **Or Self-Host**: Deploy collector cluster with load balancer, Prometheus HA, Thanos/Mimir for long-term storage
3. **Enable API Key Auth**: Uncomment `EXPO_PUBLIC_OTEL_API_KEY` in `frontend/.env.example`
4. **Optimize Battery**: Set `EXPO_PUBLIC_OTEL_EXPORT_INTERVAL=60000` (60s)
5. **Apply Sampling**: Set `EXPO_PUBLIC_OTEL_SAMPLE_RATE=0.1` (10% of users at scale)

See comments in `frontend/.env.example` for production configuration details.



**Stack Components:**

- **otel-collector**: `otel/opentelemetry-collector-contrib:latest`
- **prometheus**: `prom/prometheus:latest`
- **grafana**: `grafana/grafana:latest`

**Volumes:**

- `prometheus-data`: Metric storage (30 day retention)
- `grafana-data`: Dashboard configs & user data
