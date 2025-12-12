/// <reference types="cypress" />

describe('MicroApps deactivate/reactivate', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
  });

  it('toggles status via PUT /deactivate/:id and updates UI without list refetch', () => {
    // Seed initial list with active app
    cy.intercept('GET', '**/api/micro-apps*', [
      {
        appId: 'com.example.todo',
        name: 'ToDo',
        description: 'Tasks app',
        promoText: 'Get things done',
        isMandatory: 0,
        isActive: 1,
        iconUrl: '/icons/todo.png',
        bannerImageUrl: '',
        versions: [
          { version: '1.0.0', build: 1, releaseNotes: 'Initial', iconUrl: '/icons/todo.png', downloadUrl: '/zips/todo.zip' },
        ],
        roles: [{ role: 'admin' }],
      },
    ]).as('getApps');

    // PUT deactivate endpoint (used for both deactivate/reactivate)
    cy.intercept('PUT', '**/api/micro-apps/deactivate/*', { statusCode: 200 }).as('toggle');

    cy.wait('@getApps');
    let initialGets = 0;
    cy.get('@getApps.all').then((calls: any) => {
      initialGets = (calls?.length as number) || 1;
    });

    // Deactivate
    cy.get('[data-testid="microapp-actions-com.example.todo"]').click();
    cy.get('[data-testid="microapp-menu-deactivate"]').click();
    cy.wait('@toggle');
    cy.contains('Micro app deactivated successfully').should('be.visible');
    cy.get('[data-testid="microapp-status-com.example.todo"]').should('contain.text', 'Inactive');

    // Assert no extra GET list fetch
    cy.wait(150);
    cy.get('@getApps.all').then((calls: any) => {
      const after = (calls?.length as number) || 1;
      expect(after).to.eq(initialGets);
    });

    // Reactivate
    cy.get('[data-testid="microapp-actions-com.example.todo"]').click();
    cy.get('[data-testid="microapp-menu-reactivate"]').click();
    cy.wait('@toggle');
    cy.contains('Micro app reactivated successfully').should('be.visible');
    cy.get('[data-testid="microapp-status-com.example.todo"]').should('contain.text', 'Active');

    // Still no extra GET list fetch
    cy.wait(150);
    cy.get('@getApps.all').then((calls: any) => {
      const after2 = (calls?.length as number) || 1;
      expect(after2).to.eq(initialGets);
    });
  });
});
