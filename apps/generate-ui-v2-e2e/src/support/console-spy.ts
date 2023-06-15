export const spyOnConsoleLog = (): Cypress.Chainable<
  Cypress.Agent<sinon.SinonSpy>
> =>
  cy.window().then((win) => {
    return cy.spy(win.console, 'log').as('consoleLog');
  });

export const expectConsoleLogToHaveBeenCalledWith = (
  consoleLog: Cypress.Agent<sinon.SinonSpy>,
  expectedText: string
) =>
  cy.get('@consoleLog').then(() => {
    expect(consoleLog).to.be.called;

    let wasCalledWithExpectedText = false;
    consoleLog.getCalls().forEach((call) => {
      const args = Array.from(call.args);
      wasCalledWithExpectedText =
        wasCalledWithExpectedText ||
        args.some((arg) => {
          const stringifiedArg = JSON.stringify(arg);
          return stringifiedArg.includes(expectedText);
        });
    });

    expect(wasCalledWithExpectedText).to.be.true;
  });
