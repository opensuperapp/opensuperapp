/// <reference types="cypress" />

// Progress UI: verify progress indicator appears during upload and completes

describe('MicroApps - Add Version progress UI', () => {
  function makeValidZipBlob(contents: string = 'hello'): Blob {
    const eocd = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...Array(18).fill(0)]);
    const lfh = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...Array(Math.max(0, 30 - 4)).fill(0)]);
    const payload = new TextEncoder().encode(contents);
    const blob = new Blob([lfh, payload, eocd], { type: 'application/zip' });
    return blob;
  }
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
  // Enable bypass to make progress UI deterministic without real network
  win.localStorage.setItem('e2e-bypass-uploads', '1');
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

  it('shows and completes progress during upload', () => {

    cy.get('[data-testid="microapp-actions-com.example.todo"]').click({ force: true });
    cy.contains('Add New Version').click();
    cy.contains('Add New Version').should('be.visible');

    // Fill required fields
    cy.get('[data-testid="add-version-version"]').type('1.0.0');
    cy.get('[data-testid="add-version-release-notes"]').type('Initial release');

    // Select a small valid-looking zip blob (header + EOCD minimal)
  const blob = makeValidZipBlob('zip-data');
  cy.get('[data-testid="add-version-upload-zip-input"]').selectFile({ contents: blob, fileName: 'todo-1.0.0.zip', mimeType: 'application/zip' }, { force: true });
  cy.contains('Package selected: todo-1.0.0.zip', { timeout: 2000 }).should('be.visible');

  // Submit to trigger upload
  cy.get('[data-testid="add-version-submit"]').click();

  // Progress bar appears (bypass still shows staged progress values)
  cy.get('[data-testid="add-version-progress"]', { timeout: 6000 }).should('exist');

  // Progress bar disappears after completion
  cy.get('[data-testid="add-version-progress"]', { timeout: 6000 }).should('not.exist');
  });
});
