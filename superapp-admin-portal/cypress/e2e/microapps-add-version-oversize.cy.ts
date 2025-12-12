/// <reference types="cypress" />

// Oversize file: exceeds max MB -> error message from validator

describe('MicroApps - Add Version oversize file', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
        // Ensure validator runs (no bypass)
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

  it('rejects zip larger than allowed size with clear message', () => {
    cy.get('[data-testid="microapp-actions-com.example.todo"]').click({ force: true });
    cy.contains('Add New Version').click();
    cy.contains('Add New Version').should('be.visible');

  // Fill required text fields so only the ZIP remains required
  cy.get('[data-testid="add-version-version"]').type('1.0.0');
  cy.get('[data-testid="add-version-release-notes"]').type('Notes');

    // Create a Blob larger than configured MAX_SIZE_MB (default 10MB)
    const oversizeBytes = (10 * 1024 * 1024) + 1024; // 10MB + 1KB
    const largeArray = new Uint8Array(oversizeBytes);
    // Ensure ZIP signature so validator gets past signature check and fails on size
    largeArray[0] = 0x50; // P
    largeArray[1] = 0x4b; // K
    largeArray[2] = 0x03;
    largeArray[3] = 0x04;
    const bigBlob = new Blob([largeArray], { type: 'application/zip' });

  cy.get('[data-testid="add-version-upload-zip-input"]').selectFile({ contents: bigBlob, fileName: 'huge.zip', mimeType: 'application/zip' }, { force: true });
  // File should not be accepted; chip must not appear
  cy.contains('Selected: huge.zip').should('not.exist');
  // Attempt to submit: expect ZIP required error
  cy.get('[data-testid="add-version-submit"]').click();
  cy.contains('App package (ZIP) is required').should('be.visible');
  });
});
