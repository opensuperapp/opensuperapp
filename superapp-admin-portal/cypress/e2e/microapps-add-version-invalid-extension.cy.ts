/// <reference types="cypress" />

// Invalid extension: .txt rejected with clear message (uses validator)

describe('MicroApps - Add Version invalid extension', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
        // Ensure we do NOT bypass uploads so validator runs
        win.localStorage.removeItem('e2e-bypass-uploads');
      },
    });

    const app = {
      appId: 'com.example.todo',
      name: 'ToDo',
      description: 'Tasks',
      promoText: '',
      isMandatory: 0,
      iconUrl: '/icons/todo.png',
      bannerImageUrl: '',
      isActive: 1,
      versions: [],
      roles: [{ role: 'admin' }],
    };
    cy.intercept('GET', '**/api/micro-apps*', [app]).as('getApps');
    cy.wait('@getApps');
  });

  it('rejects .txt upload and shows clear error', () => {
    cy.get('[data-testid="microapp-actions-com.example.todo"]').click({ force: true });
    cy.contains('Add New Version').click();
    cy.contains('Add New Version').should('be.visible');

    // Prepare an invalid .txt file
    const txt = new Blob(['not-a-zip'], { type: 'text/plain' });
    const fileName = 'notes.txt';

    // Try to upload .txt
    cy.get('[data-testid="add-version-upload-zip-input"]').selectFile({ contents: txt, fileName, mimeType: 'text/plain' }, { force: true });

    // Assert error toast from validator appears
    cy.contains('Invalid file type: "notes.txt". Only .zip files are accepted.').should('be.visible');

    // Ensure no chip indicating selection is shown and form still requires a zip
    cy.contains('Selected: notes.txt').should('not.exist');
  });
});
