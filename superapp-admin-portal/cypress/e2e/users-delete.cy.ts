/// <reference types="cypress" />

// Delete user: confirm dialog, DELETE call, row removed, optional undo

describe('Users - delete user flow', () => {
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

  it('confirms deletion and removes the row', () => {
    // Click delete for Carol
    cy.get('[data-testid="users-delete-carol@example.com"]').click();
    // Confirm dialog appears
    cy.contains('Delete User').should('be.visible');
    cy.contains('button', 'Delete').should('be.visible');

    // Intercept DELETE
    cy.intercept('DELETE', '**/api/users/*', (req) => {
      expect(req.url).to.match(/carol%40example\.com$/);
      req.reply(200, {});
    }).as('deleteUser');

    // After delete, list reloads without Carol
    const after = seed.filter((u) => u.workEmail !== 'carol@example.com');
    cy.intercept('GET', '**/api/users*', after).as('getUsersAfter');

    // Confirm
    cy.contains('button', 'Delete').click();

    // Success toast
    cy.contains('User deleted successfully', { timeout: 4000 }).should('be.visible');

    // Row is removed
    cy.wait('@getUsersAfter');
    cy.get('[data-testid="users-row-carol@example.com"]').should('not.exist');
  });

  it('cancel in confirm dialog keeps the row', () => {
    cy.get('[data-testid="users-delete-bob@example.com"]').click();
    cy.contains('Delete User').should('be.visible');
    cy.contains('button', 'Cancel').click();
    cy.get('[data-testid="users-row-bob@example.com"]').should('exist');
  });
});
