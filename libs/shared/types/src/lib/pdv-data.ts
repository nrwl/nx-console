export type PDVData = {
  resultType: 'NO_GRAPH_ERROR' | 'ERROR' | 'SUCCESS';
  graphBasePath: string | undefined;
  pdvDataSerialized: string | undefined;
  errorsSerialized: string | undefined;
  errorMessage: string | undefined;
};
