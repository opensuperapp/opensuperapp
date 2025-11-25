# OpenSuperApp Mobile Backend

This is the Ballerina-based backend for the SuperApp Mobile platform.
It powers the mobile experience by exposing RESTful APIs, integrating with databases and various internal domain services to deliver dynamic content and secure data flows.

The backend is built with a modular architecture, emphasizing scalability, security, and reusability, making it adaptable for diverse enterprise and open-source use cases.

## Project Structure

```bash
backend/
├── Ballerina.toml # Ballerina project metadata and dependency configuration
├── Dependencies.toml # Auto generated file that records the resolved dependencies of the project
├── service.bal # Main service layer exposing HTTP endpoints
├── utils.bal # Common utility/helper functions
├── constants.bal # Common constants
├── types.bal # Types for root level
├── config.toml.local # Sample config file
├── modules
│   ├── database/ # Database access module
│   ├── authorization/ # Authorization module
│   ├── entity/ # Integration with entity domain module to retrieve user data
│   ├── scim/ # Integration with scim module to retrieve user details
```

## Setup

- Install the ballerina version mentioned in the `Ballerina.toml` file.

```bash
cd backend
bal build
```

- Configure the configurations using `config.toml` file as per the `config.toml.local`.

```bash
bal run
```

## Available API Endpoints

- The following is a summary of the backend API routes, including their purpose and return types. All endpoints use JWT-based authentication.

| Endpoint                                    | Method | Description                                           | Response Type      |
| ------------------------------------------- | ------ | ----------------------------------------------------- | ------------------ |
| `/app-configs`                              | GET    | Fetch super app configurations                        | `AppConfig`        |
| `/user-info`                                | GET    | Fetch user information of the logged-in user          | `Employee`         |
| `/micro-apps`                               | GET    | Retrieve all micro apps available to the user         | `MicroApp[]`       |
| `/micro-apps/{appId}`                       | GET    | Retrieve details of a specific micro app by App ID    | `MicroApp`         |
| `/versions?platform={ios/android}`          | GET    | Retrieve Super App version info for a platform        | `Version[]`        |
| `/users/user-configs`                       | GET    | Fetch user's downloaded micro app configurations      | `UserConfig[]`     |
| `/users/user-configs`                       | POST   | Add/update user's downloaded micro app configurations | `201 Created`      |
| `/users/fcm-tokens?group=test&startIndex=0` | GET    | Fetch user's fcm tokens for a given group             | `FcmTokenResponse` |
| `/users/fcm-tokens`                         | POST   | Add FCM token of a user                               | `201 Created`      |
| `/users/fcm-tokens`                         | DELETE | Delete FCM token of a user                            | `200 OK`           |

## Schema Definitions

  <img src="../resources/schema.png" alt="Schema Diagram" width="700"/>

| Table Name            | Description                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **micro_app**         | Stores micro app details, including micro app ID, name, description, promo text, icon URL, and banner image URL.   |
| **micro_app_role**    | Manages micro app accessibility based on specific user groups, allowing apps to be specialized for certain groups. |
| **superapp_version**  | Stores release versions, release notes, and other details about the Super App.                                     |
| **micro_app_version** | Stores release versions, release notes, and other details about micro-apps.                                        |
| **user_config**       | Stores user details and configurations for the Super App.                                                          |
| **app_configs**       | Stores configurations for the Super App.                                                                           |
| **device_token**      | Stores FCM tokens of a device.                                                                                     |

---
