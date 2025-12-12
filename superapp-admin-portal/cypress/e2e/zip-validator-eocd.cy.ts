/// <reference types="cypress" />

// Unit-style Cypress test: corrupt/bad EOCD should be rejected with a clear reason

describe('zipValidator - corrupt/bad EOCD', () => {
  it('rejects when EOCD missing at tail', () => {
    // Dynamically import the validator from the app bundle
    cy.window().then((win: any) => {
      const { validateZipFile } = win.__app__?.utils || {};
      if (!validateZipFile) {
        // Fallback: import via ES module path resolved by Vite dev server
        return import('../../src/utils/zipValidator').then((mod) => mod.validateZipFile);
      }
      return validateZipFile;
    }).then(async (validateZipFile: (f: File|null) => Promise<any>) => {
      // Build a file with ZIP header but missing EOCD signature at the end
      const header = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
      const body = new Uint8Array(40); // zeros, so no EOCD at end
      const blob = new Blob([header, body], { type: 'application/zip' });
      const file = new File([blob], 'bad-structure.zip', { type: 'application/zip' });

      const res = await validateZipFile(file);
      expect(res.valid).to.equal(false);
      expect(res.error).to.match(/structure is invalid|corrupted/i);
    });
  });
});
