export interface MicroAppVersion {
  version: string;
  build: number;
  releaseNotes: string;
  iconUrl: string;
  downloadUrl: string;
}

export interface MicroAppRole {
  role: string;
}

export interface MicroAppConfig {
  configKey: string;
  configValue: string[];
}

export interface MicroApp {
  appId: string;
  name: string;
  description: string;
  promoText: string;
  iconUrl: string;
  bannerImageUrl: string;
  isMandatory: number;
  // 1 = active, 0 = inactive (optional for backward compat)
  isActive?: number;
  versions: MicroAppVersion[];
  roles: MicroAppRole[];
  configs?: MicroAppConfig[];
  allowedBridgeMethods?: string[];
}
