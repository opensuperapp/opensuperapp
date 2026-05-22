/// <reference types="cypress" />
describe('Edit MicroApp', () => {
    beforeEach(() => {
        cy.visit('/', {
            onBeforeLoad(win) {
                win.localStorage.setItem('e2e-auth', '1');
            },
        });
    });
    it('updates fields and reflects changes without full reload', () => {
        // Seed list with one app
        cy.intercept('GET', '**/api/micro-apps*', [
            {
                appId: 'com.example.todo',
                name: 'ToDo',
                description: 'Tasks app',
                promoText: 'Get things done',
                isMandatory: 0,
                iconUrl: '/icons/todo.png',
                bannerImageUrl: '',
                versions: [
                    { version: '1.0.0', build: 1, releaseNotes: 'Initial', iconUrl: '/icons/todo.png', downloadUrl: '/zips/todo.zip' },
                ],
                roles: [{ role: 'admin' }],
            },
        ]).as('getApps');
        // Intercept upsert and capture body
        let upsertBody;
        cy.intercept('POST', '**/api/micro-apps', (req) => {
            upsertBody = req.body;
            req.reply({ statusCode: 200 });
        }).as('upsert');
        cy.wait('@getApps');
        // Record initial number of GET calls (may be >1 in React StrictMode)
        let initialGetCount = 0;
        cy.get('@getApps.all').then((calls) => {
            initialGetCount = calls?.length || 1;
        });
        // Open menu and choose Edit
        cy.get('[data-testid="microapp-actions-com.example.todo"]').click();
        cy.get('[data-testid="microapp-menu-edit"]').click();
        cy.contains('Edit Micro App').should('be.visible');
        // Change fields
        cy.get('[data-testid="edit-app-name"]').clear().type('Tasks');
        cy.get('[data-testid="edit-app-description"]').clear().type('Tasks manager');
        cy.get('[data-testid="edit-app-promo"]').clear().type('Be productive');
        cy.get('[data-testid="edit-app-mandatory"]').click();
        // Submit
        cy.get('[data-testid="edit-app-update"]').click();
        cy.wait('@upsert').then(() => {
            expect(upsertBody).to.have.property('name', 'Tasks');
            expect(upsertBody).to.have.property('description', 'Tasks manager');
            expect(upsertBody).to.have.property('promoText', 'Be productive');
            expect(upsertBody).to.have.property('isMandatory', 1);
        });
        // Assert toast and dialog closed
        cy.contains('Micro app updated successfully').should('be.visible');
        cy.contains('Edit Micro App').should('not.exist');
        // Verify card updated without issuing an extra GET after edit
        cy.wait(200); // tiny settle time
        cy.get('@getApps.all').then((calls) => {
            const afterCount = calls?.length || 1;
            expect(afterCount).to.eq(initialGetCount);
        });
        cy.get('[data-testid="microapp-card"]').first().within(() => {
            cy.contains('Tasks').should('be.visible');
            cy.contains('Optional').should('not.exist');
            cy.contains('Mandatory').should('be.visible');
            cy.contains('Tasks manager').should('be.visible');
        });
    });
});
