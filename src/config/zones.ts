import { ZoneConfig } from '../types.ts';

export const TIMES_SQUARE_SITE = {
  siteName: 'Times Square - Red Steps & Broadway Walkway',
  viewpointId: 'TSQ-CAM-01',
  viewpointName: 'North View - Father Duffy Square (Red TKTS Bleachers)',
  lensSpecs: '4K Ultra-HD Fixed 90° FOV, Elev. 6.2m, Pitch -18°',
  sourceVideoName: 'Screen Recording 2026-11-03 221109.mp4',
};

export const DEFAULT_ZONES_CONFIG: ZoneConfig[] = [
  {
    id: 1,
    code: 'Z1',
    name: 'Lower Stairs',
    description: 'Red glass bleachers bottom seating and aggregation area',
    area_sqm: 45.0,
    capacity: 80,
    warning_threshold: 50,
    critical_threshold: 65,
    polygon: [
      [240, 480],
      [720, 480],
      [860, 680],
      [120, 680],
    ],
  },
  {
    id: 2,
    code: 'Z2',
    name: 'Upper Stairs',
    description: 'Top deck bleachers and elevated observation platform',
    area_sqm: 30.0,
    capacity: 60,
    warning_threshold: 35,
    critical_threshold: 48,
    polygon: [
      [320, 260],
      [640, 260],
      [710, 470],
      [250, 470],
    ],
  },
  {
    id: 3,
    code: 'Z3',
    name: 'Left Walkway',
    description: '7th Avenue pedestrian corridor and storefront buffer',
    area_sqm: 70.0,
    capacity: 100,
    warning_threshold: 65,
    critical_threshold: 80,
    polygon: [
      [40, 280],
      [240, 280],
      [110, 700],
      [0, 700],
    ],
  },
  {
    id: 4,
    code: 'Z4',
    name: 'Right Walkway',
    description: 'Broadway pedestrian plaza transit and ticketing queue lane',
    area_sqm: 60.0,
    capacity: 90,
    warning_threshold: 55,
    critical_threshold: 72,
    polygon: [
      [720, 280],
      [920, 280],
      [960, 700],
      [850, 700],
    ],
  },
];
