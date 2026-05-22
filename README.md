<h1 align="left">Super App Mobile</h1>

<img src="./resources/snapshots.png?" alt="Snapshot Image" width="700"/>
<p align="left">
  <a href="https://opensource.org/license/apache-2-0">
    <img alt="License: Apache-2.0" src="https://img.shields.io/badge/License-Apache%202.0-blue.svg">
  </a>
  <!-- <a href="https://twitter.com/intent/follow?screen_name=wso2" rel="nofollow"><img src="https://img.shields.io/twitter/follow/wso2.svg?style=social&amp;label=Follow%20Us" style="max-width: 100%;"></a> -->
</p>

This open source project provides a unified platform powered by **micro app architecture**, allowing you to seamlessly integrate multiple applications within a single container.

With this approach, you can deploy multiple Web apps inside one super app while customizing its functionalities to fit your specific requirements.

This repository serves as the foundation for hosting multiple micro-apps with seamless authentication, integration, and centralized management.

---

📚 **[View Complete Documentation](https://opensource.lk/superapp-mobile/)** - Deployment guides, API references, and architecture details 

## 🧭 Project Structure

```bash
.
├── backend-services/         # Go microservices for SuperApp backend
│   ├── core/                 # Main API service
│   ├── token-service/        # OAuth2/JWT service
│   └── README.md             
├── docs/                     # Documentation (MkDocs)
├── frontend/                 # React Native (Expo) mobile app
├── observability/            # Monitoring stack (Prometheus, Grafana, Jaeger)
├── sample-microapps/         # Example microapps for demonstration
├── superapp-admin-portal/    # React admin web portal
├── resources/                # Images, diagrams, and assets
├── LICENSE                   # Apache 2.0 license
├── mkdocs.yml                # Documentation site configuration
├── package.json              # Root package configuration
├── issue_template.md         # GitHub issue template
└── pull_request_template.md  # GitHub pull request template
```

## ⚙️ Technologies Used

### Backend

- **Language**: [Go](https://go.dev/)

### Frontend

- **Framework**: React Native (Expo)
- **State Management**: Redux Toolkit + Redux Persist

### Authentication

- External identity provider (OIDC/OAuth2 compatible)

## 🧱 System Architecture

Here’s a high-level view of the flow:
<br></br>
<img src="./resources/architecture_diagram.png?" alt="Architecture Diagram" width="700"/>


### Key Concepts

#### SuperApp vs MicroApps

- **SuperApp**: The main container application that manages authentication, navigation, and micro-app lifecycle
- **MicroApps**: Individual web applications loaded in WebViews, each serving specific functionality
- **Bridge**: Communication layer between SuperApp and MicroApps (see `frontend/docs/BRIDGE_GUIDE.md`)


## 🚀 Getting Started

To get up and running quickly, follow the step-by-step guide in our documentation:

👉 [Getting Started Guide](https://opensource.lk/superapp-mobile/getting-started/installation/)

This guide covers prerequisites, setup instructions, and how to launch the Super App Mobile project locally.

## 🐞 Reporting Issues

### Opening an issue

All known issues of Open Super App Mobile are filed at: https://github.com/opensuperapp/opensuperapp/issues. Please check this list before opening a new issue.

### Next steps & future improvements

Read the planned enhancements and longer-term tasks in [FUTURE_IMPROVEMENTS.md](./docs/FUTURE_IMPROVEMENTS.md).

## 🤝 Contributing

If you are planning on contributing to the development efforts of Open Superapp Mobile, you can do so by checking out the latest development version. The main branch holds the latest unreleased source code.
