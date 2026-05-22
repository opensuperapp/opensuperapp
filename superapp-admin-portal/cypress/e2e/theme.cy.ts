/// <reference types="cypress" />

const STORAGE_KEY = 'app-theme-mode';

describe('Theme: Dark mode toggle persists and applies attributes', () => {
  it('toggles theme, persists to localStorage, and sets html attributes', () => {
    // Start with light
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('e2e-auth', '1');
        win.localStorage.setItem(STORAGE_KEY, 'light');
      },
    });

    // Initial attributes should reflect light
    cy.document().its('documentElement').should('have.attr', 'data-theme', 'light');
    cy.document().its('documentElement.classList.value').should('contain', 'theme-light');

    // Toggle to dark
    cy.get('[data-testid="theme-toggle"]').click();
    cy.document().its('documentElement').should('have.attr', 'data-theme', 'dark');
    cy.document().its('documentElement.classList.value').should('contain', 'theme-dark');

    // Persisted
    cy.window().then((w) => {
      expect(w.localStorage.getItem(STORAGE_KEY)).to.eq('dark');
    });

    // Hard reload preserves dark
    cy.reload();
    cy.document().its('documentElement').should('have.attr', 'data-theme', 'dark');
    cy.document().its('documentElement.classList.value').should('contain', 'theme-dark');

    // Toggle back to light
    cy.get('[data-testid="theme-toggle"]').click();
    cy.document().its('documentElement').should('have.attr', 'data-theme', 'light');
    cy.document().its('documentElement.classList.value').should('contain', 'theme-light');
    cy.window().then((w) => {
      expect(w.localStorage.getItem(STORAGE_KEY)).to.eq('light');
    });
  });
});
