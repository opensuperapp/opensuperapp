/// <reference types="cypress" />

// Load and render: Intercept GET /api/users; verify name, email, avatar, pagination

describe('Users - load and render', () => {
  beforeEach(() => {
    // Set auth bypass and stub users before visiting to catch initial request
    cy.fixture('users-paged.json').as('usersPage1');
    cy.window({ log: false }).then(() => {
      // noop to ensure Cypress has a window context
    });
  });

  it('renders rows with name, email, and avatar', () => {
    // Intercept users before navigation
    cy.fixture('users-paged.json').then((fx) => {
      cy.intercept('GET', '**/api/users*', fx.items).as('getUsers');
    });

    cy.visit('/users', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    cy.contains('Users').should('be.visible');
    cy.wait('@getUsers');

    // Table exists
    cy.get('[data-testid="users-table"]').should('be.visible');

    // Verify first few rows contain name, email, and avatar img or initials
    const expected = [
      { email: 'alice@example.com', name: 'Alice Anderson' },
      { email: 'bob@example.com', name: 'Bob Baker' },
      { email: 'carol@example.com', name: 'Carol Clark' },
    ];
    expected.forEach((u) => {
      cy.get(`[data-testid="users-row-${u.email}"]`).within(() => {
        cy.get('[data-testid="user-name"]').should('contain.text', u.name);
        cy.get('[data-testid="user-email"]').should('contain.text', u.email);
        // Avatar img present when userThumbnail provided
        cy.get('img').should('exist');
      });
    });

    // Assert total rendered rows equals the fixture length
    cy.fixture('users-paged.json').then((fx) => {
      cy.get('[data-testid="users-table"] tbody tr').should('have.length', fx.items.length);
    });
  });
});
