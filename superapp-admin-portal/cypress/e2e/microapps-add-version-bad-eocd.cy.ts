/// <reference types="cypress" />

// Corrupt/bad EOCD: validator blocks and displays reason

describe('MicroApps - Add Version bad EOCD', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
        // Ensure validator runs
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

  it('rejects zip missing EOCD with clear message', () => {
    cy.get('[data-testid="microapp-actions-com.example.todo"]').click({ force: true });
    cy.contains('Add New Version').click();
    cy.contains('Add New Version').should('be.visible');

    // Fill required text fields
    cy.get('[data-testid="add-version-version"]').type('1.0.0');
    cy.get('[data-testid="add-version-release-notes"]').type('Notes');

    // Build a small zip-like blob with header but no EOCD at tail
    const header = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const body = new Uint8Array(40); // zeros, so no EOCD signature at the end
    const blob = new Blob([header, body], { type: 'application/zip' });

    cy.get('[data-testid="add-version-upload-zip-input"]').selectFile({ contents: blob, fileName: 'bad-structure.zip', mimeType: 'application/zip' }, { force: true });

    // Prefer toast assertion when available
    cy.contains(/ZIP file structure is invalid|corrupted/i, { timeout: 1500 }).should('exist');

    // Ensure file not accepted
    cy.contains('Selected: bad-structure.zip').should('not.exist');

    // Submit should still require a valid ZIP
    cy.get('[data-testid="add-version-submit"]').click();
    cy.contains('App package (ZIP) is required').should('be.visible');
  });
});
