export const getFields = () =>
  cy.get('*:visible').filter((index, element) => {
    return element.tagName.toLowerCase().endsWith('-field');
  });

export const getFieldNavItems = () =>
  cy.get('[data-cy^="field-nav-item"]:visible');

export const getFieldByName = (name: string) =>
  cy.get(`[id=${name}-field]:visible`);

export const getFieldErrorByName = (name: string) =>
  cy.get(`[id="${name}-field-error"]`);

export const getFieldNavItemByName = (name: string) =>
  cy.get(`[data-cy="field-nav-item-${name}"]`);

export const clickShowMore = () => cy.get('[data-cy="show-more"]').click();
