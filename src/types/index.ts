import { ActivityData } from './activity';

export interface CorosCredentials {
  email: string;
  password: string;
}

export enum FileType {
  fit = '4',
  tcx = '3',
  gpx = '1',
  kml = '2',
  csv = '0',
}

export type FileTypeKey = keyof typeof FileType;

export interface CorosCommonResponse {
  message: 'OK' | string;
  result: '0000' | string;
  apiCode: string;
}

// there are more fields on the response
export interface UserResponse {
  userId: string;
  nickname: string;
  email: string;
  headPic: string;
  countryCode: string;
  // YYYYMMDD as a number
  birthday: number;
}

export type LoginResponse = CorosCommonResponse & {
  data: {
    accessToken: string;
  } & UserResponse;
  result: '0000';
};

export type LoginErrorResponse = CorosCommonResponse & {
  tlogId: string;
  result: '1030';
};

// there are more fields on the response
export interface Activity {
  // format 20241130
  date: number;
  device: string;
  distance: number;
  imageUrl: string;
  endTime: number;
  endTimezone: number;
  labelId: string;
  name: string;
  sportType: number;
  total: number;
  startTime: number;
  startTimezone: number;
  totalTime: number;
  trainingLoad: number;
  unitType: number;
  workoutTime: number;
}

export type ActivitiesResponse = {
  data: {
    count: number;
    totalPage?: number;
    pageNumber?: number;
    dataList?: Activity[];
  };
} & CorosCommonResponse;

export type ActivityResponse = {
  data: ActivityData;
} & CorosCommonResponse;

export type ActivityDownloadResponse = {
  data: {
    fileUrl: string;
  };
} & CorosCommonResponse;

interface ActivityUploadData {
  createTime: string;
  // if there is an error on the upload, this property exists
  errorSize?: number;
  fileUrl: string;
  finishSize: number;
  id: string;
  idString: string;
  md5: string;
  originalFilename: string;
  size: number;
  source: number;
  status: number;
  taskImportPredicateSeconds: number;
  taskImportRemainSeconds: number;
  timezone: number;
  unzipPredicateSeconds: number;
  updateTime: string;
  userId: string;
}

export type ActivityUploadResponse = {
  data: ActivityUploadData;
} & CorosCommonResponse;

export type UploadGetListResponse = {
  data: ActivityUploadData[];
} & CorosCommonResponse;

export type UploadRemoveFromListResponse = {
  data: Omit<
    ActivityUploadData,
    'idString' | 'taskImportPredicateSeconds' | 'taskImportRemainSeconds' | 'unzipPredicateSeconds'
  >[];
} & CorosCommonResponse;

export type BucketCredentialsResponse = {
  data: {
    credentials: string;
    v: '2';
  };
} & CorosCommonResponse;

export type BucketDataResponse = {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  Expiration: string;
  TokenExpireTime: number;
  Region: string;
  Bucket: string;
  SessionName: string;
  AccessKeySecret: string;
};

export type STSConfig = {
  env: string;
  bucket: string;
  service: 'aws' | 'aliyun';
};

// EvoLab analyse types

export interface AnalyseTiredRateZone {
  max?: number;
  min: number;
  type: number;
}

export interface AnalyseTrainingLoadRatioZone {
  max?: number;
  min: number;
  type: number;
}

export interface AnalyseDayData {
  ati: number;
  /** Average overnight HRV reading (ms). Only present on days with sleep tracking. */
  avgSleepHrv?: number;
  ct7dMaxFixed: number;
  ct7dMin: number;
  cti: number;
  distance: number;
  distanceTarget: number;
  duration: number;
  durationTarget: number;
  // YYYYMMDD as a number
  happenDay: number;
  /** Lactate threshold heart rate (bpm). Present on days where a fitness test occurred. */
  lthr?: number;
  /** Lactate threshold pace (seconds/km). Present alongside lthr. */
  ltsp?: number;
  performance: number;
  recomendTlMax: number;
  recomendTlMin: number;
  /** Resting heart rate (bpm). */
  rhr?: number;
  /** 30-day rolling HRV baseline (ms). */
  sleepHrvBase?: number;
  /**
   * HRV zone boundary list: [low_threshold, mid_threshold, high_threshold, max_reading]
   * Use sleepHrvBase and avgSleepHrv relative to these to determine HRV status.
   */
  sleepHrvIntervalList?: number[];
  /** Aerobic stamina score (0–100). Higher = more aerobic base built up. */
  staminaLevel?: number;
  /** 7-day stamina score (% of target). */
  staminaLevel7d?: number;
  t28d: number;
  t7d: number;
  testRhr?: number;
  /** Time in bed (hours). Negative values = data anomaly / timezone artefact; treat as 0. */
  tib: number;
  timestamp: number;
  tiredRate: number;
  tiredRateNew: number;
  tiredRateNewZoneList: AnalyseTiredRateZone[];
  tiredRateStateNew: number;
  trainingLoad: number;
  trainingLoadRatio: number;
  trainingLoadRatioState: number;
  trainingLoadRatioZoneList: AnalyseTrainingLoadRatioZone[];
  trainingLoadTarget: number;
  /** VO2max estimate (ml/kg/min) as calculated by COROS. Only present on certain days. */
  vo2max?: number;
}

export interface AnalyseSportStatistic {
  avgHeartRate: number;
  avgPace?: number;
  count: number;
  distance: number;
  duration: number;
  sportType: number;
  trainingLoad: number;
}

export interface AnalyseWeekData {
  firstDayOfWeek: number;
  recomendTlMax: number;
  recomendTlMin: number;
  trainingLoad: number;
}

export interface AnalyseData {
  dayList: AnalyseDayData[];
  record: unknown;
  sportDataSummary: {
    count: number;
    modelValidState: boolean;
    userFirstViewTimestamp: number;
  };
  sportStatistic: AnalyseSportStatistic[];
  summaryInfo: unknown;
  t7dayList: AnalyseDayData[];
  tlIntensity: unknown;
  trainingWeekStageList: unknown[];
  weekList: AnalyseWeekData[];
}

export type AnalyseResponse = {
  data: AnalyseData;
} & CorosCommonResponse;
