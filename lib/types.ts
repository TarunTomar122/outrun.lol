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
  demo?: boolean;
  anonymous?: boolean;
  entry?: Entry;
};

export type Entry = {
  id: string;
  athleteId: number;
  name: string;
  avatar?: string;
  link: string;
  proofLink?: string;
  headline: string;
  category: string;
  distanceKm: number;
  clicks: number;
  visitors: number;
  updatedAt: string;
};
