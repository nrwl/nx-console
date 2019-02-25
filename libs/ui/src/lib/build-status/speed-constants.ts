// Default stats: https://github.com/WPO-Foundation/webpagetest/blob/master/www/settings/connectivity.ini.sample
// Global averages: https://www.speedtest.net/global-index

export interface Speed {
  label: string;
  mbps: number;
  rtt: number;
}

export const SPEEDS: { [key: string]: Speed } = {
  edge: { label: 'Mobile Edge', mbps: 0.24, rtt: 840 },
  '3gs': { label: '3G Slow', mbps: 0.4, rtt: 400 },
  '3gf': { label: '3G Fast', mbps: 1.6, rtt: 150 },
  '4g': { label: '4G', mbps: 9, rtt: 170 },
  lte: { label: 'LTE', mbps: 12, rtt: 70 },
  dup: { label: 'Dial Up', mbps: 0.5, rtt: 120 },
  dsl: { label: 'DSL', mbps: 1.5, rtt: 50 },
  cable: { label: 'Cable', mbps: 5, rtt: 28 }
};
