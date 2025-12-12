import '@testing-library/cypress/add-commands';
import '@cypress/code-coverage/support';

// Do not set auth flags globally; each spec controls auth via localStorage as needed.

// Note: Individual specs are responsible for stubbing network calls they rely on.
