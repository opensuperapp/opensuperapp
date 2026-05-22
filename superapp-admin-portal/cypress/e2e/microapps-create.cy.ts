/// <reference types="cypress" />

// E2E: Create MicroApp flow

describe('Create MicroApp', () => {
  beforeEach(() => {
    // Start on dashboard and ensure auth bypass
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
      },
    });
  });

  it('opens dialog, fills form, posts, shows success, and refreshes list', () => {
    // Intercept list twice: first empty, then with new item
    let calls = 0;
    cy.intercept('GET', '**/api/micro-apps*', (req) => {
      calls += 1;
      if (calls === 1) {
        req.reply([]);
      } else {
        req.reply([
          {
            appId: 'com.example.todo',
            name: 'ToDo',
            description: 'Tasks app',
            promoText: 'Get things done',
            isMandatory: 1,
            iconUrl: '/icons/todo.png',
            bannerImageUrl: '',
            versions: [
              { version: '1.0.0', build: 1, releaseNotes: 'Initial', iconUrl: '/icons/todo.png', downloadUrl: '/zips/todo.zip' },
            ],
            roles: [{ role: 'admin' }],
          },
        ]);
      }
    }).as('getMicroApps');

    // POST upsert micro app
    cy.intercept('POST', '**/api/micro-apps', (req) => {
      // Basic body checks
      expect(req.body).to.have.property('appId', 'com.example.todo');
      expect(req.body).to.have.property('name', 'ToDo');
      expect(req.body).to.have.property('description');
      expect(req.body).to.have.property('versions');
      req.reply({ statusCode: 201 });
    }).as('createMicroApp');

    cy.wait('@getMicroApps');

    // Open dialog
    cy.contains('Add Micro App').click();
    cy.contains('Add New Micro App').should('be.visible');

    // Step 1: Basic info
    cy.get('[data-testid="add-app-appId"]').type('com.example.todo');
    cy.get('[data-testid="add-app-name"]').type('ToDo');
    cy.get('[data-testid="add-app-description"]').type('Tasks app');
    cy.get('[data-testid="add-app-promo"]').type('Get things done');
    cy.get('[data-testid="add-app-mandatory"]').click();
    cy.contains('Next').click();

  // Step 2: Assets (bypass mode allows skipping uploads)
  cy.contains('App Icon (128x128 PNG)').should('be.visible');
  cy.contains('Next').click();
  cy.get('[data-testid="add-app-version"]').should('be.visible');

    // Step 3: Version details + zip upload
    cy.get('[data-testid="add-app-version"]').type('1.0.0');
    cy.get('[data-testid="add-app-build"]').clear().type('1');
    cy.get('[data-testid="add-app-release-notes"]').type('Initial');

  // Step 3: Version (bypass mode allows skipping zip upload)
  cy.contains('App Package (ZIP file)').should('be.visible');
  cy.contains('Next').click();
  cy.get('[data-testid="add-app-role-input"]').should('be.visible');

    // Step 4: Roles
    cy.get('[data-testid="add-app-role-input"]').type('admin');
    cy.get('[data-testid="add-app-add-role"]').click();
    cy.contains('Next').click();

    // Step 5: Review -> Create
  cy.contains('Create Micro App').click();
  cy.wait('@createMicroApp');

    // Success toast and dialog closes. The page refresher runs, assert list shows the new card
  cy.contains('Micro app created successfully').should('be.visible');
  cy.wait('@getMicroApps');

    cy.get('[data-testid="microapps-grid"]').should('exist');
    cy.get('[data-testid="microapp-card"]').should('have.length', 1);
    cy.get('[data-testid="microapp-card"]').first().within(() => {
      cy.contains('ToDo').should('be.visible');
      cy.contains('Mandatory').should('be.visible');
      cy.contains('Version 1.0.0').should('exist');
    });
  });
});
