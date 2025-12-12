/// <reference types="cypress" />

// Sorting tests for Users table

describe('Users page sorting', () => {
  const users = [
    {
      workEmail: 'carol@example.com',
      firstName: 'Carol',
      lastName: 'Zeta',
      location: 'Berlin',
    },
    {
      workEmail: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Alpha',
      location: 'Zurich',
    },
    {
      workEmail: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Beta',
      location: 'Amsterdam',
    },
  ];

  const visitUsers = () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
    cy.contains('Users').click();
  };

  const getFirstRow = () => cy.get('[data-testid="users-table"] tbody tr').first();

  beforeEach(() => {
    cy.intercept('GET', '**/api/users', users).as('getUsers');
  });

  it('sorts by name ascending/descending', () => {
    visitUsers();
    cy.wait('@getUsers');

    // Default sort is by name asc
    getFirstRow().within(() => {
      cy.get('[data-testid="user-name"]').should('contain', 'Alice Alpha');
    });

    // Toggle to desc
    cy.get('[data-testid="users-sort-name"]').click();
    getFirstRow().within(() => {
      cy.get('[data-testid="user-name"]').should('contain', 'Carol Zeta');
    });
  });

  it('sorts by email ascending/descending', () => {
    visitUsers();
    cy.wait('@getUsers');

    // Click email header to set email asc
    cy.get('[data-testid="users-sort-email"]').click();
    getFirstRow().within(() => {
      cy.get('[data-testid="user-email"]').should('contain', 'alice@example.com');
    });

    // Toggle to desc
    cy.get('[data-testid="users-sort-email"]').click();
    getFirstRow().within(() => {
      cy.get('[data-testid="user-email"]').should('contain', 'carol@example.com');
    });
  });

  it('sorts by location ascending/descending', () => {
    visitUsers();
    cy.wait('@getUsers');

    // Click location header to set location asc (Amsterdam -> Berlin -> Zurich)
    cy.get('[data-testid="users-sort-location"]').click();
    getFirstRow().within(() => {
      cy.get('[data-testid="user-location"]').should('contain', 'Amsterdam');
    });

    // Toggle to desc (Zurich -> Berlin -> Amsterdam)
    cy.get('[data-testid="users-sort-location"]').click();
    getFirstRow().within(() => {
      cy.get('[data-testid="user-location"]').should('contain', 'Zurich');
    });
  });
});
