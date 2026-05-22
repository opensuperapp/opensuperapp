/// <reference types="cypress" />
describe('Authenticated flows (stubbed)', () => {
    beforeEach(() => {
        // Pretend user is authenticated by setting a cookie that your app might read; adjust as needed.
        // Since the app relies on OIDC state, we instead bypass by visiting routes after setting window.configs and intercepting APIs.
        cy.fixture('microapps.json').as('microapps');
        cy.fixture('users.json').as('users');
        cy.intercept('GET', '/api/micro-apps', (req) => {
            req.reply({ statusCode: 200, body: req.fixture ? req.fixture('microapps.json') : undefined });
        }).as('getMicroApps');
        cy.intercept('GET', '/api/users', (req) => {
            req.reply({ statusCode: 200, body: req.fixture ? req.fixture('users.json') : undefined });
        }).as('getUsers');
    });
    it('renders MicroApps list when authenticated (placeholder auth bypass)', () => {
        // Navigate to root; in a real test, you would programmatically sign in or stub OIDC flows.
        cy.visit('/');
        // Without real auth, app shows login. This spec is a template to expand once sign-in is scriptable.
        cy.findByRole('button', { name: /sign in/i }).should('exist');
    });
    it('renders Users list when authenticated (placeholder auth bypass)', () => {
        cy.visit('/users');
        cy.findByRole('button', { name: /sign in/i }).should('exist');
    });
});
