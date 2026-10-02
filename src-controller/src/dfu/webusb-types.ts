export interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

export interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[];
}

export interface USBControlTransferParameters {
  requestType: 'standard' | 'class' | 'vendor';
  recipient: 'device' | 'interface' | 'endpoint' | 'other';
  request: number;
  value: number;
  index: number;
}

export interface USBInTransferResult {
  data?: DataView;
  status: 'ok' | 'stall' | 'babble';
}

export interface USBOutTransferResult {
  bytesWritten: number;
  status: 'ok' | 'stall';
}

export interface USBAlternateInterface {
  alternateSetting: number;
  interfaceClass: number;
  interfaceSubclass: number;
  interfaceProtocol: number;
  interfaceName: string;
}

export interface USBInterface {
  interfaceNumber: number;
  alternate: USBAlternateInterface | null;
  alternates: USBAlternateInterface[];
  claimed: boolean;
}

export interface USBConfiguration {
  configurationValue: number;
  configurationName: string;
  interfaces: USBInterface[];
}

export interface USBDevice extends EventTarget {
  vendorId: number;
  productId: number;
  manufacturerName: string;
  productName: string;
  serialNumber: string;
  configurations: USBConfiguration[];
  configuration: USBConfiguration | null;
  opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
  controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
  controlTransferOut(setup: USBControlTransferParameters, data?: ArrayBuffer | ArrayBufferView): Promise<USBOutTransferResult>;
  reset(): Promise<void>;
}

export interface USB extends EventTarget {
  getDevices(): Promise<USBDevice[]>;
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
}

declare global {
  interface Navigator {
    usb?: USB;
  }
}
