/// <reference types="cypress" />

describe('Users - loading skeletons', () => {
  it('shows skeletons while request in-flight, then hides after resolve', () => {
    cy.intercept('GET', '/api/users', (req) => {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
          req.reply({ fixture: 'users.json' });
      resolve();
        }, 800);
      });
    }).as('getUsers');

    cy.visit('/users', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });

    cy.get('[data-testid="users-skeleton"]').should('be.visible');
    cy.get('[data-testid="users-skeleton-row"]').should('have.length.at.least', 3);

    cy.wait('@getUsers');
    cy.get('[data-testid="users-skeleton"]').should('not.exist');
    cy.get('[data-testid="users-table"]').should('exist');
  });
});
