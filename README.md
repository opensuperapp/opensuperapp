# OpenSuperApp

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub last commit](https://img.shields.io/github/last-commit/opensuperapp/opensuperapp.svg)](https://github.com/opensuperapp/opensuperapp/commits/main)
[![GitHub issues](https://img.shields.io/github/issues/opensuperapp/opensuperapp.svg)](https://github.com/opensuperapp/opensuperapp/issues)

OpenSuperApp is an open-source Super App Framework built on micro-app architecture, enabling developers to integrate, orchestrate, and manage multiple web apps inside a unified container. It empowers organizations to create modular, scalable, and secure app ecosystems — without rebuilding authentication, communication, and lifecycle management for each individual app.

## Why OpenSuperApp?

Modern organizations and platforms often evolve into ecosystems, hosting multiple apps for communication, productivity, learning, and operations. However, maintaining separate standalone apps leads to fragmentation, duplicated logic, and inconsistent user experiences.

**Micro-app architecture** solves this problem by allowing each app to be independently developed and deployed, while still operating inside one seamless super app environment.

OpenSuperApp fills that gap by providing all the core building blocks required for **Super App development**:

- Unified authentication and access control,
- Communication between super app via a **Native Bridge**,
- Centralized configuration and analytics.

By bringing together these capabilities, OpenSuperApp helps you build flexible, composable, and secure ecosystems — without reinventing infrastructure for each app.

## OpenSuperApp Features

- **Micro-App Architecture**

  - Integrate multiple web applications within one host container. Each micro-app is isolated yet interoperable, enabling independent development and deployment cycles.

- **Native Bridge**

  - A lightweight, event-driven communication layer that enables secure data exchange via topics.

- **Centralized Authentication**
  - Built-in support for Single Sign-On (SSO) and access token propagation across all micro-apps. Works seamlessly with modern identity providers.

## System Architecture

Here’s a high-level view of the flow:
<br></br>
<img src="./resources/architecture_diagram.png" alt="Architecture Diagram" width="700"/>

## Project Structure

```bash
.
├── backend                  # Ballerina backend service
│   └── README.md            # Detailed backend documentation
├── frontend                 # React Native Super App
│   └── README.md            # Detailed frontend documentation
├── README.md                # You're here
```

## Technologies Used

### Backend

- **Language**: [Ballerina](https://ballerina.io/)
- **Authentication**: Supports authentication via any standard OIDC-compliant Identity Provider
- **Deployment**: Any cloud or internal developer platform

### Frontend

- **Framework**: React Native (Expo)
- **State Management**: Redux with Thunk
- **Secure storage**

## Getting Started

Each part of this repository has its own setup guide:

- [Frontend](./frontend/README.md)
- [Backend](./backend/README.md)

## Reporting Issues

### 1. Opening an issue

All known issues of WSO2 Superapp Mobile are filed at: https://github.com/opensuperapp/opensuperapp/issues. Please check this list before opening a new issue.

### 2. Reporting security issues

Please do not report security issues via GitHub issues. Instead, follow the [WSO2 Security Vulnerability Reporting Guidelines](https://security.docs.wso2.com/en/latest/security-reporting/vulnerability-reporting-guidelines/).

## Contributing

If you are planning on contributing to the development efforts of OpenSuperApp, you can do so by checking out the latest development version. The main branch holds the latest unreleased source code.

## License

OpenSuperApp is licensed under Apache 2.0. See the **[LICENSE](./LICENSE)** file for full details.
