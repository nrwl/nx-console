import {
  PromptElement,
  BasePromptElementProps,
  PromptPiece,
  UserMessage,
  AssistantMessage,
  PrioritizedList,
} from '@vscode/prompt-tsx';
import {
  ChatContext,
  ChatRequestTurn,
  ChatResponseAnchorPart,
  ChatResponseMarkdownPart,
  ChatResponseTurn,
  Uri,
} from 'vscode';

interface IHistoryProps extends BasePromptElementProps {
  history: ChatContext['history'];
  newer: number; // last 2 message priority values
  older: number; // previous message priority values
  passPriority: true; // require this prop be set!
}

export class History extends PromptElement<IHistoryProps> {
  render(): PromptPiece {
    return (
      <>
        <HistoryMessages
          history={this.props.history.slice(0, -2)}
          priority={this.props.older}
        />
        <HistoryMessages
          history={this.props.history.slice(-2)}
          priority={this.props.newer}
        />
      </>
    );
  }
}

interface IHistoryMessagesProps extends BasePromptElementProps {
  history: ChatContext['history'];
}

export class HistoryMessages extends PromptElement<IHistoryMessagesProps> {
  render(): PromptPiece {
    const history: (UserMessage | AssistantMessage)[] = [];
    for (const turn of this.props.history) {
      if (turn instanceof ChatRequestTurn) {
        history.push(<UserMessage>{turn.prompt}</UserMessage>);
      } else if (turn instanceof ChatResponseTurn) {
        history.push(
          <AssistantMessage name={turn.participant}>
            {chatResponseToString(turn)}
          </AssistantMessage>
        );
      }
    }
    return (
      <PrioritizedList priority={0} descending={false}>
        {history}
      </PrioritizedList>
    );
  }
}

/**
 * Convert the stream of chat response parts into something that can be rendered in the prompt.
 */
function chatResponseToString(response: ChatResponseTurn): string {
  return response.response
    .map((r) => {
      if (r instanceof ChatResponseMarkdownPart) {
        return r.value.value;
      } else if (r instanceof ChatResponseAnchorPart) {
        if (r.value instanceof Uri) {
          return r.value.fsPath;
        } else {
          return r.value.uri.fsPath;
        }
      }

      return '';
    })
    .join('');
}
