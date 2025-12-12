# SuperApp Admin Portal

## Overview

This is the Admin Portal for SuperApp, built using Vite for fast development and optimized builds. The portal provides administrative features for managing users, content, and system configurations.

## Features

- User management (create, update, delete, view)
- Role-based access control
- Content moderation
- Analytics dashboard
- System configuration
- Responsive UI
- Authentication and authorization

## Tech Stack

- [Vite](https://vitejs.dev/) (Frontend build tool)
- [React](https://react.dev/) (UI library)
- [TypeScript](https://www.typescriptlang.org/) (Type safety)
- [Redux Toolkit](https://redux-toolkit.js.org/) (State management)
- [React Router](https://reactrouter.com/) (Routing)
- [Tailwind CSS](https://tailwindcss.com/) (Styling)
- [Axios](https://axios-http.com/) (API requests)

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd superapp-admin-portal/admin_portal/new
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:5173` (default Vite port).

### Building for Production

```bash
npm run build
# or
yarn build
```

The production-ready files will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
# or
yarn preview
```

## Project Structure

```
admin_portal/
  new/
    src/
      components/      # Reusable UI components
      pages/           # Route-based pages
      store/           # Redux store setup
      hooks/           # Custom React hooks
      assets/          # Images, fonts, etc.
      App.tsx          # Main app component
      main.tsx         # Entry point
    public/            # Static files
    vite.config.ts     # Vite configuration
    tsconfig.json      # TypeScript configuration
    package.json       # Project metadata and scripts
    README.md          # Project documentation
```

## Environment Variables

Create a `.env` file in the root of the project for sensitive configuration:

```
VITE_API_URL=https://api.superapp.com
VITE_AUTH_CLIENT_ID=your-client-id
```

Refer to `vite.config.ts` for usage.

## Scripts

- `dev`: Start development server
- `build`: Build for production
- `preview`: Preview production build
- `lint`: Run linter
- `test`: Run tests

## Testing

Unit and integration tests use Jest + React Testing Library, and end-to-end tests use Cypress.

Unit tests:

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:ci       # CI-friendly, runInBand
```

E2E tests with Cypress:

```bash
npm run cy:open       # open Cypress app
npm run test:e2e      # start Vite and run Cypress headless
```

Notes:
- E2E base URL is http://localhost:5173 and a smoke test lives in `cypress/e2e/smoke.cy.ts`.
- If Cypress binary download is skipped (CI), the first `cy:open` will download it locally.

## Linting & Formatting

- ESLint for code linting
- Prettier for code formatting

```bash
npm run lint
npm run format
```

## Deployment

You can deploy the production build (`dist/`) to any static hosting service (e.g., Vercel, Netlify, AWS S3).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## Troubleshooting

- If dependencies fail to install, ensure your Node.js version is compatible.
- For CORS/API issues, check your `.env` and backend configuration.
- For build errors, check `vite.config.ts` and TypeScript settings.

## License

This project is licensed under the MIT License.
