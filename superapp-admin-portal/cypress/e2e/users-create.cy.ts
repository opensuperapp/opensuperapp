/// <reference types="cypress" />

// Create user: POST /api/users → row appears; success toast

describe('Users - create user flow', () => {
  const seed = [
    { workEmail: 'carol@example.com', firstName: 'Carol', lastName: 'Zeta', location: 'Berlin' },
    { workEmail: 'bob@example.com', firstName: 'Bob', lastName: 'Beta', location: 'Amsterdam' },
  ];

  beforeEach(() => {
    cy.intercept('GET', '**/api/users*', seed).as('getUsers');
    cy.visit('/users', {
      onBeforeLoad(win) { win.localStorage.setItem('e2e-auth', '1'); },
    });
    cy.contains('Users').should('be.visible');
    cy.wait('@getUsers');
  });

  it('posts new user and shows row with success toast', () => {
    // Open dialog
    cy.contains('button', 'Add User').click();
    cy.contains('Add Users').should('be.visible');

    // Fill form
    cy.get('[data-testid="create-user-email"]').type('alice@example.com');
    cy.get('[data-testid="create-user-first-name"]').type('Alice');
    cy.get('[data-testid="create-user-last-name"]').type('Alpha');
    cy.get('[data-testid="create-user-location"]').type('Zurich');

    // Intercept POST and reply 200
    cy.intercept('POST', '**/api/users', (req) => {
      expect(req.body).to.deep.equal({
        workEmail: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Alpha',
        userThumbnail: '',
        location: 'Zurich',
      });
      req.reply(200, {});
    }).as('postUser');

    // After success, GET will be called again; return updated list including the new user
    const updated = [
      ...seed,
      { workEmail: 'alice@example.com', firstName: 'Alice', lastName: 'Alpha', location: 'Zurich' },
    ];
    cy.intercept('GET', '**/api/users*', updated).as('getUsersAfter');

    // Submit
    cy.get('[data-testid="create-user-submit"]').click();

    // Toast shows success
    cy.contains('User created successfully', { timeout: 4000 }).should('be.visible');

    // List refreshed, row appears
    cy.wait('@getUsersAfter');
    cy.get('[data-testid="users-row-alice@example.com"]').within(() => {
      cy.get('[data-testid="user-name"]').should('contain.text', 'Alice Alpha');
      cy.get('[data-testid="user-email"]').should('contain.text', 'alice@example.com');
      cy.get('[data-testid="user-location"]').should('contain.text', 'Zurich');
    });
  });
});
