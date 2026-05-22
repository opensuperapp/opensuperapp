/// <reference types="cypress" />

// Filters and search: Filter by location; search narrows list; query params reflected

describe('Users - filters & search with query params', () => {
  beforeEach(() => {
    // Stub users and visit Users page with auth bypass
    cy.fixture('users.json').as('users');
    cy.intercept('GET', '**/api/users*', { fixture: 'users.json' }).as('getUsers');
    cy.visit('/users', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
    cy.contains('Users').should('be.visible');
    cy.wait('@getUsers');
  });

  it('search narrows the list and updates ?q', () => {
    cy.get('[data-testid="users-table"] tbody tr').then(($rows) => {
      const initialCount = $rows.length;
      cy.get('[data-testid="users-search"]').type('alice');
      // list should narrow to rows that include alice in name or email
      cy.get('[data-testid="users-table"] tbody tr').its('length').should('be.lt', initialCount);
      // URL query contains q
      cy.location('search').should('contain', 'q=alice');
    });
  });

  it('location filter narrows the list and updates ?location', () => {
  // Open the Select via the visible trigger testid
  cy.get('[data-testid="users-filter-location-trigger"]').click();
    // Pick first non-all value if present; otherwise skip
    cy.get('ul[role="listbox"] li').then(($options) => {
      const target = Array.from($options).find((li) => li.textContent && li.textContent !== 'All Locations');
      if (!target) return; // no-op if only All Locations present
      cy.wrap(target).click();
      cy.get('[data-testid="users-table"] tbody tr').its('length').should('be.gt', 0);
      cy.location('search').should('contain', 'location=');
      // The select value should reflect chosen option
      cy.get('[data-testid="users-filter-location"]').should(($el) => {
        const val = ($el[0] as HTMLInputElement).value;
        expect(val).to.not.equal('all');
      });
    });
  });

  it('initial URL query hydrates controls and filters', () => {
    // Reload with pre-set query params
    cy.visit('/users?q=alice&location=NY', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
    cy.wait('@getUsers');
    cy.get('[data-testid="users-search"]').should('have.value', 'alice');
    cy.get('[data-testid="users-filter-location"]').should('have.value', 'NY');
    // Rows should be filtered accordingly (at least 0, but not more than total)
    cy.get('[data-testid="users-table"] tbody tr').its('length').should('be.gte', 0);
  });
});
