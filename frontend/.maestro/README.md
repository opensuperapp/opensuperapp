# Maestro E2E Tests

This directory contains all the YAML files for running End-to-End (E2E) tests using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

Before you begin, ensure you have the following installed and configured:

- **Node.js and npm/yarn:** Required for most mobile development environments.
- **Mobile Development Environment:**
  - For **Android:** [Android Studio](https://developer.android.com/studio) and the Android SDK.
  - For **iOS:** [Xcode](https://developer.apple.com/xcode/) and the iOS SDK.
- Your mobile application's build (`.apk` for Android or `.app` for iOS) available.

## Directory Structure

The `.maestro` directory is structured to hold all the necessary files for E2E testing:

```
maestro/
├── library.yml             # example E2E test file
└── ... (other test files)
```

All test-related YAML files should be placed within this directory.

## Maestro Installation

To install Maestro, you can use the following command in your terminal. It's recommended to run this from the root of your project.

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

This script will install the Maestro CLI on your system. For more detailed installation instructions, please refer to the [official Maestro documentation](https://maestro.mobile.dev/getting-started/installing-maestro).

## Running Tests

To execute a Maestro test, navigate to the `.maestro` directory and run the following command:

```bash
cd .maestro
maestro test <your_test_file>.yml
```

For example, to run the `library.yml` test:

```bash
maestro test library.yml -e BUNDLE_IDENTIFIER=com.example.yourapp
```

Note: the `library.yml` file requires the `BUNDLE_IDENTIFIER` variable to be injected.

### Injecting Variables

It is often necessary to pass environment-specific variables to your tests. Maestro allows you to do this using the `-e` flag.

For example, to inject the `BUNDLE_IDENTIFIER` for the application, you would use the following command:

```bash
maestro test library.yml -e BUNDLE_IDENTIFIER=com.example.yourapp
```

You can pass multiple variables by using the `-e` flag for each one:

```bash
maestro test library.yml -e BUNDLE_IDENTIFIER=com.example.yourapp -e API_URL=https://dev.api.example.com
```

## Troubleshooting

Here are a few common issues and their solutions:

- **`maestro: command not found`**: This usually means the Maestro binary is not in your system's PATH. Make sure you have added it to your shell's configuration file (e.g., `.zshrc`, `.bash_profile`). The installation script should provide the necessary command to do this.
- **Tests failing to find elements**: Ensure that the selectors (e.g., `text`, `id`) in your YAML files match the accessibility labels or IDs in your application's UI. Use the Maestro Studio to inspect your app's UI hierarchy.
- **Variable injection not working**: Double-check the syntax of your command. It should be `maestro test <file> -e KEY=VALUE`. Also, ensure the variable is correctly referenced in your YAML file with `${VARIABLE_NAME}`.

For further assistance, please refer to the official [Maestro documentation](https://maestro.mobile.dev/troubleshooting).
