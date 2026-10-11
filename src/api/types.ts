/** Subset of the Radio Browser station schema used by the app. */
export interface Station {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  language: string;
  codec: string;
  bitrate: number;
  votes: number;
  clickcount: number;
}

export interface StationQuery {
  name?: string;
  tag?: string;
  countrycode?: string;
  order?: 'clickcount' | 'votes' | 'name';
  limit?: number;
}
