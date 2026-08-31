export type Athlete = {
  id: number;
  firstname: string;
  lastname?: string;
  profile?: string;
  city?: string;
  country?: string;
  timezone?: string;
};

export type Session = {
  athleteId: number;
  athlete: Athlete;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  anonymous?: boolean;
  entry?: Entry;
};

export type Entry = {
  id: string;
  athleteId: number;
  name: string;
  avatar?: string;
  siteLogo?: string;
  link: string;
  proofLink?: string;
  headline: string;
  distanceKm: number;
  clicks: number;
  updatedAt: string;
};
