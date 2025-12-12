/// <reference types="cypress" />

describe('Authenticated flows (stubbed)', () => {
  beforeEach(() => {
    cy.fixture('microapps.json').as('microapps');
    cy.fixture('users.json').as('users');
    cy.intercept('GET', '/api/micro-apps', { fixture: 'microapps.json' }).as('getMicroApps');
    cy.intercept('GET', '/api/users', { fixture: 'users.json' }).as('getUsers');
  });

  it('renders MicroApps list when authenticated (bypass)', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
  cy.wait('@getMicroApps');
  cy.contains('Sign In').should('not.exist');
  });

  it('renders Users list when authenticated (bypass)', () => {
    cy.visit('/users', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
  cy.wait('@getUsers');
  cy.contains('Sign In').should('not.exist');
  });
});
