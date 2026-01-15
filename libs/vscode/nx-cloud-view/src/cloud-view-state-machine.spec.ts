import { ActorRef, AnyEventObject, createActor } from 'xstate';
import { machine } from './cloud-view-state-machine';
import { CIPEInfo, CloudOnboardingInfo } from '@nx-console/shared-types';
let actor: ActorRef<any, AnyEventObject>;
jest.mock('@nx-console/vscode-nx-workspace', () => ({
  getRecentCIPEData: jest.fn(),
}));
jest.mock('@nx-console/vscode-lsp-client', () => ({
  onWorkspaceRefreshed: jest.fn(),
}));
const compareCIPEDataAndSendNotificationMock = jest.fn();
const setViewVisibleMock = jest.fn();
const setErrorContextMock = jest.fn();
const defaultImplementation = {
  actions: {
    compareCIPEDataAndSendNotification: (
      _: any,
      params: {
        oldData: CIPEInfo[];
        newData: CIPEInfo[];
      },
    ) => {
      compareCIPEDataAndSendNotificationMock(params.oldData, params.newData);
    },
    setViewVisible: (
      _: any,
      params: {
        viewId: string;
      },
    ) => {
      setViewVisibleMock(params.viewId);
    },
    setErrorContext: ({ context }: { context: any }) => {
      setErrorContextMock(context.cipeError?.type);
    },
  },
};
const mockSuccessfulCIPE: CIPEInfo = {
  ciPipelineExecutionId: 'cipe_12345678',
  branch: 'main',
  status: 'SUCCEEDED',
  createdAt: Date.now() - 3600000,
  completedAt: Date.now(),
  commitTitle: 'feat: Add new feature XYZ',
  author: 'Jane Doe',
  authorAvatarUrl: 'https://example.com/avatar.jpg',
  cipeUrl: 'https://nx.app/cipe/cipe_12345678',
  commitUrl: 'https://github.com/xyz/abc/pull/1',
  runGroups: [
    {
      ciExecutionEnv: 'tests',
      runGroup: '1234123-tests',
      createdAt: Date.now() - 3600000,
      completedAt: Date.now() - 1800000,
      status: 'SUCCEEDED',
      runs: [
        {
          linkId: 'unit-tests',
          command: 'npm run test',
          status: 'SUCCEEDED',
          numFailedTasks: 0,
          numTasks: 150,
          runUrl: 'https://nx.app/cipe/cipe_12345678/runs/unit-tests',
        },
      ],
    },
  ],
};
describe('Cloud View State Machine', () => {
  afterEach(() => {
    if (actor) {
      actor.stop();
    }
  });
  it('should render loading initially', () => {
    actor = createActor(machine.provide(defaultImplementation));
    actor.start();
    expect(actor.getSnapshot().matches('loading')).toBe(true);
  });
  it('should show onboarding view if there are no recent CIPEs and onboarding isnt complete', () => {
    actor = createActor(machine.provide(defaultImplementation));
    actor.start();
    expect(actor.getSnapshot().matches('loading')).toBe(true);
    actor.send({
      type: 'UPDATE_ONBOARDING',
      value: {
        hasNxInCI: true,
        isConnectedToCloud: false,
        isWorkspaceClaimed: false,
        personalAccessToken: undefined,
      } as CloudOnboardingInfo,
    });
    expect(actor.getSnapshot().matches('onboarding')).toBe(true);
  });
  it('should show recent CIPE view if onboarding is complete', () => {
    actor = createActor(machine.provide(defaultImplementation));
    actor.start();
    expect(actor.getSnapshot().matches('loading')).toBe(true);
    actor.send({
      type: 'UPDATE_ONBOARDING',
      value: {
        hasNxInCI: true,
        isConnectedToCloud: true,
        isWorkspaceClaimed: true,
        personalAccessToken: undefined,
      } as CloudOnboardingInfo,
    });
    expect(actor.getSnapshot().matches('recent-cipe')).toBe(true);
  });
  it('should show recent CIPE view if there are recent CIPEs', () => {
    actor = createActor(machine.provide(defaultImplementation));
    actor.start();
    expect(actor.getSnapshot().matches('loading')).toBe(true);
    actor.send({
      type: 'UPDATE_RECENT_CIPE',
      value: {
        info: [mockSuccessfulCIPE],
      },
    });
    expect(actor.getSnapshot().matches('recent-cipe')).toBe(true);
  });
  it('should set view context for various states', () => {
    actor = createActor(machine.provide(defaultImplementation));
    actor.start();
    expect(actor.getSnapshot().matches('loading')).toBe(true);
    expect(setViewVisibleMock).toHaveBeenCalledWith('loading');
    actor.send({
      type: 'UPDATE_ONBOARDING',
      value: {
        hasNxInCI: true,
        isConnectedToCloud: true,
        isWorkspaceClaimed: false,
        personalAccessToken: undefined,
      } as CloudOnboardingInfo,
    });
    expect(actor.getSnapshot().matches('onboarding')).toBe(true);
    expect(setViewVisibleMock).toHaveBeenCalledWith('onboarding');
    actor.send({
      type: 'UPDATE_RECENT_CIPE',
      value: {
        info: [mockSuccessfulCIPE],
      },
    });
    expect(actor.getSnapshot().matches('recent-cipe')).toBe(true);
    expect(setViewVisibleMock).toHaveBeenCalledWith('recent-cipe');
  });
});
