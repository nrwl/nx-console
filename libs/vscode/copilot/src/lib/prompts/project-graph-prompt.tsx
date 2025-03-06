import {
  BasePromptElementProps,
  PromptElement,
  UserMessage,
} from '@vscode/prompt-tsx';
import type { ProjectGraph } from 'nx/src/devkit-exports';
import { getProjectGraphPrompt } from '@nx-console/shared-llm-context';

interface NxProjectGraphPromptProps extends BasePromptElementProps {
  projectGraph: ProjectGraph;
}

export class NxProjectGraphPrompt extends PromptElement<NxProjectGraphPromptProps> {
  render() {
    const hasProjectGraph = Object.keys(this.props.projectGraph.nodes).length;
    return (
      <>
        {hasProjectGraph ? (
          <UserMessage priority={60}>
            {getProjectGraphPrompt(this.props.projectGraph)}
          </UserMessage>
        ) : (
          <UserMessage></UserMessage>
        )}
      </>
    );
  }
}
