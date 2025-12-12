/// <reference types="cypress" />

// Happy path: upload valid .zip, passes validator, calls upload endpoint, shows new version in table

function makeValidZipBlob(contents: string = 'hello'): Blob {
  // Minimal EOCD structure to satisfy validator: 'PK\x05\x06' + 18 bytes
  const eocd = new Uint8Array([0x50, 0x4b, 0x05, 0x06, ...Array(18).fill(0)]);
  // Prepend a local file header signature 'PK\x03\x04' to satisfy signature check
  const lfh = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...Array(Math.max(0, 30 - 4)).fill(0)]);
  const payload = new TextEncoder().encode(contents);
  const blob = new Blob([lfh, payload, eocd], { type: 'application/zip' });
  return blob;
}

describe('MicroApps - Add Version happy path', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
  win.localStorage.setItem('e2e-bypass-uploads', '1');
      },
    });
  });

  it('uploads zip, posts addVersion, and shows it in UI', () => {
    // Seed one app with 0 versions
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

    // Intercept addVersion call
    cy.intercept('POST', '**/api/micro-apps/**/versions', (req) => {
      expect(req.body).to.have.property('version', '1.0.0');
      expect(req.body.build).to.be.a('number');
      // In bypass mode, uploadFile returns /uploads/<fileName>
      expect(req.body.downloadUrl).to.match(/\/uploads\/todo-1\.0\.0\.zip$/);
      req.reply(200, {});
    }).as('addVersion');

    // Allow refresh to include new version
    const appWithVersion = {
      ...app,
      versions: [
        {
          version: '1.0.0',
          build: 1,
          releaseNotes: 'Initial release',
          iconUrl: '/icons/todo.png',
          downloadUrl: 'https://cdn.example.com/todo-1.0.0.zip',
        },
      ],
    };
    cy.intercept('GET', '**/api/micro-apps*', [appWithVersion]).as('getAppsAfter');

    cy.wait('@getApps');

    // Open actions and choose Add New Version
  cy.get(`[data-testid=\"microapp-actions-${app.appId}\"]`).click({ force: true });
    cy.contains('Add New Version').click();
    cy.contains('Add New Version').should('be.visible');

    // Fill form
    cy.contains('Adding new version to:').should('contain', app.name);
  cy.get('[data-testid="add-version-version"]').type('1.0.0');
  cy.get('[data-testid="add-version-release-notes"]').type('Initial release');

    // Upload a valid zip
  const blob = makeValidZipBlob('zip-data');
  const fileName = 'todo-1.0.0.zip';
  cy.get('[data-testid="add-version-upload-zip-input"]').selectFile({ contents: blob, fileName, mimeType: 'application/zip' }, { force: true });
  cy.contains(`Selected: ${fileName}`).should('be.visible');

    // Submit
  cy.get('[data-testid="add-version-submit"]').click();

    cy.wait('@addVersion');
    cy.wait('@getAppsAfter');

    // Expand versions and assert new version row
    cy.contains('Show Versions').click();
    cy.contains('Version 1.0.0').should('be.visible');
  cy.contains(/Build\s+\d+/).should('be.visible');
    cy.contains('Download Package').should('have.attr', 'href', 'https://cdn.example.com/todo-1.0.0.zip');
  });
});
