export interface StorageObject {
  key: string;
  size: number;
  last_modified: string;
}

export interface StorageBrowseResult {
  prefix: string;
  prefixes: string[];
  objects: StorageObject[];
  next_token: string | null;
}
