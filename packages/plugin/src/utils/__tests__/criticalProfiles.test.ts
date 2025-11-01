import { CriticalProfiles as UtilsProfiles } from 'src/utils/criticalProfiles';
import { CriticalProfiles as RootProfiles } from 'src/criticalProfiles';

describe('CriticalProfiles', () => {
  it('exports expected profile shapes', () => {
    expect(UtilsProfiles.defaultHeuristic).toBeUndefined();
    expect(UtilsProfiles.transientInfra.statuses).toEqual([502, 503, 504]);
    expect(UtilsProfiles.transientInfra.codes).toEqual(
      expect.arrayContaining(['TIMEOUT', 'NETWORK_ERROR'])
    );
    expect(UtilsProfiles.minimal.statuses).toEqual([]);
    expect(UtilsProfiles.minimal.codes).toEqual([]);
  });

  it('root shim re-export matches utils export', () => {
    expect(RootProfiles).toBe(UtilsProfiles);
  });
});
