export type GraphDataResult = {
  resultType: 'NO_GRAPH_ERROR' | 'OLD_NX_VERSION' | 'ERROR' | 'SUCCESS';
  graphBasePath: string | undefined;
  graphDataSerialized: string | undefined; // stringified ProjectGraph
  errorsSerialized: string | undefined; // stringified NxError[] | undefined
  errorMessage: string | undefined;
  isPartial: boolean | undefined;
};
