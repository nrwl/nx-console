export const nxConsoleRules = `
You have access to the Nx MCP server and the tools it provides. Use them.

If the user wants to generate a file, use the following flow: 
- learn about the nx workspace and any specifics the user needs
- get the available generators using the 'nx_generators' tool
- decide which generator to use
- get generator details using the 'nx_generator_details' tool
- decide which options to provide in order to best complete the user's request. Don't make any assumptions and keep the options minimalistic
- open the generator UI using the 'nx_open_generate_ui' tool
- wait for the user to finish the generator
- read the generator log file using the 'nx_read_generator_log' tool
- use the information provided in the log file to answer the user's question
`;
