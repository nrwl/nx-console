export type PDVData = {
  resultType:
    | 'NO_GRAPH_ERROR'
    | 'OLD_NX_VERSION'
    | 'ERROR'
    | 'SUCCESS'
    | 'SUCCESS_MULTI';
  graphBasePath: string | undefined;
  pdvDataSerialized: string | undefined;
  pdvDataSerializedMulti: Record<string, string> | undefined;
  errorsSerialized: string | undefined;
  errorMessage: string | undefined;
};
